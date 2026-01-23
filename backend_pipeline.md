# Quanta West Dashboard – Backend Pipeline Bible

> A comprehensive guide to the build system, data pipeline, encryption, deployment, and operational workflows for the Quanta West Bid Analytics Dashboard.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Directory Structure](#directory-structure)
3. [Data Pipeline](#data-pipeline)
4. [Build Process](#build-process)
5. [Encryption System](#encryption-system)
6. [Library Bundling](#library-bundling)
7. [Deployment Pipeline](#deployment-pipeline)
8. [Logging System](#logging-system)
9. [Git Workflow](#git-workflow)
10. [Environment & Dependencies](#environment--dependencies)
11. [Security Considerations](#security-considerations)
12. [Troubleshooting](#troubleshooting)
13. [Quick Reference](#quick-reference)

---

## Architecture Overview

### System Design Philosophy

The Quanta West Dashboard is a **single-file web application** optimized for:
- **SharePoint iframe embedding** (no external dependencies)
- **GitHub Pages hosting** (static file serving)
- **Offline capability** (all assets inlined)
- **Data security** (client-side decryption)

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BUILD & DEPLOY PIPELINE                          │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌────────────┐      ┌────────────┐      ┌────────────────┐
    │   Excel    │  →   │  CSV Data  │  →   │  Encrypted     │
    │   Input    │      │  (pandas)  │      │  Payload (AES) │
    └────────────┘      └────────────┘      └────────────────┘
         │                                         │
         ▼                                         ▼
    input/*.xlsx                         ┌────────────────────┐
                                         │   HTML Template    │
    ┌────────────┐                       │  + Inlined JS Libs │
    │  JS Libs   │  ─────────────────→   │  + Encrypted Data  │
    │  (CDN)     │                       └────────────────────┘
    └────────────┘                               │
         │                                       ▼
         ▼                              ┌────────────────────┐
    lib/*.min.js                        │   Final Output     │
                                        │   (index.html)     │
                                        └────────────────────┘
                                                 │
                                                 ▼
                                        ┌────────────────────┐
                                        │   GitHub Pages     │
                                        │   (Live Site)      │
                                        └────────────────────┘
```

### Runtime Data Flow (Browser)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLIENT-SIDE DECRYPTION                              │
└─────────────────────────────────────────────────────────────────────────────┘

    User Opens Dashboard
           │
           ▼
    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │   Password   │ →   │  PBKDF2 Key  │ →   │  AES-256-GCM │
    │   Prompt     │     │  Derivation  │     │  Decryption  │
    └──────────────┘     └──────────────┘     └──────────────┘
                                                     │
                                                     ▼
                                             ┌──────────────┐
                                             │   CSV Data   │
                                             │   in Memory  │
                                             └──────────────┘
                                                     │
                                                     ▼
                                             ┌──────────────┐
                                             │  Dashboard   │
                                             │   Renders    │
                                             └──────────────┘
```

---

## Directory Structure

```
PWLCDashboard/
├── 📁 input/                          # Source data (Excel files)
│   └── *.xlsx                         # Bid opportunity data
│
├── 📁 template/                       # HTML template source
│   └── pwlc_dashboard_v2.html         # Master template with placeholders
│
├── 📁 lib/                            # JavaScript libraries (cached)
│   ├── chart.min.js                   # Chart.js v4.4.1 (~205 KB)
│   ├── papaparse.min.js               # PapaParse v5.4.1 (~19 KB)
│   └── xlsx.full.min.js               # SheetJS XLSX (~500 KB, optional)
│
├── 📁 outputs/                        # Build outputs
│   └── Quanta West Estimating Dashboard.html
│
├── 📁 logs/                           # Deployment logs
│   └── deploy_YYYYMMDD_HHMMSS.log
│
├── 📁 venv/                           # Python virtual environment
│
├── 📄 build_dashboard.py              # Main build script
├── 📄 bundle_libs.py                  # Library downloader
├── 📄 main.py                         # Full deploy pipeline (Python)
├── 📄 deploy.ps1                      # Deploy pipeline (PowerShell)
├── 📄 test_payload.py                 # Encryption payload tester
├── 📄 requirements.txt                # Python dependencies
├── 📄 index.html                      # Live dashboard (git-tracked)
├── 📄 design_rules.md                 # UI/UX documentation
└── 📄 backend_pipeline.md             # This document
```

### Key Files Explained

| File | Purpose | Git Tracked |
|------|---------|-------------|
| `input/*.xlsx` | Source Excel data | ✓ (synced) |
| `template/pwlc_dashboard_v2.html` | HTML template with placeholders | ✓ |
| `lib/*.min.js` | Inlined JavaScript libraries | ✓ |
| `outputs/*.html` | Build output (local only) | ✗ |
| `index.html` | Live dashboard copy | ✓ |
| `logs/*.log` | Deployment logs | ✗ |

---

## Data Pipeline

### Input Data Format

**Expected Excel Structure:**
- File location: `input/*.xlsx` (first `.xlsx` file found)
- Parser: pandas with openpyxl engine
- Output: CSV string for embedding

**Required Columns (Dashboard Expects):**
```
Opportunity Name    - Project identifier
Account Name        - Client/customer name
Stage               - Won/Lost/Submitted/Negotiating/etc.
Amount             - Bid value (currency)
Close Date         - Expected close date
Created Date       - Opportunity creation date
Estimator          - Assigned estimator name
Coordinator        - Project coordinator
Description        - Project description
Salesforce Link    - CRM link (optional)
SharePoint Link    - Document link (optional)
```

### CSV Conversion

```python
# From build_dashboard.py
def excel_to_csv(excel_path):
    df = pd.read_excel(excel_path, engine='openpyxl')
    csv_string = df.to_csv(index=False)
    return csv_string, len(df)
```

**Output Format:**
- Standard CSV with header row
- No index column
- UTF-8 encoding
- Embedded directly into HTML as a template literal

### Timestamp Generation

```python
# Pacific Time timestamp for data freshness display
pacific_tz = ZoneInfo("America/Los_Angeles")
pacific_now = datetime.now(pacific_tz)
timestamp = pacific_now.strftime("%m/%d/%Y %I:%M %p PT")
```

---

## Build Process

### Build Script: `build_dashboard.py`

**Execution:**
```bash
python build_dashboard.py
```

**Process Steps:**

1. **Find Excel File**
   ```python
   excel_patterns = ['*.xlsx', '*.xls']
   # Searches input/ directory
   ```

2. **Convert to CSV**
   - Read Excel with pandas
   - Convert to CSV string
   - Count records

3. **Read Template**
   - Load `template/pwlc_dashboard_v2.html`
   - UTF-8 encoding

4. **Inline Libraries**
   - Replace CDN `<script>` tags with inline content
   - Sources from `lib/` folder

5. **Encrypt Data**
   - Generate AES-256-GCM encrypted payload
   - Embed as JSON in HTML

6. **Write Output**
   - Save to `outputs/Quanta West Estimating Dashboard.html`
   - Report file size

### Template Placeholders

The HTML template uses these placeholders:

| Placeholder | Replacement |
|-------------|-------------|
| `` `<!-- EMBEDDED_CSV_DATA -->` `` | Encrypted payload (or raw CSV in legacy mode) |
| `<!-- EMBEDDED_ENCRYPTED_PAYLOAD_JSON -->` | JSON encryption payload |
| `'<!-- DATA_TIMESTAMP -->'` | Pacific time string |

### Build Output Example

```
============================================================
Quanta West: Bid Analytics Dashboard Builder
============================================================

Looking for Excel files in: .../input
Found Excel file: Underground and Par West Opportunities.xlsx
Using template: .../template/pwlc_dashboard_v2.html

Converting Excel to CSV...
Loaded 4,279 records
Timestamp (Pacific): 12/26/2025 02:59 PM PT

Reading HTML template...

Inlining JavaScript libraries for SharePoint compatibility...
  Chart.js: 205,399 bytes inlined
  PapaParse: 19,469 bytes inlined
  xlsx: 500,000 bytes inlined

Encrypting embedded data...
Embedding encrypted payload into HTML...
Writing output to: .../outputs/Quanta West Estimating Dashboard.html

============================================================
BUILD SUCCESSFUL!
============================================================
  Input:   Underground and Par West Opportunities.xlsx
  Records: 4,279
  Output:  Quanta West Estimating Dashboard.html
  Size:    2.71 MB
  Updated: 12/26/2025 02:59 PM PT
```

---

## Encryption System

### Algorithm Specification

| Parameter | Value |
|-----------|-------|
| **Encryption** | AES-256-GCM |
| **Key Derivation** | PBKDF2-HMAC-SHA256 |
| **Iterations** | 200,000 |
| **Salt** | 16 bytes (random) |
| **IV/Nonce** | 12 bytes (random) |
| **Key Length** | 32 bytes (256 bits) |

### Encrypted Payload Structure

```json
{
  "v": 1,
  "alg": "AES-256-GCM",
  "kdf": "PBKDF2-SHA256",
  "iter": 200000,
  "salt": "<base64-encoded-salt>",
  "iv": "<base64-encoded-iv>",
  "ct": "<base64-encoded-ciphertext>"
}
```

### Python Encryption (Build-Time)

```python
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def encrypt_csv_data(csv_data: str, password: str):
    # Key derivation
    iterations = 200_000
    salt = secrets.token_bytes(16)
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=iterations
    )
    key = kdf.derive(password.encode("utf-8"))
    
    # AES-GCM encryption
    iv = secrets.token_bytes(12)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(iv, csv_data.encode("utf-8"), None)
    
    return (
        base64.b64encode(ciphertext).decode("ascii"),
        base64.b64encode(salt).decode("ascii"),
        base64.b64encode(iv).decode("ascii"),
        iterations
    )
```

### JavaScript Decryption (Runtime)

```javascript
async function decryptData(password, payload) {
    const salt = base64ToArrayBuffer(payload.salt);
    const iv = base64ToArrayBuffer(payload.iv);
    const ciphertext = base64ToArrayBuffer(payload.ct);
    
    // Derive key using Web Crypto API
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );
    
    const key = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: payload.iter,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
    );
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
}
```

### Password Storage

⚠️ **SECURITY WARNING**: The password is currently hardcoded in `build_dashboard.py`:

```python
# Line 306 in build_dashboard.py
DASHBOARD_PASSWORD = "quantawestllc2026"
```

**Recommendations:**
1. Move to environment variable: `os.environ.get('DASHBOARD_PASSWORD')`
2. Use a secrets manager for production
3. Never commit passwords to public repositories

---

## Library Bundling

### Purpose

SharePoint iframes block external CDN resources. Libraries must be inlined for compatibility.

### Bundle Script: `bundle_libs.py`

```python
LIBS = {
    'chart.min.js': 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
    'papaparse.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js',
    'xlsx.full.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
}
```

**Execution:**
```bash
python bundle_libs.py
```

**Output:**
```
Downloading chart.min.js...
  Saved: lib/chart.min.js (200.6 KB)
Downloading papaparse.min.js...
  Saved: lib/papaparse.min.js (19.0 KB)
Downloading xlsx.full.min.js...
  Saved: lib/xlsx.full.min.js (489.3 KB)

All libraries downloaded successfully!
```

### Library Versions

| Library | Version | Size | Purpose |
|---------|---------|------|---------|
| Chart.js | 4.4.1 | ~205 KB | Data visualization |
| PapaParse | 5.4.1 | ~19 KB | CSV parsing |
| SheetJS XLSX | 0.18.5 | ~500 KB | Excel export (optional) |

### Inlining Process

```python
# From build_dashboard.py
def inline_libraries(html_content, script_dir):
    # Replace CDN script tags with inline content
    html_content = html_content.replace(
        '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>',
        f'<script>{chart_content}</script>'
    )
    # ... similar for other libraries
```

---

## Deployment Pipeline

### Two Deployment Options

#### Option 1: Python Script (`main.py`)

**Features:**
- Full automation
- Logging to file
- Excel file preservation
- Force sync with remote

```bash
python main.py
python main.py --message "Custom commit message"
```

#### Option 2: PowerShell Script (`deploy.ps1`)

**Features:**
- Windows-native
- gh-pages branch deployment (legacy)
- Simpler flow

```powershell
.\deploy.ps1
.\deploy.ps1 -Message "Custom commit message"
```

### Main.py Pipeline Steps

```
[1/4] Forcefully syncing with remote...
      ├── Backup local xlsx files
      ├── git checkout main
      ├── git fetch origin main
      ├── git reset --hard origin/main
      ├── git clean -fd
      └── Restore xlsx files from backup

[2/4] Checking JavaScript libraries...
      ├── Check lib/chart.min.js exists
      ├── Check lib/papaparse.min.js exists
      └── Run bundle_libs.py if missing

[3/4] Building dashboard...
      ├── Run build_dashboard.py
      └── Copy output to index.html

[4/4] Committing and pushing to GitHub...
      ├── git add index.html
      ├── git add input/*.xlsx
      ├── git commit -m "Update dashboard (timestamp)"
      └── git push origin main
```

### Excel File Preservation

The pipeline preserves local Excel files during force sync:

```python
# Backup before sync
temp_backup_dir = script_dir / ".xlsx_backup_temp"
for xlsx_file in local_xlsx_files:
    shutil.copy2(xlsx_file, temp_backup_dir / xlsx_file.name)

# Force sync with remote
run_command("git reset --hard origin/main")

# Restore Excel files
for xlsx_file in local_xlsx_files:
    shutil.copy2(temp_backup_dir / xlsx_file.name, input_dir / xlsx_file.name)
```

### GitHub Pages Configuration

**Hosting URL:**
```
https://dszilagyiques.github.io/quantawestdashboard/
```

**Branch Configuration:**
- Main deployment: `main` branch → `index.html`
- Legacy deployment: `gh-pages` branch (deprecated)

---

## Logging System

### Log File Location

```
logs/deploy_YYYYMMDD_HHMMSS.log
```

### Log Format

```
======================================================================
Quanta West Dashboard - Build & Deploy Log
Started: 2025-12-26 14:58:49
======================================================================

[14:58:49] Script directory: C:\Users\...\PWLCDashboard
[14:58:49] Python executable: .../venv/Scripts/python.exe
[14:58:49] 
[14:58:49] ============================================================
[14:58:49]   Quanta West Dashboard - Build & Deploy Pipeline
[14:58:49] ============================================================

[14:58:49] [1/4] Syncing with remote...
[14:58:49]       Backing up 1 local xlsx file(s)...
...

======================================================================
Ended: 2025-12-26 14:59:10
======================================================================
```

### Log Features

- **Timestamped entries**: Every action logged with HH:MM:SS
- **ANSI stripping**: Console colors removed for clean log files
- **Command output capture**: STDOUT/STDERR captured
- **Automatic cleanup**: `atexit` handler ensures proper closing

### Implementation

```python
def log_write(text):
    """Write text to log file (without ANSI codes)."""
    if _log_file:
        clean_text = strip_ansi_codes(text)
        timestamp = datetime.now().strftime("%H:%M:%S")
        _log_file.write(f"[{timestamp}] {clean_text}\n")
        _log_file.flush()
```

---

## Git Workflow

### Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Primary development + GitHub Pages source |
| `gh-pages` | Legacy deployment (deprecated) |

### Tracked Files

```gitignore
# Tracked
index.html              # Live dashboard
input/*.xlsx            # Source data
template/*.html         # HTML template
lib/*.min.js            # JavaScript libraries
*.py                    # Build scripts
requirements.txt        # Dependencies

# NOT Tracked (should be in .gitignore)
outputs/                # Build artifacts
logs/                   # Deployment logs
venv/                   # Virtual environment
__pycache__/            # Python cache
.xlsx_backup_temp/      # Temporary backup
```

### Commit Message Format

```
Update dashboard (YYYY-MM-DD HH:MM)
```

Custom messages supported:
```bash
python main.py --message "Added new filter functionality"
# Results in: "Added new filter functionality (2025-12-26 14:59)"
```

### Force Sync Behavior

The pipeline performs a **force sync** to ensure clean state:

```bash
git fetch origin main
git reset --hard origin/main  # Overwrites ALL local changes
git clean -fd                  # Removes untracked files
```

**Important**: Only Excel files in `input/` are preserved. All other local changes are discarded.

---

## Environment & Dependencies

### Python Version

```
Python 3.9+ recommended
Python 3.8 minimum (requires backports.zoneinfo)
```

### Virtual Environment Setup

```bash
# Create venv
python -m venv venv

# Activate (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Activate (Windows CMD)
.\venv\Scripts\activate.bat

# Activate (Unix/macOS)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Requirements.txt

```
pandas>=1.5.0
openpyxl>=3.0.0
cryptography>=41.0.0
backports.zoneinfo>=0.2.1; python_version < "3.9"
```

### Dependency Purposes

| Package | Purpose |
|---------|---------|
| `pandas` | Excel reading, CSV conversion |
| `openpyxl` | Excel file engine |
| `cryptography` | AES-256-GCM encryption |
| `backports.zoneinfo` | Timezone support (Python < 3.9) |

---

## Security Considerations

### Current Security Model

1. **Data at Rest**: CSV data encrypted with AES-256-GCM
2. **Data in Transit**: HTTPS via GitHub Pages
3. **Client-Side Decryption**: Password never sent to server
4. **No Server Component**: Pure static hosting

### Security Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Hardcoded password | HIGH | Move to environment variable |
| Password in git history | HIGH | Use `.env` file, add to `.gitignore` |
| Browser memory exposure | MEDIUM | Data cleared on page close |
| Key derivation in JS | LOW | 200K iterations provides adequate protection |

### Recommended Improvements

```python
# Instead of:
DASHBOARD_PASSWORD = "quantawestllc2026"

# Use:
import os
DASHBOARD_PASSWORD = os.environ.get('DASHBOARD_PASSWORD')
if not DASHBOARD_PASSWORD:
    raise ValueError("DASHBOARD_PASSWORD environment variable not set")
```

**Environment variable setup (PowerShell):**
```powershell
$env:DASHBOARD_PASSWORD = "your-secure-password"
python build_dashboard.py
```

---

## Troubleshooting

### Common Issues

#### 1. "No Excel file found in input directory"

**Cause**: Missing or wrong file extension
**Solution**: 
```bash
dir input\*.xlsx
# Ensure file exists with .xlsx extension
```

#### 2. "Failed to download libraries"

**Cause**: Network issues or CDN unavailable
**Solution**:
```bash
# Manual download
curl -o lib/chart.min.js "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"
```

#### 3. "ModuleNotFoundError: No module named 'pandas'"

**Cause**: Virtual environment not activated
**Solution**:
```bash
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

#### 4. "Encrypted payload marker not found in template"

**Cause**: Template missing placeholder
**Solution**: Ensure template contains:
```html
<!-- EMBEDDED_ENCRYPTED_PAYLOAD_JSON -->
```

#### 5. "git push rejected"

**Cause**: Remote has newer commits
**Solution**: The `main.py` script handles this with force sync. Use it instead of manual git operations.

### Debug Commands

```bash
# Test encryption payload
python test_payload.py

# Verify build output
python -c "import json; print(json.loads(open('outputs/...html').read().split('payloadStr')[1][:100]))"

# Check library sizes
dir lib\*.js

# View recent logs
type logs\deploy_*.log | more
```

---

## Quick Reference

### Common Commands

```bash
# Full deployment (recommended)
python main.py

# Build only (no deploy)
python build_dashboard.py

# Download libraries
python bundle_libs.py

# PowerShell deployment
.\deploy.ps1 -Message "Update"
```

### File Locations

| What | Where |
|------|-------|
| Input data | `input/*.xlsx` |
| Template | `template/pwlc_dashboard_v2.html` |
| Build output | `outputs/Quanta West Estimating Dashboard.html` |
| Live dashboard | `index.html` |
| Libraries | `lib/*.min.js` |
| Logs | `logs/deploy_*.log` |

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `DASHBOARD_PASSWORD` | Encryption password | Hardcoded (⚠️) |

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Build failure |
| 1 | Missing dependencies |
| 1 | Git operation failed |

### Build Output Metrics

| Metric | Typical Value |
|--------|---------------|
| Records | ~4,000+ |
| Output size | ~2.7 MB |
| Build time | < 5 seconds |
| Deploy time | ~20 seconds |

---

## Pipeline Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        COMPLETE PIPELINE FLOW                          │
└─────────────────────────────────────────────────────────────────────────┘

  Local Machine                                      GitHub
  ─────────────                                      ──────

  input/*.xlsx ──────────────────────────────────────────────┐
       │                                                      │
       ▼                                                      │
  ┌─────────────┐                                            │
  │  pandas     │                                            │
  │  read_excel │                                            │
  └──────┬──────┘                                            │
         │                                                    │
         ▼                                                    │
  ┌─────────────┐                                            │
  │  CSV String │                                            │
  └──────┬──────┘                                            │
         │                                                    │
         ▼                                                    │
  ┌─────────────┐     ┌─────────────┐                        │
  │  Encrypt    │ ←── │  Password   │                        │
  │  (AES-GCM)  │     │  (env var)  │                        │
  └──────┬──────┘     └─────────────┘                        │
         │                                                    │
         ▼                                                    │
  ┌─────────────┐     ┌─────────────┐                        │
  │  HTML       │ ←── │  JS Libs    │                        │
  │  Template   │     │  (inlined)  │                        │
  └──────┬──────┘     └─────────────┘                        │
         │                                                    │
         ▼                                                    │
  ┌──────────────────────┐                                   │
  │  outputs/*.html      │                                   │
  │  (encrypted payload) │                                   │
  └──────────┬───────────┘                                   │
             │                                                │
             ▼                                                │
  ┌─────────────┐                                            │
  │  index.html │ ───────── git push ────────────────────────┤
  └─────────────┘                                            │
                                                              │
                                                              ▼
                                                    ┌─────────────────┐
                                                    │  GitHub Pages   │
                                                    │  (Live Site)    │
                                                    └─────────────────┘
                                                              │
                                                              ▼
                                                    ┌─────────────────┐
                                                    │  User Browser   │
                                                    │  (Decryption)   │
                                                    └─────────────────┘
```

---

*Document Version: 1.0*  
*Last Updated: December 2024*  
*Maintained by: Engineering Team*

