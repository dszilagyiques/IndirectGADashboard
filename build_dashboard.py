#!/usr/bin/env python3
"""
Indirect G&A Cost Dashboard Builder

Processes Excel data, encrypts it, and builds a single-file HTML dashboard.
Assembles modular source files (CSS, HTML, JS) into the final output.

OPTIMIZED VERSION:
- Uses Polars + calamine (Rust) for 6-10x faster Excel reading
- Caches processed data to skip unchanged Excel files
- Parallel file I/O for template assembly
"""

import argparse
import base64
import hashlib
import json
import os
import pickle
import secrets
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import polars as pl
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

# Configuration
INPUT_DIR = "input"
TEMPLATE_DIR = "template"
OUTPUT_FILE = "outputs/Indirect G&A Dashboard.html"
CACHE_DIR = ".build_cache"
DASHBOARD_PASSWORD = os.environ.get('DASHBOARD_PASSWORD', 'indirectga2026')

# Encryption parameters
PBKDF2_ITERATIONS = 200_000
SALT_LENGTH = 16
IV_LENGTH = 12
KEY_LENGTH = 32

# CSS files in load order
CSS_ORDER = [
    'variables', 'base', 'password', 'layout', 'multiselect',
    'kpi', 'charts', 'explorer',
    'modal', 'modal-chart', 'modal-kpi', 'modal-import',
    'drillthrough', 'comparison', 'responsive'
]

# HTML partials in body order
HTML_ORDER = [
    'password', 'header', 'filters', 'kpi', 'charts',
    'drillthrough',
    'modal-chart', 'modal-kpi', 'modal-import'
]

# JS files in load order
JS_ORDER = [
    'config', 'state', 'utils', 'crypto', 'filters', 'kpi',
    'charts/monthly-trend', 'charts/explorer',
    'drillthrough', 'multiselect', 'comparison',
    'modal-base', 'modal-chart', 'modal-kpi', 'modal-import',
    'init'
]


def categorize_cost_type(cost_type: str) -> str:
    """Map cost type code to high-level category."""
    if cost_type is None or not cost_type:
        return 'Other'

    # Extract numeric code from "611000 - Regular Time" format
    code = str(cost_type).split(' - ')[0].strip()

    if code.startswith('61'):
        return 'Labor Costs'
    elif code.startswith('62'):
        return 'Travel & Per Diem'
    elif code.startswith('64'):
        return 'Fleet & Materials'
    elif code.startswith('65'):
        return 'Facilities & Services'
    elif code.startswith('67'):
        return 'Equipment Costs'
    elif code.startswith('693'):
        return 'Allocation Credits'
    elif code.startswith('69'):
        return 'Other Allocations'
    elif code.startswith('71') or code.startswith('72'):
        return 'Corporate Overhead'
    elif code.startswith('73') or code.startswith('74') or code.startswith('75'):
        return 'G&A & Other'
    else:
        return 'Other'


# Department mapping based on last 3 digits of Job number
DEPARTMENT_MAP = {
    '110': 'Exec',
    '130': 'Bus Dev',
    '140': 'Admin',
    '150': 'Acct',
    '165': 'Treasury',
    '170': 'HR Payroll',
    '180': 'IT',
    '190': 'Risk Mgmt',
    '210': 'Intl Ops',
    '230': 'Safety Mgmt',
    '250': 'Estimating',
    '260': 'Proposals',
    '520': 'Ops Proj Mgmt',
    '530': 'Ops Proj Cont',
    '540': 'Ops Proc Subs',
    '550': 'Ops Eng',
    '560': 'NonBillable',
    '590': 'Field Ops',
    '710': 'Eqp Gen',
    '711': 'Fuel',
    '720': 'Eqp Mech',
    '730': 'Eqp Haul',
    '740': 'Aviation Fixed Wing',
    '750': 'Aviation Rotary Wing',
    '760': 'Small Tools',
    '770': 'Warehouse',
    '810': 'Safety Gen',
    '820': 'Safety Train',
    '850': 'Comm IT Cell',
    '860': 'Facilities',
}

