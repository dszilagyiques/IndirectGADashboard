# ITS Indirect & G&A Cost Dashboard – Specification Document

> A comprehensive specification for visualizing Year-to-Date Indirect and General & Administrative costs for executive financial analysis.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Data Source Analysis](#data-source-analysis)
3. [Key Metrics & KPIs](#key-metrics--kpis)
4. [Dashboard Layout](#dashboard-layout)
5. [Chart Specifications](#chart-specifications)
6. [Filter System](#filter-system)
7. [Drill-Down Modals](#drill-down-modals)
8. [Technical Implementation](#technical-implementation)
9. [Color Coding & Visual Design](#color-coding--visual-design)
10. [Data Processing Pipeline](#data-processing-pipeline)

---

## Executive Summary

### Purpose

This dashboard provides executive-level visibility into Indirect and G&A costs across the organization, enabling:

- **Cost Control**: Real-time monitoring of overhead costs vs. operational expenses
- **Division Accountability**: Track cost performance by division/department
- **Allocation Transparency**: Visualize how indirect costs are absorbed by jobs
- **Trend Analysis**: Identify cost patterns and seasonal variations
- **Decision Support**: Data-driven insights for budget planning and cost reduction initiatives

### Target Audience

- Chief Financial Officer (CFO)
- VP of Finance
- Division Controllers
- Cost Accounting Managers
- Operations Leadership

### Data Scope

| Attribute | Value |
|-----------|-------|
| **Source File** | `YTD Indirect-G&A Cost.xlsx` |
| **Date Range** | January 2025 – November 2025 (YTD) |
| **Total Records** | 186,355 transactions |
| **Gross Costs** | $82.01M |
| **Allocation Credits** | $(53.25M) |
| **Net Indirect/G&A** | $28.76M |
| **Divisions** | 8 |
| **Cost Types** | 139 unique cost codes |

---

## Data Source Analysis

### Source Structure

**Sheet**: `Cost Code Detail Report`

**Key Columns**:

| Column | Description | Usage |
|--------|-------------|-------|
| `Document Type` | Transaction type (JE, PV, P9, T2, T3, etc.) | Filtering, categorization |
| `Division Name` | Business division | Primary grouping |
| `G/L Date` | General Ledger posting date | Time-series analysis |
| `Actual Amount` | Dollar value (positive = cost, negative = credit) | All financial calculations |
| `Actual Units` | Quantity (hours, units, etc.) | Labor analytics |
| `Job` | Job/project number | Cost allocation tracking |
| `Job Type` | IN (Indirect) or GA (General & Administrative) | Cost classification |
| `Cost Type` | Full cost code with description (e.g., "611000 - Regular Time") | Detailed categorization |
| `Description` | Short description of cost type | Display labels |
| `Subledger` | Sub-account for detailed tracking | Drill-down detail |

### Data Quality Notes

1. **Grand Total Row**: The source contains a "Grand Total" document type row that must be filtered out during processing
2. **Allocation Credits**: Cost codes starting with `693xxx` represent internal allocation credits (negative values)
3. **Division Coverage**: All transactions have valid division assignments
4. **Date Completeness**: Full coverage from Jan 1 through Nov 30, 2025

### Cost Code Hierarchy

```
6xxxxx - Operating Costs
├── 61xxxx - Labor Costs
│   ├── 611000 - Regular Time
│   ├── 611500 - Overtime
│   ├── 612000 - Double Time
│   ├── 615000 - Payroll Taxes
│   ├── 615500 - Workers' Compensation
│   ├── 616000 - General Liability
│   ├── 617000 - Fringes
│   ├── 618000 - Bonus Wages
│   └── 619000 - Contract Labor
│
├── 62xxxx - Travel & Per Diem
│   ├── 621000 - 100% Deductible Meals
│   ├── 622000 - 50% Deductible Meals
│   ├── 623000 - Per Diem W-2
│   ├── 625000 - Per Diem Meal & Lodging
│   └── 627000 - Other Travel Expenses
│
├── 64xxxx - Fleet, Materials & Maintenance
│   ├── 641xxx - Fuel & Lubricants
│   ├── 642xxx - Materials & Supplies
│   ├── 643xxx - Maintenance & Repairs
│   ├── 644xxx - Training
│   └── 649xxx - License & Registration
│
├── 65xxxx - Facilities & Services
│   ├── 651000 - Business Development
│   ├── 652000 - Facilities Expense
│   └── 658xxx - Professional Fees
│
├── 67xxxx - Equipment Costs
│   ├── 671000 - Depreciation
│   ├── 672000 - Leasing Expense
│   ├── 673000 - Rentals - Equipment
│   └── 675xxx-678xxx - Insurance
│
├── 69xxxx - Allocation Credits
│   ├── 693010 - Assigned Equipment Credits
│   ├── 693030 - Equipment General Allocation
│   ├── 693050 - Small Tools Dept Allocation
│   ├── 693060 - Safety General Dept Allocation
│   ├── 693070 - Safety Training Dept Allocation
│   ├── 693080 - Project Mgmt Dept Allocation
│   ├── 693130 - Non-Billable Dept Allocation
│   ├── 693170 - Indirect Field Ops Dept Allocation
│   └── 693180 - Indirect Service Job Credits
│
7xxxxx - Corporate Overhead
├── 71xxxx - Corporate Salaries
├── 72xxxx - Office Expenses
│   └── 729100 - Office Rent
├── 73xxxx - General & Administrative
│   ├── 737200 - Audit Fees
│   ├── 737300 - Consulting Fees
│   └── 737400 - Legal Fees
└── 74xxxx-75xxxx - Taxes & Other
```

---

## Key Metrics & KPIs

### Primary KPIs (Top Row)

| KPI | Calculation | Color Theme | Purpose |
|-----|-------------|-------------|---------|
| **Gross Indirect Costs** | Sum of all positive cost transactions (excl. 693xxx) | Cyan/Blue gradient | Total overhead before allocation |
| **Allocation Credits** | Sum of 693xxx cost codes (negative) | Emerald/Green gradient | Costs recovered through job allocation |
| **Net Indirect/G&A** | Gross Costs + Allocation Credits | Amber/Orange gradient | Unrecovered overhead burden |
| **Indirect Cost Ratio** | Net Indirect ÷ Gross Costs × 100 | Violet/Purple gradient | Efficiency metric (lower = better) |
| **Monthly Avg Spend** | Net Indirect ÷ Months | Rose/Red gradient | Burn rate indicator |
| **YoY Variance** | (Current YTD - Prior YTD) ÷ Prior YTD | Blue/Cyan gradient | Trend indicator (if prior year data available) |

### Secondary KPIs (By Category)

| Metric | Description |
|--------|-------------|
| **Labor Cost %** | Labor costs as % of total gross costs |
| **Fleet Cost %** | Fleet & fuel costs as % of total gross costs |
| **Equipment Cost %** | Depreciation + leasing + rentals as % |
| **Allocation Rate** | Allocation credits ÷ Gross costs |

---

## Dashboard Layout

### Layout Structure

Following the design system in `design_rules.md`:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER: ITS Indirect & G&A Cost Dashboard                    [Filter] [⋮]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ GROSS    │ │ALLOCATION│ │   NET    │ │  COST    │ │ MONTHLY  │          │
│  │ INDIRECT │ │ CREDITS  │ │INDIRECT/ │ │  RATIO   │ │   AVG    │          │
│  │  COSTS   │ │          │ │   G&A    │ │          │ │  SPEND   │          │
│  │ $82.01M  │ │$(53.25M) │ │ $28.76M  │ │  35.1%   │ │ $2.61M   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │           MONTHLY COST TREND (Stacked Area Chart)                  │    │
│  │  [Gross Costs | Allocation Credits | Net Costs]                    │    │
│  │  ════════════════════════════════════════════════════════════════  │    │
│  │  Jan   Feb   Mar   Apr   May   Jun   Jul   Aug   Sep   Oct   Nov   │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐      │
│  │   COST BY DIVISION         │  │   COST BY CATEGORY              │      │
│  │   (Horizontal Bar Chart)   │  │   (Donut Chart)                 │      │
│  │                            │  │                                 │      │
│  │  Corp Legacy PAR ████████  │  │        ┌─────────┐              │      │
│  │  Vacaville       █████     │  │       /   Labor   \             │      │
│  │  Los Angeles     ████      │  │      │   33.1%    │             │      │
│  │  Escondido       ███       │  │       \___________/             │      │
│  │  Civil           ██        │  │                                 │      │
│  │  Substation      █         │  │  ▪ Labor  ▪ Fleet  ▪ Equipment  │      │
│  │  Major Projects  █         │  │  ▪ Corporate  ▪ Other           │      │
│  └─────────────────────────────┘  └─────────────────────────────────┘      │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐      │
│  │   INDIRECT vs G&A          │  │   TOP 10 COST TYPES             │      │
│  │   (Stacked Bar by Month)   │  │   (Horizontal Bar Chart)        │      │
│  │                            │  │                                 │      │
│  │   [IN] [GA]                │  │  Regular Time      ████████████ │      │
│  │   ▓▓▓  ░░░  Jan            │  │  Leasing Expense   ████████     │      │
│  │   ▓▓▓  ░░░  Feb            │  │  Salaries          █████        │      │
│  │   ▓▓▓  ░░░  Mar            │  │  Fringes           █████        │      │
│  │   ...                      │  │  Diesel            ████         │      │
│  └─────────────────────────────┘  └─────────────────────────────────┘      │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │           ALLOCATION WATERFALL CHART                               │    │
│  │  (Gross Costs → Allocation Credits → Net Costs)                    │    │
│  │  ═══════════════════════════════════════════════════════════════   │    │
│  │   │████████████████████████████████│                              │    │
│  │   │  Gross: $82.01M                │                              │    │
│  │   │████████████████████████████████│                              │    │
│  │                    ▼                                               │    │
│  │               │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│                              │    │
│  │               │ Allocations: -$53.3M│                              │    │
│  │               │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│                              │    │
│  │                         ▼                                          │    │
│  │                    │████████████│                                  │    │
│  │                    │Net: $28.76M│                                  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Grid System

Per `design_rules.md`:

```css
.chart-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: auto repeat(3, minmax(280px, 1fr));
    gap: 20px;
}
```

---

## Chart Specifications

### 1. Monthly Cost Trend (Full Width - Row 1)

**Chart Type**: Stacked Area Chart with Line Overlay

**Data Series**:
| Series | Color | Description |
|--------|-------|-------------|
| Gross Costs | `rgba(59, 130, 246, 0.6)` (Blue) | Total costs before allocation |
| Allocation Credits | `rgba(16, 185, 129, 0.6)` (Emerald) | Costs allocated out (shown as positive) |
| Net Costs | Line overlay `#f59e0b` (Amber) | Final unrecovered costs |

**X-Axis**: Months (Jan 2025 - Nov 2025)
**Y-Axis**: Dollar amount (formatted as $X.XM)

**Interaction**: Click month to filter all other charts

**Data Preparation**:
```python
monthly = df.groupby(df['G/L Date'].dt.to_period('M')).agg({
    'Actual Amount': 'sum'
}).rename(columns={'Actual Amount': 'Net'})

# Split gross vs allocation
monthly['Gross'] = df[~df['Cost Type'].str.startswith('693')].groupby(...)
monthly['Allocations'] = df[df['Cost Type'].str.startswith('693')].groupby(...).abs()
```

### 2. Cost by Division (Left Column - Row 2)

**Chart Type**: Horizontal Bar Chart

**Data**: Net costs by Division Name, sorted descending

**Color**: Gradient from `--accent-blue` to `--accent-cyan`

**Divisions** (in typical order):
1. Corporate Legacy PAR West: $13.69M
2. Vacaville: $7.27M
3. Los Angeles: $2.80M
4. Escondido: $2.63M
5. Civil: $1.41M
6. Substation: $0.52M
7. Major Projects: $0.47M
8. Quanta West Safety Training: -$0.04M (credit)

**Interaction**: Click bar to filter dashboard by division

### 3. Cost by Category (Right Column - Row 2)

**Chart Type**: Donut Chart with Center Total

**Categories**:
| Category | Color | Typical % |
|----------|-------|-----------|
| Labor Costs | `#3b82f6` (Blue) | 33% |
| Fleet & Materials | `#06b6d4` (Cyan) | 22% |
| Equipment Costs | `#8b5cf6` (Violet) | 22% |
| Corporate Overhead | `#f59e0b` (Amber) | 14% |
| Facilities & Services | `#10b981` (Emerald) | 3% |
| Travel & Per Diem | `#f43f5e` (Rose) | 2% |
| Other | `#64748b` (Slate) | 4% |

**Center Display**: Total Gross Costs formatted as currency

**Interaction**: Click segment to filter by category

### 4. Indirect vs G&A by Month (Left Column - Row 3)

**Chart Type**: Stacked Vertical Bar Chart

**Data Series**:
| Series | Color | Job Type |
|--------|-------|----------|
| Indirect | `#06b6d4` (Cyan) | IN |
| G&A | `#8b5cf6` (Violet) | GA |

**Purpose**: Show relative burden of job-related indirect costs vs. corporate G&A

**Insight Value**: Helps identify if overhead is operational (IN) or administrative (GA)

### 5. Top 10 Cost Types (Right Column - Row 3)

**Chart Type**: Horizontal Bar Chart

**Data**: Top 10 cost descriptions by total amount

**Expected Top 10**:
1. Regular Time: $15.61M
2. Leasing Expense: $8.75M
3. Salaries: $4.37M
4. Fringes: $3.66M
5. Diesel: $3.60M
6. Depreciation: $3.14M
7. Gasoline: $2.50M
8. Parts: $2.48M
9. Rentals - Equipment: $2.45M
10. Double Time: $2.43M

**Color**: Single color `--accent-cyan` with hover highlight

**Interaction**: Click to open cost type detail modal

### 6. Allocation Waterfall Chart (Full Width - Row 4)

**Chart Type**: Waterfall/Bridge Chart

**Purpose**: Visualize the flow from Gross Costs → Allocations → Net Costs

**Segments**:
| Segment | Value | Color | Description |
|---------|-------|-------|-------------|
| Gross Costs | $82.01M | `#3b82f6` (Blue) | Starting point |
| Equipment Credits | -$18.51M | `#10b981` (Emerald) | 693010 |
| Field Ops Allocation | -$11.02M | `#10b981` (Emerald) | 693170 |
| Equipment General | -$9.34M | `#10b981` (Emerald) | 693030 |
| Safety General | -$4.64M | `#10b981` (Emerald) | 693060 |
| Other Allocations | -$9.74M | `#10b981` (Emerald) | Remaining 693xxx |
| **Net Costs** | $28.76M | `#f59e0b` (Amber) | Final total |

---

## Filter System

### Filter Panel (Slide-out Sidebar)

Per `design_rules.md` sidebar pattern:

```css
.sidebar {
    position: fixed;
    right: 0;
    width: 360px;
    transform: translateX(100%);
    transition: transform 0.3s ease;
}
```

### Available Filters

| Filter | Type | Options |
|--------|------|---------|
| **Date Range** | Date Picker + Presets | YTD, QTD, MTD, Custom |
| **Division** | Multi-select Checkbox | All 8 divisions |
| **Job Type** | Toggle Buttons | All, IN, GA |
| **Cost Category** | Multi-select Checkbox | 7 categories |
| **Amount Range** | Dual Slider | $0 to Max |
| **Document Type** | Multi-select | JE, PV, P9, T2, T3, etc. |

### Date Presets

| Preset | Date Range |
|--------|------------|
| YTD | Jan 1, 2025 – Today |
| Q1 | Jan 1 – Mar 31, 2025 |
| Q2 | Apr 1 – Jun 30, 2025 |
| Q3 | Jul 1 – Sep 30, 2025 |
| Q4 | Oct 1 – Dec 31, 2025 |
| Last 30 Days | Rolling |
| Last 90 Days | Rolling |
| Custom | User-defined |

### Filter State Display

Active filters shown as pills below header:

```html
<div class="filter-pills">
    <span class="filter-pill">Q3 2025 <button>×</button></span>
    <span class="filter-pill">Vacaville <button>×</button></span>
    <span class="filter-pill">Labor Costs <button>×</button></span>
</div>
```

---

## Drill-Down Modals

### 1. Cost Type Detail Modal

**Trigger**: Click on bar in "Top 10 Cost Types" chart or any cost type in tables

**Modal Content**:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Regular Time (611000)                                    [×]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Total: $15,610,287.04          Records: 42,156                    │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  MONTHLY TREND FOR THIS COST TYPE                             │ │
│  │  (Line Chart)                                                 │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  BY DIVISION:                                                       │
│  ┌─────────────────────┬────────────────┬──────────┐               │
│  │ Division            │ Amount         │ % of Tot │               │
│  ├─────────────────────┼────────────────┼──────────┤               │
│  │ Vacaville           │ $4,521,000.00  │ 29.0%    │               │
│  │ Corporate Legacy    │ $3,890,000.00  │ 24.9%    │               │
│  │ Los Angeles         │ $2,100,000.00  │ 13.5%    │               │
│  │ ...                 │ ...            │ ...      │               │
│  └─────────────────────┴────────────────┴──────────┘               │
│                                                                     │
│  RECENT TRANSACTIONS:                                               │
│  ┌───────────┬────────────┬────────────────┬────────────┐          │
│  │ Date      │ Document # │ Job            │ Amount     │          │
│  ├───────────┼────────────┼────────────────┼────────────┤          │
│  │ 11/30/25  │ T2-285641  │ 16519140       │ $45,231.00 │          │
│  │ ...       │ ...        │ ...            │ ...        │          │
│  └───────────┴────────────┴────────────────┴────────────┘          │
│                                                 [Export to Excel]   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Division Detail Modal

**Trigger**: Click on division bar or division name

**Modal Content**:
- Division summary KPIs (Gross, Allocations, Net)
- Cost breakdown by category (pie chart)
- Monthly trend for that division
- Top 10 cost types within division
- IN vs GA split
- Transaction detail table

### 3. Monthly Detail Modal

**Trigger**: Click on month in trend chart

**Modal Content**:
- Month summary metrics
- Comparison to prior month (MoM change)
- Cost breakdown by category
- Division breakdown
- Top transactions for the month

---

## Technical Implementation

### Build Pipeline Integration

Per `backend_pipeline.md`, the dashboard follows the same architecture:

```
input_its/YTD Indirect-G&A Cost.xlsx
         │
         ▼
    ┌─────────────┐
    │  pandas     │  (Excel → CSV conversion)
    │  read_excel │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Encrypt    │  (AES-256-GCM)
    │  CSV Data   │
    └──────┬──────┘
           │
           ▼
    ┌──────────────────────┐
    │  its_dashboard       │
    │  _template.html      │
    │  + Chart.js          │
    │  + PapaParse         │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │  ITS Tool Spending   │
    │  Dashboard.html      │
    └──────────────────────┘
```

### Data Processing (Python)

```python
def process_indirect_ga_data(excel_path):
    """Process YTD Indirect-G&A Cost data for dashboard."""
    df = pd.read_excel(excel_path, sheet_name='Cost Code Detail Report')
    
    # Clean column names
    df.columns = [c.replace('\n', ' ').strip() for c in df.columns]
    
    # Filter out Grand Total row
    df = df[df['Document Type'] != 'Grand Total']
    
    # Add derived columns
    df['Month'] = pd.to_datetime(df['G/L Date']).dt.to_period('M')
    df['Is_Allocation'] = df['Cost Type'].str.startswith('693', na=False)
    df['Category'] = df['Cost Type'].apply(categorize_cost_type)
    
    return df.to_csv(index=False)

def categorize_cost_type(cost_type):
    """Map cost type to high-level category."""
    if pd.isna(cost_type):
        return 'Unknown'
    code = cost_type.split(' - ')[0]
    
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
    elif code.startswith('69'):
        return 'Allocation Credits'
    elif code.startswith('71') or code.startswith('72'):
        return 'Corporate Overhead'
    elif code.startswith('73') or code.startswith('74') or code.startswith('75'):
        return 'G&A & Other'
    else:
        return 'Other'
```

### JavaScript Data Parsing

```javascript
function parseIndirectGAData(csvData) {
    const parsed = Papa.parse(csvData, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
    });
    
    // Pre-compute aggregations
    const data = parsed.data;
    
    return {
        raw: data,
        byMonth: aggregateByMonth(data),
        byDivision: aggregateByDivision(data),
        byCategory: aggregateByCategory(data),
        byJobType: aggregateByJobType(data),
        byCostType: aggregateByCostType(data),
        kpis: calculateKPIs(data)
    };
}

function calculateKPIs(data) {
    const grossCosts = data
        .filter(r => !r['Cost Type']?.startsWith('693'))
        .reduce((sum, r) => sum + (r['Actual Amount'] || 0), 0);
    
    const allocationCredits = data
        .filter(r => r['Cost Type']?.startsWith('693'))
        .reduce((sum, r) => sum + (r['Actual Amount'] || 0), 0);
    
    const netCosts = grossCosts + allocationCredits;
    const months = new Set(data.map(r => r['G/L Date']?.substring(0, 7))).size;
    
    return {
        grossCosts,
        allocationCredits,
        netCosts,
        costRatio: (netCosts / grossCosts * 100).toFixed(1),
        monthlyAvg: netCosts / months
    };
}
```

### Required Libraries

Per `backend_pipeline.md`:

| Library | Version | Size | Purpose |
|---------|---------|------|---------|
| Chart.js | 4.4.1 | ~205 KB | All charts |
| PapaParse | 5.4.1 | ~19 KB | CSV parsing |

**Note**: XLSX export library optional – may not be needed for this dashboard.

---

## Color Coding & Visual Design

### Adherence to Design System

All visual elements follow `design_rules.md`:

#### CSS Variables

```css
:root {
    /* Backgrounds */
    --bg-dark: #0a0f1a;
    --bg-card: #111827;
    --bg-card-hover: #1a2332;
    --bg-input: #0d1321;
    
    /* Borders */
    --border: #1e2d3d;
    --border-focus: #3b82f6;
    
    /* Text */
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    
    /* Accents */
    --accent-blue: #3b82f6;
    --accent-cyan: #06b6d4;
    --accent-emerald: #10b981;
    --accent-amber: #f59e0b;
    --accent-rose: #f43f5e;
    --accent-violet: #8b5cf6;
}
```

#### Semantic Color Mapping for This Dashboard

| Data Type | Color | Rationale |
|-----------|-------|-----------|
| Gross Costs | Blue (`#3b82f6`) | Primary metric, matches "Submitted" status |
| Allocation Credits | Emerald (`#10b981`) | Positive outcome (costs recovered) |
| Net Costs | Amber (`#f59e0b`) | Warning/attention (unrecovered) |
| Labor Costs | Blue (`#3b82f6`) | Largest category, primary focus |
| Equipment | Violet (`#8b5cf6`) | Secondary category |
| Negative Values | Rose (`#f43f5e`) | Credits/reversals |

#### KPI Card Gradients

```css
.kpi-gross::before {
    background: linear-gradient(90deg, #3b82f6, #06b6d4);
}

.kpi-allocations::before {
    background: linear-gradient(90deg, #10b981, #06b6d4);
}

.kpi-net::before {
    background: linear-gradient(90deg, #f59e0b, #f43f5e);
}

.kpi-ratio::before {
    background: linear-gradient(90deg, #8b5cf6, #3b82f6);
}

.kpi-monthly::before {
    background: linear-gradient(90deg, #f43f5e, #f59e0b);
}
```

#### Typography for Financial Data

```css
.currency-value {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    color: var(--accent-cyan);
}

.percentage-value {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.negative-value {
    color: var(--accent-rose);
}

.positive-value {
    color: var(--accent-emerald);
}
```

---

## Data Processing Pipeline

### Build Script Modifications

Create `build_its_dashboard.py` following the pattern in `backend_pipeline.md`:

```python
#!/usr/bin/env python3
"""
ITS Indirect & G&A Cost Dashboard Builder
"""

import pandas as pd
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo

# Configuration
INPUT_FILE = "YTD Indirect-G&A Cost.xlsx"
TEMPLATE_FILE = "template/its_dashboard_template.html"
OUTPUT_FILE = "outputs/ITS Tool Spending Dashboard.html"
DASHBOARD_PASSWORD = os.environ.get('DASHBOARD_PASSWORD', 'default_password')

def main():
    script_dir = Path(__file__).parent
    
    # Read and process Excel
    excel_path = script_dir / INPUT_FILE
    df = pd.read_excel(excel_path, sheet_name='Cost Code Detail Report')
    
    # Clean and transform
    df.columns = [c.replace('\n', ' ').strip() for c in df.columns]
    df = df[df['Document Type'] != 'Grand Total']
    
    # Add derived columns
    df['Category'] = df['Cost Type'].apply(categorize_cost_type)
    
    # Convert to CSV
    csv_data = df.to_csv(index=False)
    record_count = len(df)
    
    # Generate timestamp
    pacific_tz = ZoneInfo("America/Los_Angeles")
    timestamp = datetime.now(pacific_tz).strftime("%m/%d/%Y %I:%M %p PT")
    
    # Read template and inline libraries
    template = (script_dir / TEMPLATE_FILE).read_text(encoding='utf-8')
    html = inline_libraries(template, script_dir / 'lib')
    
    # Encrypt and embed data
    encrypted_payload = encrypt_csv_data(csv_data, DASHBOARD_PASSWORD)
    html = embed_encrypted_payload(html, encrypted_payload, timestamp)
    
    # Write output
    output_path = script_dir / OUTPUT_FILE
    output_path.write_text(html, encoding='utf-8')
    
    print(f"BUILD SUCCESSFUL!")
    print(f"  Records: {record_count:,}")
    print(f"  Output: {OUTPUT_FILE}")
    print(f"  Size: {output_path.stat().st_size / 1024 / 1024:.2f} MB")

if __name__ == "__main__":
    main()
```

### Deployment Integration

Add to `main.py` deployment pipeline:

```python
# In main.py, add ITS dashboard build step
def build_its_dashboard():
    """Build ITS Indirect & G&A Cost Dashboard."""
    result = subprocess.run(
        [sys.executable, "build_its_dashboard.py"],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        raise RuntimeError(f"ITS dashboard build failed: {result.stderr}")
    return result.stdout
```

---

## Appendix: Sample Data Summary

### Monthly Totals (2025 YTD)

| Month | Net Amount |
|-------|------------|
| January | $2,214,279 |
| February | $2,531,821 |
| March | $2,236,630 |
| April | $2,171,352 |
| May | $2,862,999 |
| June | $2,416,997 |
| July | $2,845,195 |
| August | $2,718,467 |
| September | $2,690,007 |
| October | $2,883,311 |
| November | $3,188,541 |

### Division Totals

| Division | Net Amount | % of Total |
|----------|------------|------------|
| Corporate Legacy PAR West | $13,685,794 | 47.6% |
| Vacaville | $7,274,120 | 25.3% |
| Los Angeles | $2,801,176 | 9.7% |
| Escondido | $2,632,572 | 9.2% |
| Civil | $1,412,912 | 4.9% |
| Substation | $517,411 | 1.8% |
| Major Projects | $474,598 | 1.7% |
| Quanta West Safety Training | $(38,984) | -0.1% |

### Top 10 Cost Types

| Rank | Cost Type | Amount |
|------|-----------|--------|
| 1 | Regular Time | $15,610,287 |
| 2 | Leasing Expense | $8,751,396 |
| 3 | Salaries | $4,366,911 |
| 4 | Fringes | $3,659,783 |
| 5 | Diesel | $3,601,198 |
| 6 | Depreciation | $3,136,278 |
| 7 | Gasoline | $2,497,945 |
| 8 | Parts | $2,480,880 |
| 9 | Rentals - Equipment | $2,448,986 |
| 10 | Double Time | $2,425,157 |

---

*Document Version: 1.0*  
*Created: January 2, 2026*  
*Author: Finance & Accounting Executive Team*  
*References: design_rules.md, backend_pipeline.md*

