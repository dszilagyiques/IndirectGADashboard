#!/usr/bin/env python3
"""
Indirect G&A Cost Dashboard Builder

Processes Excel data, encrypts it, and builds a single-file HTML dashboard.
Assembles modular source files (CSS, HTML, JS) into the final output.
"""

import base64
import json
import os
import secrets
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pandas as pd
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

# Configuration
INPUT_DIR = "input"
TEMPLATE_DIR = "template"
OUTPUT_FILE = "outputs/Indirect G&A Dashboard.html"
DASHBOARD_PASSWORD = os.environ.get('DASHBOARD_PASSWORD', 'indirectga2026')

# Encryption parameters
PBKDF2_ITERATIONS = 200_000
SALT_LENGTH = 16
IV_LENGTH = 12
KEY_LENGTH = 32

# CSS files in load order
CSS_ORDER = [
    'variables', 'base', 'password', 'layout', 'multiselect',
    'kpi', 'charts',
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
    'config', 'state', 'utils', 'crypto', 'filters', 'kpi', 'insights',
    'charts/monthly-trend', 'charts/department', 'charts/division',
    'charts/category', 'charts/doctype', 'charts/costtype',
    'drillthrough', 'multiselect', 'comparison',
    'modal-base', 'modal-chart', 'modal-kpi', 'modal-import',
    'init'
]


def categorize_cost_type(cost_type: str) -> str:
    """Map cost type code to high-level category."""
    if pd.isna(cost_type) or not cost_type:
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
    """Extract department from job number (last 3 digits)."""
    if pd.isna(job_value):
        return 'Unknown'
    job_str = str(int(job_value)) if isinstance(job_value, float) else str(job_value)
    dept_code = job_str[-3:]
    return DEPARTMENT_MAP.get(dept_code, f'Unknown ({dept_code})')


def get_department_category(job_value) -> str:
    """Get department category from job number."""
    if pd.isna(job_value):
        return 'Unknown'
    job_str = str(int(job_value)) if isinstance(job_value, float) else str(job_value)
    dept_code = job_str[-3:]
    return DEPARTMENT_CATEGORY_MAP.get(dept_code, 'Other')


def excel_to_csv(excel_path: Path) -> tuple[str, int]:
    """
    Read Excel file and convert to CSV string.
    Returns (csv_string, record_count).
    """
    print(f"Reading Excel file: {excel_path.name}")

    # Read the Cost Code Detail Report sheet
    df = pd.read_excel(excel_path, sheet_name='Cost Code Detail Report', engine='openpyxl')

    # Clean column names (remove newlines and extra spaces)
    df.columns = [str(c).replace('\n', ' ').strip() for c in df.columns]

    print(f"  Original columns: {list(df.columns)}")
    print(f"  Original record count: {len(df):,}")

    # Filter out Grand Total row
    if 'Document Type' in df.columns:
        df = df[df['Document Type'] != 'Grand Total']
        print(f"  After removing Grand Total: {len(df):,}")

    # Add derived columns
    df['Category'] = df['Cost Type'].apply(categorize_cost_type)
    df['Is_Allocation'] = df['Cost Type'].astype(str).str.startswith('693', na=False)

    # Add Department columns based on Job number
    df['Department'] = df['Job'].apply(get_department)
    df['Dept_Category'] = df['Job'].apply(get_department_category)

    # Ensure G/L Date is properly formatted
    if 'G/L Date' in df.columns:
        df['G/L Date'] = pd.to_datetime(df['G/L Date'], errors='coerce').dt.strftime('%Y-%m-%d')

    print(f"  Added Department column with {df['Department'].nunique()} unique departments")
    print(f"  Department categories: {df['Dept_Category'].value_counts().to_dict()}")

    # Convert to CSV
    csv_string = df.to_csv(index=False)

    return csv_string, len(df)


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


def assemble_template(template_dir: Path) -> str:
    """
    Assemble HTML from modular source files.

    Combines:
    - CSS files from template/css/
    - HTML partials from template/html/
    - JS files from template/js/

    Returns the complete HTML template string.
    """
    css_dir = template_dir / 'css'
    html_dir = template_dir / 'html'
    js_dir = template_dir / 'js'

    # 1. Read all CSS files in order
    css_parts = []
    for name in CSS_ORDER:
        css_file = css_dir / f'{name}.css'
        if css_file.exists():
            css_parts.append(read_file(css_file))
        else:
            print(f"  WARNING: CSS file not found: {css_file}")
    css_content = '\n'.join(css_parts)

    # 2. Read HTML head partial
    head_html = read_file(html_dir / 'head.html')

    # 3. Read HTML body partials
    body_parts = []
    for name in HTML_ORDER:
        html_file = html_dir / f'{name}.html'
        if html_file.exists():
            body_parts.append(read_file(html_file))
        else:
            print(f"  WARNING: HTML file not found: {html_file}")

    # 4. Read all JS files in order
    js_parts = []
    for name in JS_ORDER:
        js_file = js_dir / f'{name}.js'
        if js_file.exists():
            js_parts.append(read_file(js_file))
        else:
            print(f"  WARNING: JS file not found: {js_file}")
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


def main():
    script_dir = Path(__file__).parent

    print("=" * 60)
    print("Indirect G&A Cost Dashboard Builder")
    print("=" * 60)
    print()

    # Find Excel file
    input_dir = script_dir / INPUT_DIR
    print(f"Looking for Excel files in: {input_dir}")
    excel_path = find_excel_file(input_dir)
    print(f"Found Excel file: {excel_path.name}")

    # Assemble template from modular files
    template_dir = script_dir / TEMPLATE_DIR
    print()
    print("Assembling template from modular source files...")
    print(f"  CSS files: {len(CSS_ORDER)}")
    print(f"  HTML partials: {len(HTML_ORDER) + 1}")  # +1 for head.html
    print(f"  JS modules: {len(JS_ORDER)}")
    html_content = assemble_template(template_dir)
    print(f"  Assembled template: {len(html_content):,} bytes")

    # Convert Excel to CSV
    print()
    print("Converting Excel to CSV...")
    csv_data, record_count = excel_to_csv(excel_path)

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

    print()
    print("=" * 60)
    print("BUILD SUCCESSFUL!")
    print("=" * 60)
    print(f"  Input:   {excel_path.name}")
    print(f"  Records: {record_count:,}")
    print(f"  Output:  {OUTPUT_FILE}")
    print(f"  Size:    {output_size_mb:.2f} MB")
    print(f"  Updated: {timestamp}")

    return 0


if __name__ == "__main__":
    exit(main())
