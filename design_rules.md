# Quanta West Dashboard – Design Engineering Bible

> A comprehensive guide to the UI/UX design system, patterns, and rules governing the Quanta West Bid Analytics Dashboard.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Component Library](#component-library)
6. [Interaction Patterns](#interaction-patterns)
7. [Animation System](#animation-system)
8. [Responsive Design](#responsive-design)
9. [Accessibility](#accessibility)
10. [Data Visualization](#data-visualization)
11. [Modal & Overlay Patterns](#modal--overlay-patterns)
12. [Form Controls](#form-controls)
13. [Table Design](#table-design)
14. [Navigation & Filtering](#navigation--filtering)
15. [Performance Guidelines](#performance-guidelines)

---

## Design Philosophy

### Core Principles

1. **Dark-First Interface** – Designed for extended use with reduced eye strain; dark backgrounds with high-contrast accent colors
2. **Data Density** – Maximize information display while maintaining readability
3. **Progressive Disclosure** – Show summary data first, drill-down on demand via modals
4. **Consistent Visual Language** – Unified color coding for status, currency, and temporal data
5. **Fixed Viewport** – Optimized for 1920×1080 display with responsive scaling
6. **SharePoint Compatibility** – Self-contained HTML with inlined dependencies

### Design Tokens

All design values are centralized in CSS custom properties (variables) for consistency and maintainability.

---

## Color System

### Background Hierarchy

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-dark` | `#0a0f1a` | App-level background |
| `--bg-card` | `#111827` | Card and panel backgrounds |
| `--bg-card-hover` | `#1a2332` | Card hover states |
| `--bg-input` | `#0d1321` | Input fields, buttons |

### Border Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--border` | `#1e2d3d` | Default borders |
| `--border-focus` | `#3b82f6` | Focus state borders |

### Text Hierarchy

| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#f1f5f9` | Headings, primary content |
| `--text-secondary` | `#94a3b8` | Body text, labels |
| `--text-muted` | `#64748b` | Tertiary info, hints |

### Accent Colors (Semantic)

| Token | Value | Semantic Meaning |
|-------|-------|------------------|
| `--accent-blue` | `#3b82f6` | Primary action, links, Submitted status |
| `--accent-cyan` | `#06b6d4` | Currency values, highlights |
| `--accent-emerald` | `#10b981` | Success, Won status, positive metrics |
| `--accent-amber` | `#f59e0b` | Warning, Negotiating status |
| `--accent-rose` | `#f43f5e` | Danger, Lost status, negative metrics |
| `--accent-violet` | `#8b5cf6` | Committed status, version badges |

### Status Color Mapping

```
Won        → emerald (#10b981)
Lost       → rose (#f43f5e)
Submitted  → blue (#3b82f6)
Negotiating→ amber (#f59e0b)
Committed  → violet (#8b5cf6)
Prospecting→ cyan (#06b6d4)
RFP        → teal (#14b8a6)
Cancelled  → slate (#94a3b8)
```

### Color Application Rules

1. **Gradient Usage**: Reserve gradients for premium elements (titles, total values, Gantt bars)
2. **Opacity Backgrounds**: Use `rgba()` with 0.15-0.2 opacity for status badges
3. **Text on Dark**: Never use pure white (`#fff`); use `--text-primary` (#f1f5f9)
4. **Color Scheme Declaration**: Set `color-scheme: dark` on root for native dark mode support

---

## Typography

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
```

**Rationale**: System fonts for zero-download performance and native feel across platforms.

### Monospace Stack (Data Values)

```css
font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
```

**Usage**: Currency values, percentages, timestamps, record counts, version badges.

### Type Scale

| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| KPI Value | 28px | 700 | - | Large numeric displays |
| Modal Title | 20px | 700 | - | Primary headings |
| Section Title | 18px | 700 | - | Gantt title, sidebar header |
| Chart Title | 14px | 600 | - | Chart headers |
| Body Text | 13px | 400 | 1.5 | Default content |
| Label | 12px | 500 | - | Form labels, chart legends |
| Caption | 11px | 600 | - | Uppercase section headers |
| Badge | 10-11px | 600 | - | Status badges, counts |
| Micro | 9-10px | 500-700 | - | Tiny labels, markers |

### Typographic Rules

1. **Uppercase Labels**: Section headers use `text-transform: uppercase` with `letter-spacing: 0.5px`
2. **Monospace for Numbers**: All financial values, percentages, and counts use monospace
3. **Truncation**: Use `text-overflow: ellipsis` with `white-space: nowrap` for constrained widths
4. **Line Height**: Body text uses 1.5-1.6; compact UI elements use tighter spacing

---

## Spacing & Layout

### Spacing Scale (Base: 4px)

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon margins, tight gaps |
| sm | 6-8px | Checkbox items, compact padding |
| md | 12px | Standard padding, small gaps |
| lg | 16px | Card padding, section gaps |
| xl | 20-24px | Modal padding, large sections |

### Layout Grid

**Dashboard**: Single-column grid with fixed header
```css
.dashboard {
    display: grid;
    grid-template-columns: 1fr;
    height: 100%;
}
```

**KPI Grid**: Auto-fit responsive grid
```css
.kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
}
```

**Chart Grid**: 2-column layout with full-width top row
```css
.chart-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: auto repeat(2, minmax(280px, 1fr));
    gap: 20px;
}
```

### Aspect Ratio Constraint

```css
.aspect-ratio-wrapper {
    max-width: 1920px;
    max-height: 1080px;
}
```

Designed for 16:9 displays with letterboxing on wider viewports.

---

## Component Library

### Cards

**Base Card**
```css
.card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16-20px;
}
```

**KPI Card** – Features color-coded top border
```css
.kpi-card::before {
    content: '';
    height: 3px;
    background: linear-gradient(90deg, color1, color2);
}
```

**Chart Card** – Interactive with hover state
```css
.chart-card:hover {
    border-color: var(--accent-blue);
}
```

### Buttons

**Primary Button**
```css
.btn-primary {
    background: var(--accent-blue);
    border: none;
    color: white;
    padding: 10px 16px;
    border-radius: 8px;
    font-weight: 500;
}

.btn-primary:hover {
    background: #2563eb; /* Darker shade */
}
```

**Secondary Button**
```css
.btn-secondary {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-secondary);
}

.btn-secondary:hover {
    border-color: var(--text-muted);
    color: var(--text-primary);
}
```

**Icon Button**
```css
.icon-btn {
    width: 28-32px;
    height: 28-32px;
    border-radius: 6-8px;
    display: flex;
    align-items: center;
    justify-content: center;
}
```

### Badges

**Status Badge**
```css
.stage-badge {
    padding: 3-4px 8-10px;
    border-radius: 4-12px;
    font-size: 10-11px;
    font-weight: 600;
    background: rgba(color, 0.2);
    color: color;
}
```

**Count Badge**
```css
.filter-count {
    background: var(--accent-blue);
    color: white;
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 8px;
    min-width: 16px;
}
```

### Pills (Filter Tags)

```css
.filter-pill {
    padding: 4px 8px;
    background: rgba(59, 130, 246, 0.15);
    border-radius: 4px;
    font-size: 11px;
    color: var(--accent-blue);
}
```

---

## Interaction Patterns

### Hover States

1. **Cards**: Border color change to accent-blue
2. **Buttons**: Background color shift, optional translateY(-1px) lift
3. **Rows**: Background change to `--bg-card-hover`
4. **Links**: Color change to accent color

### Focus States

```css
input:focus, select:focus {
    outline: none;
    border-color: var(--accent-blue);
}
```

### Active/Selected States

```css
.item.active {
    background: var(--accent-blue);
    color: white;
}

/* Or with accent background */
.item.selected {
    background: rgba(59, 130, 246, 0.15);
    color: var(--accent-blue);
}
```

### Disabled States

```css
.element.disabled {
    opacity: 0.3-0.5;
    pointer-events: none;
    cursor: not-allowed;
}
```

### Clickable Indicators

- Interactive elements show `cursor: pointer`
- Hover reveals hidden action buttons (opacity: 0 → 1)
- Transform on hover: `translateY(-2px)` for cards, `scale(1.05-1.1)` for buttons

---

## Animation System

### Transition Defaults

```css
transition: all 0.15s;          /* Fast interactions */
transition: all 0.2s;           /* Standard transitions */
transition: all 0.2s ease;      /* With easing */
transition: transform 0.3s ease; /* Sidebar panels */
```

### Keyframe Animations

**Pulse (Active Filter Button)**
```css
@keyframes pulse {
    0%, 100% { box-shadow: 0 0 8px var(--accent-blue); }
    50% { box-shadow: 0 0 16px var(--accent-blue); }
}
```

**Spin (Loading)**
```css
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
```

**Modal Slide In**
```css
@keyframes modalSlideIn {
    from { opacity: 0; transform: scale(0.95) translateY(20px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
}
```

**Slide Down (Expanded Details)**
```css
@keyframes slideDown {
    from { opacity: 0; max-height: 0; }
    to { opacity: 1; max-height: 200px; }
}
```

### Animation Guidelines

1. **Duration**: Keep under 300ms for UI feedback
2. **Easing**: Use `ease` for natural motion
3. **Performance**: Animate `transform` and `opacity` (GPU-accelerated)
4. **will-change**: Add sparingly to frequently animated elements

---

## Responsive Design

### Breakpoints

| Breakpoint | Target |
|------------|--------|
| 1400px | Large desktop (2-column → 1-column charts) |
| 1024px | Tablet landscape |
| 768px | Tablet portrait / Mobile |

### Responsive Patterns

**Chart Grid Collapse**
```css
@media (max-width: 1400px) {
    .chart-grid { 
        grid-template-columns: 1fr; 
    }
}
```

**Sidebar Adaptation**
```css
@media (max-width: 768px) {
    .sidebar {
        width: 100%;
        max-width: 360px;
    }
}
```

**Touch-Friendly Sizing**
```css
@media (max-width: 768px) {
    .filter-actions-sticky .btn {
        padding: 14px 16px;
        font-size: 15px;
    }
}
```

### Orientation Handling

```css
@media (max-width: 1024px) and (orientation: landscape) {
    .chart-container { height: 220px; }
}

@media (max-width: 1024px) and (orientation: portrait) {
    .chart-container { height: 300px; }
}
```

---

## Accessibility

### Color Contrast

- Primary text on dark: `#f1f5f9` on `#0a0f1a` = **12.6:1** ✓
- Secondary text: `#94a3b8` on `#111827` = **6.2:1** ✓
- Muted text: `#64748b` on `#111827` = **4.2:1** (decorative only)

### Touch Targets

- Minimum size: 28px × 28px for icon buttons
- Recommended: 32-40px for primary interactive elements
- Mobile filters: 14px padding for comfortable tap

### Focus Visibility

```css
input:focus, button:focus {
    outline: none;
    border-color: var(--accent-blue);
}
```

### Text Size Prevention

```css
html {
    -webkit-text-size-adjust: 100%;
    -moz-text-size-adjust: 100%;
    text-size-adjust: 100%;
}
```

### Touch Behavior

```css
html {
    touch-action: pan-x pan-y;
    -webkit-overflow-scrolling: touch;
}

body.fullscreen-active {
    overscroll-behavior: none;
}
```

---

## Data Visualization

### Chart Colors Palette

```javascript
// Status-based chart colors
Won: 'rgba(16, 185, 129, 0.8)'      // Emerald
Negotiating: 'rgba(245, 158, 11, 0.8)' // Amber
Submitted: 'rgba(59, 130, 246, 0.8)'   // Blue
```

### Chart Card Dimensions

```css
.chart-container {
    height: 260px;
    min-height: 200px;
}
```

### Gantt Bar Styling

```css
.gantt-bar {
    height: 28px;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.gantt-bar::before {
    /* Glossy highlight effect */
    background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%);
}
```

### Today Marker (Timeline)

```css
.gantt-today-marker {
    width: 2px;
    background: linear-gradient(180deg, #f43f5e, transparent);
}
```

### Value Formatting

- **Currency**: `$X.XX` format with comma thousands separators
- **Percentages**: Two decimal places for precision
- **Font**: Monospace for all numeric values
- **Color**: `--accent-cyan` for currency highlights

---

## Modal & Overlay Patterns

### Overlay Background

```css
.modal-overlay {
    background: rgba(0, 0, 0, 0.6-0.85);
    backdrop-filter: blur(4px);
    z-index: 999-2000;
}
```

### Modal Container

```css
.modal {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    max-width: 700-1400px;
    max-height: 90vh;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
    animation: modalSlideIn 0.2s ease;
}
```

### Z-Index Hierarchy

| Layer | Z-Index | Elements |
|-------|---------|----------|
| Base | 1 | Dropdowns |
| Header | 100 | Fixed header |
| Sidebar | 999-1000 | Filter panel |
| Modal | 2000 | Detail modals |
| Dropdown in Modal | 99999 | Nested dropdowns |

### Close Button Pattern

```css
.modal-close {
    width: 32-36px;
    height: 32-36px;
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 8px;
}

.modal-close:hover {
    background: var(--accent-rose);
    border-color: var(--accent-rose);
    color: white;
}
```

### Scroll Lock

```css
body.modal-open {
    overflow: hidden !important;
}
```

---

## Form Controls

### Input Fields

```css
input[type="text"], input[type="number"], input[type="date"], select {
    padding: 10px 12px;
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 13px;
}
```

### Date Picker (Dark Mode)

```css
input[type="date"] {
    color-scheme: dark;
}

input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(0.8) brightness(1.2);
}
```

### Checkbox Styling

```css
input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: var(--accent-blue);
}
```

### Search Input with Icon

```css
.search-wrapper {
    position: relative;
}

.search-wrapper::before {
    content: '🔍';
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0.5;
}

.search-wrapper input {
    padding-left: 32px;
}
```

### Multi-Select Dropdown

```css
.multiselect-trigger {
    min-height: 32px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.multiselect-menu {
    max-height: 250px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
}
```

---

## Table Design

### Base Table

```css
table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

th {
    background: var(--bg-dark);
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
}

td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
}

tr:hover td {
    background: var(--bg-card-hover);
}
```

### Sortable Headers

```css
th {
    cursor: pointer;
}

th:hover {
    color: var(--accent-blue);
}

th.sorted {
    color: var(--accent-cyan);
}
```

### Compact Tables

```css
.compact-table th,
.compact-table td {
    padding: 6px 8px;
    font-size: 11px;
}
```

### Column Types

- **Name columns**: Max-width with ellipsis truncation
- **Currency columns**: Right-aligned, monospace, cyan accent
- **Status columns**: Badge component
- **Date columns**: Monospace
- **Action columns**: Link buttons with hover effects

---

## Navigation & Filtering

### Sidebar (Slide-out Panel)

```css
.sidebar {
    position: fixed;
    right: 0;
    width: 360px;
    height: 100vh;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    box-shadow: -4px 0 24px rgba(0,0,0,0.4);
}

.sidebar.open {
    transform: translateX(0);
}
```

### Filter Section Pattern

```css
.filter-section-header {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    cursor: pointer;
}
```

### Date Preset Buttons

```css
.date-presets {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
}

.date-preset-btn.active {
    background: var(--accent-blue);
    border-color: var(--accent-blue);
    color: white;
}
```

### Sticky Filter Actions

```css
.filter-actions-sticky {
    position: sticky;
    top: 0;
    background: var(--bg-card);
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    z-index: 10;
}
```

---

## Performance Guidelines

### CSS Optimization

1. **Avoid expensive selectors**: Use class selectors over complex descendants
2. **Minimize repaints**: Animate `transform` and `opacity` only
3. **Use `will-change` sparingly**: Only for frequently animated elements
4. **Hardware acceleration**: Add `transform: translateZ(0)` for heavy modals

### Scroll Performance

```css
.scrollable-container {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
}
```

### Image-Free Design

This dashboard uses zero external images:
- Icons: Custom SVG symbols with light blue ambient lighting
- Backgrounds: CSS gradients
- Charts: Canvas-based (Chart.js)

### Scrollbar Styling

```css
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: var(--bg-dark);
}

::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
}
```

---

## Quick Reference

### File Structure

```
PWLCDashboard/
├── template/
│   └── pwlc_dashboard_v2.html  ← Single-file app with embedded CSS/JS
├── outputs/
│   └── Quanta West Estimating Dashboard.html  ← Built output
├── lib/
│   ├── chart.min.js            ← Chart.js (inlined during build)
│   ├── papaparse.min.js        ← CSV parser (inlined)
│   └── xlsx.full.min.js        ← Excel export (inlined)
└── design_rules.md             ← This document
```

### Key CSS Variables Summary

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

### Component Checklist

- [ ] Uses CSS variables for all colors
- [ ] Border radius: 4-16px scale
- [ ] Transitions: 0.15-0.2s default
- [ ] Hover state defined
- [ ] Focus state for interactives
- [ ] Monospace for numeric values
- [ ] Uppercase for section labels
- [ ] Touch target ≥ 28px

---

*Document Version: 1.0*  
*Last Updated: December 2024*  
*Maintained by: Engineering Team*

