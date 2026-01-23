# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Financial data visualization dashboard for Indirect G&A cost analysis. Builds a **single-file HTML dashboard** from Excel source data with client-side AES-256-GCM encryption. Designed for SharePoint iframe embedding and offline use.

**Stack**: Python (pandas, cryptography) backend → Single-file HTML/JS frontend (Chart.js, PapaParse)

## Common Commands

```bash
# Full deployment pipeline (sync → build → commit → push)
python main.py -m "Update message"

# Build only (no git operations)
python main.py --build-only

# Skip remote sync but still commit
python main.py --skip-sync

# Download/update bundled JavaScript libraries
python bundle_libs.py

# Analyze charts in Excel source files
python analyze_charts.py
```

## Build Pipeline

1. **Sync** - Force sync with remote, backing up Excel files in `input/`
2. **Libraries** - Ensure `lib/chart.min.js` and `lib/papaparse.min.js` exist
3. **Build** - `build_dashboard.py` assembles modular template, processes Excel → CSV → encrypts → embeds in HTML
4. **Deploy** - Copies output to `index.html`, commits, pushes to GitHub Pages

Output: `outputs/Indirect G&A Dashboard.html` → copied to `index.html` (60-80 MB with inlined libraries)

## Architecture

### Data Flow
```
Excel (input/*.xlsx)
    ↓ pandas read_excel
CSV with derived columns (Category, Department, Dept_Category, Is_Allocation)
    ↓ AES-256-GCM encryption (PBKDF2, 200K iterations)
Base64 payload embedded in HTML template
    ↓ Browser decryption on password entry
PapaParse → Chart.js visualization
```

### Key Files
- `build_dashboard.py` - Core build: Excel parsing, column derivation, encryption, template assembly
- `main.py` - Full CI/CD pipeline with logging to `logs/`
- `bundle_libs.py` - Downloads Chart.js and PapaParse from CDN to `lib/`

### Template Structure (Modular)

The dashboard template is split into modular source files that are assembled during build:

```
template/
├── css/
│   ├── variables.css       # CSS custom properties
│   ├── base.css            # Reset, body, scrollbar
│   ├── password.css        # Password screen
│   ├── layout.css          # Header, filters, main
│   ├── multiselect.css     # Dropdown component
│   ├── kpi.css             # KPI cards
│   ├── charts.css          # Chart cards/containers
│   ├── drillthrough.css    # Modal and table
│   └── responsive.css      # Media queries
│
├── html/
│   ├── head.html           # <head> content with CDN script tags
│   ├── password.html       # Password overlay
│   ├── header.html         # Sticky header
│   ├── filters.html        # Global filters section
│   ├── kpi.html            # KPI cards row
│   ├── charts.html         # Chart grid
│   └── drillthrough.html   # Drill-through modal
│
└── js/
    ├── config.js           # Constants, colors, DOC_TYPE_NAMES
    ├── state.js            # Global state variables
    ├── utils.js            # formatCurrency, escapeHtml, etc.
    ├── crypto.js           # base64ToArrayBuffer, decryptData
    ├── filters.js          # applyFilters, clearFilters, updateFilterPills
    ├── kpi.js              # calculateKPIs, updateKPIs
    ├── charts/
    │   ├── monthly-trend.js
    │   ├── department.js
    │   ├── division.js
    │   ├── category.js
    │   ├── doctype.js
    │   └── costtype.js
    ├── drillthrough.js     # Modal, pagination, export
    ├── multiselect.js      # Multi-select component
    └── init.js             # setupFilters, setupDrill, handlePassword
```

### Derived Columns (added during build)
- `Category` - Mapped from cost type code prefix (61xxxx→Labor, 67xxxx→Equipment, etc.)
- `Department` - Last 3 digits of Job number mapped via `DEPARTMENT_MAP`
- `Dept_Category` - High-level grouping (G&A, Ops Support, Equipment, Safety/Comms, Field)
- `Is_Allocation` - Boolean for 693xxx cost codes

### Encryption
- Password: Environment variable `DASHBOARD_PASSWORD` or default `indirectga2026`
- 16-byte salt + 12-byte IV + AES-256-GCM + Base64 encoding

## Design Documentation

Comprehensive specs exist in:
- `Indirect_G_and_A_Costs.md` - Dashboard requirements, metrics, chart specs, filter system
- `backend_pipeline.md` - Build process, encryption details, deployment
- `design_rules.md` - Color system, typography, spacing, components
- `ux_ui_rules.md` - Modal system, filtering, interactions

### Color System
Dark-first design with semantic colors:
- Background: `#0c1117` (base), `#161b22` (surface), `#1c2128` (elevated)
- Gross Costs → Blue (`#58a6ff`), Allocation Credits → Emerald (`#3fb950`), Net Costs → Amber (`#d29922`)
- Labor → Blue, Equipment → Violet (`#a371f7`), Negative values → Rose (`#f85149`)

## Working with This Codebase

- **Adding charts**: Create new JS file in `template/js/charts/`, add function name to `JS_ORDER` in `build_dashboard.py`, add canvas in `template/html/charts.html`
- **Adding filters**: Update `template/html/filters.html` and add handler in `template/js/filters.js`
- **Modifying styles**: Edit the appropriate CSS file in `template/css/`
- **Changing data schema**: Update `categorize_cost_type()` and mapping dicts in `build_dashboard.py`
- **Library updates**: Use `bundle_libs.py` - never load from CDN (offline/SharePoint requirement)
- **Excel files in `input/`**: Backed up automatically during git sync operations