# Department category groupings
DEPARTMENT_CATEGORY_MAP = {
    '110': 'G&A', '130': 'G&A', '140': 'G&A', '150': 'G&A', '165': 'G&A',
    '170': 'G&A', '180': 'G&A', '190': 'G&A', '210': 'G&A', '230': 'G&A',
    '250': 'G&A', '260': 'G&A',
    '520': 'Ops Support', '530': 'Ops Support', '540': 'Ops Support',
    '550': 'Ops Support', '560': 'Ops Support',
    '710': 'Equipment', '711': 'Equipment', '720': 'Equipment',
    '730': 'Equipment', '740': 'Equipment', '750': 'Equipment',
    '810': 'Safety', '820': 'Safety',
    '760': 'Tools',
    '590': 'Other', '770': 'Other', '850': 'Other', '860': 'Other',
}


def get_department(job_value) -> str:
    """Extract department from job number (last 3 digits). Returns 'code - description' format."""
    if job_value is None:
        return 'Unknown'
    job_str = str(int(job_value)) if isinstance(job_value, float) else str(job_value)
    dept_code = job_str[-3:]
    dept_name = DEPARTMENT_MAP.get(dept_code)
    if dept_name:
        return f'{dept_code} - {dept_name}'
    return f'Unknown ({dept_code})'


def get_department_category(job_value) -> str:
    """Get department category from job number."""
    if job_value is None:
        return 'Unknown'
    job_str = str(int(job_value)) if isinstance(job_value, float) else str(job_value)
    dept_code = job_str[-3:]
    return DEPARTMENT_CATEGORY_MAP.get(dept_code, 'Other')


def file_hash(path: Path) -> str:
    """Compute MD5 hash of a file for cache validation."""
    return hashlib.md5(path.read_bytes()).hexdigest()


def get_cached_csv(excel_path: Path, cache_dir: Path) -> tuple[str, int] | None:
    """Try to load cached CSV if Excel file hasn't changed."""
    cache_file = cache_dir / "csv_cache.pkl"
    hash_file = cache_dir / "excel_hash.txt"

    if not cache_file.exists() or not hash_file.exists():
        return None

    # Check if Excel file hash matches
    current_hash = file_hash(excel_path)
    cached_hash = hash_file.read_text().strip()

    if current_hash != cached_hash:
        return None

    # Load cached data
    try:
        with open(cache_file, 'rb') as f:
            cached = pickle.load(f)
        print(f"  Using cached CSV (Excel unchanged)")
        return cached['csv_data'], cached['record_count']
    except Exception:
        return None


def save_csv_cache(csv_data: str, record_count: int, excel_path: Path, cache_dir: Path):
    """Save processed CSV to cache."""
    cache_dir.mkdir(exist_ok=True)

    cache_file = cache_dir / "csv_cache.pkl"
    hash_file = cache_dir / "excel_hash.txt"

    with open(cache_file, 'wb') as f:
        pickle.dump({'csv_data': csv_data, 'record_count': record_count}, f)

    hash_file.write_text(file_hash(excel_path))


def excel_to_csv(excel_path: Path, cache_dir: Path = None, use_cache: bool = True) -> tuple[str, int]:
    """
    Read Excel file and convert to CSV string using Polars (optimized).
    Returns (csv_string, record_count).

    Uses calamine engine (Rust-based) for 5-10x faster Excel reading.
    Caches results to skip processing if Excel file unchanged.
    """
    # Try cache first
    if use_cache and cache_dir:
        cached = get_cached_csv(excel_path, cache_dir)
        if cached:
            return cached

    print(f"Reading Excel file: {excel_path.name}")

    # Read with Polars + calamine (Rust engine) - 5-10x faster than openpyxl
    df = pl.read_excel(excel_path, sheet_name='Cost Code Detail Report', engine='calamine')

    # Clean column names (remove newlines, extra spaces, normalize whitespace)
    df = df.rename({col: ' '.join(col.split()) for col in df.columns})

    print(f"  Original columns: {df.columns}")
    print(f"  Original record count: {len(df):,}")

    # Filter out Grand Total row
    if 'Document Type' in df.columns:
        df = df.filter(pl.col('Document Type') != 'Grand Total')
        print(f"  After removing Grand Total: {len(df):,}")

    # Add derived columns using vectorized Polars expressions (much faster than apply)
    cost_type_code = pl.col('Cost Type').cast(pl.Utf8).str.split(' - ').list.first().str.strip_chars()

    # Vectorized category assignment
    category_expr = (
        pl.when(cost_type_code.str.starts_with('61')).then(pl.lit('Labor Costs'))
          .when(cost_type_code.str.starts_with('62')).then(pl.lit('Travel & Per Diem'))
          .when(cost_type_code.str.starts_with('64')).then(pl.lit('Fleet & Materials'))
          .when(cost_type_code.str.starts_with('65')).then(pl.lit('Facilities & Services'))
          .when(cost_type_code.str.starts_with('67')).then(pl.lit('Equipment Costs'))
          .when(cost_type_code.str.starts_with('693')).then(pl.lit('Allocation Credits'))
          .when(cost_type_code.str.starts_with('69')).then(pl.lit('Other Allocations'))
          .when(cost_type_code.str.starts_with('71') | cost_type_code.str.starts_with('72')).then(pl.lit('Corporate Overhead'))
          .when(cost_type_code.str.starts_with('73') | cost_type_code.str.starts_with('74') | cost_type_code.str.starts_with('75')).then(pl.lit('G&A & Other'))
          .otherwise(pl.lit('Other'))
          .alias('Category')
    )

    # Vectorized Is_Allocation
    is_allocation_expr = cost_type_code.str.starts_with('693').alias('Is_Allocation')

    # Vectorized Department extraction (last 3 digits of Job)
    job_str = pl.col('Job').cast(pl.Utf8).str.replace_all(r'\.0$', '')
    dept_code = job_str.str.slice(-3)

    # Build department mapping expression
    dept_expr = dept_code
    for code, name in DEPARTMENT_MAP.items():
        dept_expr = pl.when(dept_code == code).then(pl.lit(f'{code} - {name}')).otherwise(dept_expr)
    dept_expr = pl.when(pl.col('Job').is_null()).then(pl.lit('Unknown')).otherwise(
        pl.when(dept_expr == dept_code).then(pl.concat_str([pl.lit('Unknown ('), dept_code, pl.lit(')')])).otherwise(dept_expr)
    ).alias('Department')

    # Build dept_category mapping expression
    dept_cat_expr = pl.lit('Other')
    for code, cat in DEPARTMENT_CATEGORY_MAP.items():
        dept_cat_expr = pl.when(dept_code == code).then(pl.lit(cat)).otherwise(dept_cat_expr)
    dept_cat_expr = pl.when(pl.col('Job').is_null()).then(pl.lit('Unknown')).otherwise(dept_cat_expr).alias('Dept_Category')

    df = df.with_columns([category_expr, is_allocation_expr, dept_expr, dept_cat_expr])

    # Format G/L Date
    if 'G/L Date' in df.columns:
        df = df.with_columns(
            pl.col('G/L Date').cast(pl.Date).dt.strftime('%Y-%m-%d').alias('G/L Date')
        )

    print(f"  Added Department column with {df['Department'].n_unique()} unique departments")
    dept_cat_counts = df['Dept_Category'].value_counts()
    print(f"  Department categories: {dict(zip(dept_cat_counts['Dept_Category'].to_list(), dept_cat_counts['count'].to_list()))}")

    # Convert to CSV
    csv_string = df.write_csv()
    record_count = len(df)

    # Save to cache
    if cache_dir:
        save_csv_cache(csv_string, record_count, excel_path, cache_dir)
        print(f"  Cached CSV for future builds")

    return csv_string, record_count


def encrypt_csv_data(csv_data: str, password: str) -> dict:
    """
    Encrypt CSV data using AES-256-GCM with PBKDF2 key derivation.
    Returns encrypted payload as dictionary.
    """
    # Generate random salt and IV
    salt = secrets.token_bytes(SALT_LENGTH)
    iv = secrets.token_bytes(IV_LENGTH)

    # Derive key using PBKDF2
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=KEY_LENGTH,
        salt=salt,
        iterations=PBKDF2_ITERATIONS,
    )
    key = kdf.derive(password.encode('utf-8'))

    # Encrypt data using AES-GCM
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(iv, csv_data.encode('utf-8'), None)

    # Build payload
    payload = {
        'v': 1,
        'alg': 'AES-256-GCM',
        'kdf': 'PBKDF2-SHA256',
        'iter': PBKDF2_ITERATIONS,
        'salt': base64.b64encode(salt).decode('ascii'),
        'iv': base64.b64encode(iv).decode('ascii'),
        'ct': base64.b64encode(ciphertext).decode('ascii'),
    }

    return payload


def read_file(path: Path) -> str:
    """Read a file and return its contents."""
    return path.read_text(encoding='utf-8')


def read_file_safe(path: Path) -> tuple[Path, str | None]:
    """Read a file, return (path, content) or (path, None) if not found."""
    if path.exists():
        return path, path.read_text(encoding='utf-8')
    return path, None


def assemble_template(template_dir: Path) -> str:
    """
    Assemble HTML from modular source files using parallel I/O.

    Combines:
    - CSS files from template/css/
    - HTML partials from template/html/
    - JS files from template/js/

    Returns the complete HTML template string.
    """
    css_dir = template_dir / 'css'
    html_dir = template_dir / 'html'
    js_dir = template_dir / 'js'

    # Build list of all files to read
    all_files = []
    css_files = [(name, css_dir / f'{name}.css') for name in CSS_ORDER]
    html_files = [('head', html_dir / 'head.html')] + [(name, html_dir / f'{name}.html') for name in HTML_ORDER]
    js_files = [(name, js_dir / f'{name}.js') for name in JS_ORDER]

    all_paths = [f[1] for f in css_files + html_files + js_files]

    # Read all files in parallel
    with ThreadPoolExecutor(max_workers=16) as executor:
        results = dict(executor.map(read_file_safe, all_paths))

    # 1. Assemble CSS
    css_parts = []
    for name, path in css_files:
        content = results.get(path)
        if content:
            css_parts.append(content)
        else:
            print(f"  WARNING: CSS file not found: {path}")
    css_content = '\n'.join(css_parts)

    # 2. Read HTML head partial
    head_html = results.get(html_dir / 'head.html', '')

    # 3. Read HTML body partials
    body_parts = []
    for name in HTML_ORDER:
        path = html_dir / f'{name}.html'
        content = results.get(path)
        if content:
            body_parts.append(content)
        else:
            print(f"  WARNING: HTML file not found: {path}")

    # 4. Assemble JS
    js_parts = []
    for name, path in js_files:
        content = results.get(path)
        if content:
            js_parts.append(content)
        else:
            print(f"  WARNING: JS file not found: {path}")
    js_content = '\n\n'.join(js_parts)

    # 5. Assemble the password section and dashboard sections
    password_html = body_parts[0] if body_parts else ''
    header_html = body_parts[1] if len(body_parts) > 1 else ''
    filters_html = body_parts[2] if len(body_parts) > 2 else ''
    kpi_html = body_parts[3] if len(body_parts) > 3 else ''
    charts_html = body_parts[4] if len(body_parts) > 4 else ''
    drillthrough_html = body_parts[5] if len(body_parts) > 5 else ''

    # Collect all modal HTML (indices 6+)
    modals_html = '\n\n    '.join(body_parts[6:]) if len(body_parts) > 6 else ''

    # 6. Assemble final HTML
    html_template = f'''<!DOCTYPE html>
<html lang="en">
{head_html}
    <style>
{css_content}
    </style>
</head>
<body>
    {password_html}

    <!-- Main Dashboard -->
    <div class="dashboard" id="dashboard">
        <!-- Sticky Header + Filters -->
        <div class="sticky-header">
            {header_html}

            {filters_html}
        </div>

        <main class="main">
            {kpi_html}

            {charts_html}
        </main>
    </div>

    {drillthrough_html}

    {modals_html}

    <script>
        // === ENCRYPTED PAYLOAD ===
        <!-- EMBEDDED_ENCRYPTED_PAYLOAD_JSON -->

{js_content}
    </script>
</body>
</html>'''

    return html_template


def inline_libraries(html_content: str, lib_dir: Path) -> str:
    """Replace CDN script tags with inlined library content."""

    # Chart.js
    chart_path = lib_dir / 'chart.min.js'
    if chart_path.exists():
        chart_content = chart_path.read_text(encoding='utf-8')
        html_content = html_content.replace(
            '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>',
            f'<script>{chart_content}</script>'
        )
        print(f"  Chart.js: {len(chart_content):,} bytes inlined")
    else:
        print("  WARNING: chart.min.js not found")

    # PapaParse
    papa_path = lib_dir / 'papaparse.min.js'
    if papa_path.exists():
        papa_content = papa_path.read_text(encoding='utf-8')
        html_content = html_content.replace(
            '<script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>',
            f'<script>{papa_content}</script>'
        )
        print(f"  PapaParse: {len(papa_content):,} bytes inlined")
    else:
        print("  WARNING: papaparse.min.js not found")

    # SheetJS XLSX
    xlsx_path = lib_dir / 'xlsx.full.min.js'
    if xlsx_path.exists():
        xlsx_content = xlsx_path.read_text(encoding='utf-8')
        html_content = html_content.replace(
            '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>',
            f'<script>{xlsx_content}</script>'
        )
        print(f"  SheetJS XLSX: {len(xlsx_content):,} bytes inlined")
    else:
        print("  WARNING: xlsx.full.min.js not found")

    return html_content


def embed_encrypted_payload(html_content: str, payload: dict, timestamp: str) -> str:
    """Embed encrypted payload and timestamp into HTML template."""

    # Embed payload
    payload_json = json.dumps(payload)
    html_content = html_content.replace(
        '<!-- EMBEDDED_ENCRYPTED_PAYLOAD_JSON -->',
        f'const encryptedPayload = {payload_json};'
    )

    # Embed timestamp
    html_content = html_content.replace(
        "'<!-- DATA_TIMESTAMP -->'",
        f"'{timestamp}'"
    )

    return html_content


def find_excel_file(input_dir: Path) -> Path:
    """Find the first Excel file in the input directory."""
    xlsx_files = list(input_dir.glob('*.xlsx'))
    if not xlsx_files:
        raise FileNotFoundError(f"No Excel files found in {input_dir}")
    return xlsx_files[0]


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Build Indirect G&A Dashboard')
    parser.add_argument('--no-cache', action='store_true',
                        help='Disable caching (force re-process Excel)')
    parser.add_argument('--clear-cache', action='store_true',
                        help='Clear cache before building')
    return parser.parse_args()


def main():
    import time
    start_time = time.time()

    args = parse_args()
    script_dir = Path(__file__).parent
    cache_dir = script_dir / CACHE_DIR

    print("=" * 60)
    print("Indirect G&A Cost Dashboard Builder (OPTIMIZED)")
    print("=" * 60)
    print()

    # Clear cache if requested
    if args.clear_cache and cache_dir.exists():
        import shutil
        shutil.rmtree(cache_dir)
        print("Cache cleared.")

    # Find Excel file
    input_dir = script_dir / INPUT_DIR
    print(f"Looking for Excel files in: {input_dir}")
    excel_path = find_excel_file(input_dir)
    print(f"Found Excel file: {excel_path.name}")

    # Assemble template from modular files (parallel I/O)
    template_dir = script_dir / TEMPLATE_DIR
    print()
    print("Assembling template from modular source files...")
    print(f"  CSS files: {len(CSS_ORDER)}")
    print(f"  HTML partials: {len(HTML_ORDER) + 1}")  # +1 for head.html
    print(f"  JS modules: {len(JS_ORDER)}")
    html_content = assemble_template(template_dir)
    print(f"  Assembled template: {len(html_content):,} bytes")

    # Convert Excel to CSV (with caching)
    print()
    print("Converting Excel to CSV...")
    use_cache = not args.no_cache
    csv_data, record_count = excel_to_csv(excel_path, cache_dir, use_cache=use_cache)

    # Generate timestamp
    pacific_tz = ZoneInfo("America/Los_Angeles")
    timestamp = datetime.now(pacific_tz).strftime("%m/%d/%Y %I:%M %p PT")
    print(f"Timestamp (Pacific): {timestamp}")

    # Inline JavaScript libraries
    print()
    print("Inlining JavaScript libraries for SharePoint compatibility...")
    lib_dir = script_dir / 'lib'
    html_content = inline_libraries(html_content, lib_dir)

    # Encrypt data
    print()
    print("Encrypting embedded data...")
    payload = encrypt_csv_data(csv_data, DASHBOARD_PASSWORD)

    # Embed into HTML
    print("Embedding encrypted payload into HTML...")
    html_content = embed_encrypted_payload(html_content, payload, timestamp)

    # Write output
    output_path = script_dir / OUTPUT_FILE
    output_path.parent.mkdir(exist_ok=True)
    output_path.write_text(html_content, encoding='utf-8')

    # Summary
    output_size_mb = output_path.stat().st_size / 1024 / 1024
    elapsed = time.time() - start_time

    print()
    print("=" * 60)
    print("BUILD SUCCESSFUL!")
    print("=" * 60)
    print(f"  Input:   {excel_path.name}")
    print(f"  Records: {record_count:,}")
    print(f"  Output:  {OUTPUT_FILE}")
    print(f"  Size:    {output_size_mb:.2f} MB")
    print(f"  Updated: {timestamp}")
    print(f"  Time:    {elapsed:.2f}s")

    return 0


if __name__ == "__main__":
    exit(main())
