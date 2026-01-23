# UX/UI Design Rules & Patterns

This document defines the user experience and interface design patterns for the dashboard application. These rules are technology-agnostic and can be applied to any data visualization dashboard.

---

## Table of Contents

1. [Design System Foundation](#1-design-system-foundation)
2. [Modal System](#2-modal-system)
3. [Filtering Architecture](#3-filtering-architecture)
4. [Export Functionality](#4-export-functionality)
5. [Interactive Elements](#5-interactive-elements)
6. [Data Visualization](#6-data-visualization)
7. [Navigation & Layout](#7-navigation--layout)
8. [Responsive Behavior](#8-responsive-behavior)
9. [State Management](#9-state-management)
10. [Accessibility & Feedback](#10-accessibility--feedback)

---

## 1. Design System Foundation

### 1.1 Color Palette

The interface uses a **dark theme** with semantic color assignments:

| Token | Purpose | Usage |
|-------|---------|-------|
| `bg-dark` | Primary background | Main canvas, page background |
| `bg-card` | Card/container background | Cards, modals, panels |
| `bg-card-hover` | Hover state background | Interactive row hover |
| `bg-input` | Input field background | Form fields, dropdowns |
| `border` | Default borders | Cards, dividers, inputs |
| `border-focus` | Focus state borders | Active input fields |
| `text-primary` | Primary text | Headlines, key values |
| `text-secondary` | Secondary text | Descriptions, labels |
| `text-muted` | Tertiary text | Hints, timestamps, metadata |

**Accent Colors (Semantic)**:
- **Blue** (`accent-blue`): Primary actions, links, selected states
- **Cyan** (`accent-cyan`): Numeric values, highlights, data emphasis
- **Emerald** (`accent-emerald`): Positive outcomes (won, success, export)
- **Amber** (`accent-amber`): Warning, in-progress, pending states
- **Rose** (`accent-rose`): Negative outcomes, errors, close buttons
- **Violet** (`accent-violet`): Special categories, metadata, versions

### 1.2 Typography Hierarchy

```
Primary Headlines:     18-20px, Font Weight 700, text-primary
Section Headers:       14-16px, Font Weight 600, text-primary
Body Text:            13-14px, Font Weight 400, text-primary
Labels/Captions:      10-12px, Font Weight 500-600, text-muted, UPPERCASE
Numeric/Data Values:  Monospace font family, accent-cyan for currency
```

**Font Stack**: System fonts prioritized for performance:
- Primary: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif`
- Monospace (data): `'Consolas', 'Monaco', 'Courier New', monospace`

### 1.3 Spacing & Sizing

- **Base unit**: 4px
- **Standard padding**: 12px, 16px, 20px, 24px
- **Border radius**: 4px (small), 6px (medium), 8px (inputs), 12-16px (cards/modals)
- **Icon sizes**: 14px (inline), 18px (buttons), 24px (feature icons)

---

## 2. Modal System

The dashboard implements a **multi-tier modal hierarchy** with distinct purposes.

### 2.1 Modal Types

#### Record Detail Modal (Individual Item)
**Purpose**: Display comprehensive information about a single record.

**Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                      │
│ ┌─────────────────────┐ ┌──────────────┐ ┌───────────────┐ │
│ │ Title (Primary)     │ │ Key Value    │ │ Close Button  │ │
│ │ Subtitle (Secondary)│ │ (Currency)   │ │     ×         │ │
│ └─────────────────────┘ └──────────────┘ └───────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ BODY (Scrollable)                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Section: Details                                        │ │
│ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │ │
│ │ │ Label       │ │ Label       │ │ Label       │        │ │
│ │ │ Value       │ │ Value       │ │ Value       │        │ │
│ │ └─────────────┘ └─────────────┘ └─────────────┘        │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Section: Description (expandable text area)             │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Section: External Links                                 │ │
│ │ [Link Button 1] [Link Button 2]                         │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Design Rules**:
- Maximum width: 700px
- Maximum height: 90vh
- Body section scrolls independently
- Grid layout for detail fields (3 columns default)
- Sections are visually separated with titles
- External links appear as styled buttons with icons
- Links that are unavailable show as disabled (reduced opacity, no pointer events)
- Include "Last Modified" timestamp for audit purposes

#### List/Data Modal (Collection View)
**Purpose**: Display and interact with a filtered collection of records.

**Structure**:
```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER                                                              │
│ ┌──────────────┐ ┌─────────────────────┐ ┌────────┐ ┌───────────┐  │
│ │ Icon (Color) │ │ Title               │ │  KPIs  │ │ [Export]  │  │
│ │              │ │ Subtitle            │ │  Row   │ │    ×      │  │
│ └──────────────┘ └─────────────────────┘ └────────┘ └───────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│ CONTROLS BAR                                                        │
│ [Sort By ▼] [Group By ▼] [Search...........................]       │
├─────────────────────────────────────────────────────────────────────┤
│ TABLE BODY (Scrollable)                                             │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Column Headers (Sortable - click to sort)                       │ │
│ ├─────────────────────────────────────────────────────────────────┤ │
│ │ Data Row 1                                                      │ │
│ │ Data Row 2                                                      │ │
│ │ Data Row 3 (hover highlights entire row)                        │ │
│ │ ...                                                             │ │
│ └─────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│ INSIGHTS FOOTER                                                     │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐           │
│ │ Insight 1 │ │ Insight 2 │ │ Insight 3 │ │ Insight 4 │           │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

**Design Rules**:
- Maximum width: 1400px
- Maximum height: 90vh
- Header shows contextual icon with color-coded background
- KPIs displayed inline in header (3-4 metrics max)
- Controls bar is sticky and always visible
- Table headers are sticky during scroll
- Column headers are clickable for sorting (show ↕ indicator)
- Table body is independently scrollable
- Insights footer provides AI-generated summary metrics
- Export button prominently placed in header

#### Calendar Modal (Temporal View)
**Purpose**: Display records organized by date in a calendar format.

**Design Rules**:
- Full calendar grid with day cells
- Each day shows event count badges
- Color-coded event types with legend
- Toggle between grid and list view
- Event type filters as checkboxes
- Month navigation (Previous/Next)
- Click on day expands to show all events
- Each event clickable to open Record Detail Modal

#### Filter/Sidebar Modal
**Purpose**: Global filter controls for the entire dashboard.

**Design Rules**:
- Slides in from right edge (360px width)
- Dark overlay covers main content
- Header shows filter context and close button
- Collapsible sections for each filter category
- Sticky action buttons at bottom (Apply, Reset)
- Shows active filter count badge
- Sections can be collapsed/expanded independently
- Search-within-filter for large option lists

### 2.2 Modal Behavior Rules

| Behavior | Implementation |
|----------|----------------|
| **Opening Animation** | Scale from 0.95 + translateY(20px) to normal, 200ms ease |
| **Backdrop** | Semi-transparent dark (rgba 0,0,0, 0.75-0.85) with blur(4px) |
| **Close Triggers** | Click outside, × button, Escape key |
| **Body Scroll Lock** | Add `modal-open` class to body to prevent background scroll |
| **Focus Trap** | Focus should remain within modal while open |
| **Z-Index Hierarchy** | Sidebar: 1000, Detail Modals: 2000, Tooltips: 3000 |

### 2.3 Modal Nesting

Modals can spawn child modals:
- Calendar Modal → Record Detail Modal (clicking an event)
- List Modal → Record Detail Modal (clicking a row)
- Chart click → List Modal → Record Detail Modal

**Rule**: When a child modal opens from a parent modal, the parent remains visible but dimmed. Closing the child returns focus to the parent.

---

## 3. Filtering Architecture

### 3.1 Filter Hierarchy

The dashboard implements a **two-tier filtering system**:

#### Global Filters (Sidebar)
Apply to the entire dashboard and all visualizations:
- Date Range (with presets)
- Record Status/Stage
- Category/Account
- Geographic Region
- Work Type/Category
- Value Range (Min/Max)

#### Local Filters (Per-Chart)
Apply only to a specific visualization:
- Chart-specific stage filter
- Chart-specific region filter
- Chart-specific account filter
- Chart-specific value range
- Chart-specific date range

### 3.2 Filter UI Patterns

#### Date Range Filter
```
┌─────────────────────────────────────────────────┐
│ Date Presets (2-column grid)                    │
│ [This Week] [Next Week] [This Month] [Next Mo.] │
│ [This Quarter] [Next Quarter] [YTD] [All Time]  │
├─────────────────────────────────────────────────┤
│ Custom Range                                    │
│ From: [Date Picker]  To: [Date Picker]          │
└─────────────────────────────────────────────────┘
```

**Behavior**:
- Preset buttons are toggle-style (one active at a time)
- Active preset shows filled background (accent-blue)
- Custom date inputs clear preset selection
- Preset selection updates custom inputs

#### Checkbox Multi-Select Filter
```
┌─────────────────────────────────────────┐
│ [Select All] [Clear All]                │
├─────────────────────────────────────────┤
│ ☑ Option A                              │
│ ☑ Option B                              │
│ ☐ Option C (unchecked)                  │
│ ☑ Option D                              │
└─────────────────────────────────────────┘
```

**Behavior**:
- All options checked by default (unless specified otherwise)
- Bulk actions (Select All / Clear All) at top
- Scrollable options list for long lists
- Count indicator shows selected/total

#### Dropdown Multi-Select Filter
```
┌─────────────────────────────────────────┐
│ [All Accounts ▼]                        │
└─────────────────────────────────────────┘
         │
         ▼ (Expanded)
┌─────────────────────────────────────────┐
│ [Search..............................]  │
├─────────────────────────────────────────┤
│ [All] [None]                            │
├─────────────────────────────────────────┤
│ ☑ Account Name A            (42)        │
│ ☑ Account Name B            (28)        │
│ ☐ Account Name C            (15)        │
│ ☑ Account Name D            (9)         │
└─────────────────────────────────────────┘
```

**Behavior**:
- Collapsed state shows summary ("All Accounts" or "3 Accounts")
- Search field filters visible options
- Count badges show record count per option
- Clicking outside closes dropdown

#### Value Range Filter
```
┌─────────────────────────────────────────┐
│ Min ($): [________]  Max ($): [________]│
├─────────────────────────────────────────┤
│ [< $100K] [$100K-$500K] [$500K-$1M]     │
│ [$1M-$5M] [$5M+]                        │
└─────────────────────────────────────────┘
```

**Behavior**:
- Free-form number inputs for custom range
- Preset buttons populate both inputs
- Empty max = no upper limit
- Invalid ranges prevented (min > max)

### 3.3 Filter State Persistence

| Scope | Storage | Duration |
|-------|---------|----------|
| Session filters | sessionStorage | Until tab closes |
| Default filters | Configuration | Permanent |
| Filter version | Embedded in state | Invalidates on version change |

**State Invalidation**:
- Increment `FILTER_DEFAULTS_VERSION` when defaults change
- Saved state with outdated version is discarded
- User sees fresh defaults on next load

### 3.4 Filter Actions

#### Apply Button
- Primary action button (accent-blue)
- Triggers filter recalculation
- Updates all affected visualizations
- Shows loading indicator if >500ms

#### Reset Button
- Secondary/ghost button style
- Clears all filters to defaults
- Distinct from "Clear All" (which deselects all options)

#### View Button
- Opens List Modal with currently filtered data
- Allows drilling into filtered results

---

## 4. Export Functionality

### 4.1 Export Locations

Export buttons appear in these contexts:

| Location | Format | Scope |
|----------|--------|-------|
| Dashboard Header | CSV | Full source dataset |
| List Modal Header | XLSX | Currently displayed/filtered records |
| Individual Charts | (via modal) | Chart-specific data |

### 4.2 Export Button Design

```
┌─────────────────────────────────────────────┐
│ [↓ Download Icon] Export                    │
└─────────────────────────────────────────────┘
```

**Styling**:
- Background: accent-emerald (success color)
- Icon: Download arrow
- Hover: Darken background, slight Y translation (-1px)
- Font weight: 500 (medium)

### 4.3 Export Data Rules

#### XLSX Export Features
- Headers formatted as bold
- Currency columns formatted as currency
- Date columns formatted as dates
- Hyperlinks preserved (Salesforce, SharePoint links)
- Column widths auto-fit to content
- Sheet name matches export context

#### CSV Export
- UTF-8 encoding
- Comma-delimited
- Quotes around fields containing commas
- Headers included
- Filename includes timestamp

### 4.4 Export Filename Convention

```
[Context]_[YYYY-MM-DD]_[HH-MM-SS].[ext]

Examples:
- dashboard_data_2025-01-02_14-30-45.csv
- throughput_report_2025-01-02_14-30-45.xlsx
- won_projects_2025-01-02_14-30-45.xlsx
```

---

## 5. Interactive Elements

### 5.1 Clickable KPI Cards

```
┌─────────────────────────────────────────┐
│ Label (small, muted)                    │
│ VALUE (large, accent color)             │
│ Subtitle (context, muted)               │
│ "Click for details" (hover hint)        │
└─────────────────────────────────────────┘
```

**Interaction States**:
- Default: Border color matches card accent
- Hover: Background lightens, cursor pointer, hint appears
- Active/Selected: Elevated shadow, brighter border
- Click: Opens relevant List Modal

**Color Coding by KPI Type**:
- Total/Count: Blue
- Success/Won: Emerald
- Warning/Pending: Amber
- Error/Lost: Rose
- Special/Unique: Violet

### 5.2 Chart Interactions

#### Clickable Chart Segments
- Hover: Tooltip shows segment value
- Click: Opens List Modal filtered to that segment
- Clicked segment label passed as filter parameter

#### Chart Action Buttons
Located in chart header, right-aligned:
```
┌─────────────────────────────────────────────────────┐
│ Chart Title        [📅] [✓] [⊞] [⛶]                │
└─────────────────────────────────────────────────────┘
```

| Icon | Purpose | Action |
|------|---------|--------|
| 📅 | Calendar | Opens calendar modal for this chart's data |
| ✓ | QA/Audit | Opens quality assurance view |
| ⊞ | Expand | Opens List Modal with all data |
| ⛶ | Fullscreen | Enters component fullscreen mode |

### 5.3 Table Row Interactions

```
Default State:     | Data | Data | Data | [SF] [SP] |
Hover State:       | Data | Data | Data | [SF] [SP] |  ← bg-card-hover
Click Action:      Opens Record Detail Modal
```

**Link Buttons in Tables**:
- Abbreviated labels ("SF" for Salesforce, "SP" for SharePoint)
- Accent color background (subtle)
- Disabled state: muted color, cursor not-allowed
- Prevent row click when clicking links

### 5.4 Collapsible Sections

```
┌─────────────────────────────────────────┐
│ ▼ Section Title                     [+] │
├─────────────────────────────────────────┤
│ Section content (visible when expanded) │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ▶ Section Title                     [+] │  ← Collapsed (content hidden)
└─────────────────────────────────────────┘
```

**Behavior**:
- Click header to toggle
- Rotation animation on arrow (90deg)
- Content fade/slide animation
- Remember collapsed state during session

### 5.5 Tooltips

**Hover Tooltip (Charts/Gantt)**:
```
┌─────────────────────────────────────────┐
│ HEADER                                  │
│ Title              Value                │
├─────────────────────────────────────────┤
│ Label: Value                            │
│ Label: Value                            │
│ Label: Value                            │
├─────────────────────────────────────────┤
│ "Click for full details" (hint)         │
└─────────────────────────────────────────┘
```

**Design Rules**:
- Positioned near cursor, avoiding screen edges
- Dark background with slight blur
- Soft shadow for depth
- Appears after ~200ms delay
- Disappears immediately on mouseout
- Z-index above all other elements

---

## 6. Data Visualization

### 6.1 Chart Types & Usage

| Chart Type | Use Case | Interaction |
|------------|----------|-------------|
| Bar Chart (Stacked) | Time-series throughput | Click bar segment → filtered modal |
| Horizontal Bar | Top N comparison | Click bar → filtered modal |
| Doughnut/Pie | Proportion breakdown | Click segment → filtered modal |
| Gantt Timeline | Project scheduling | Hover tooltip, click → detail modal |
| Calendar Grid | Event distribution | Click day → event list |

### 6.2 Gantt Chart Specific Rules

**Structure**:
```
┌─────────────────────────────────────────────────────────────────┐
│ TOOLBAR                                                         │
│ [🔍 Search] [Sort ▼] [Stage Filters] [⊞] [⛶]                   │
├─────────────┬───────────────────────────────────────────────────┤
│ LEFT PANEL  │ TIMELINE PANEL                                    │
│ (Project    │ ──────────────────────────────────────────────    │
│  List)      │ Jan   Feb   Mar   Apr   May   Jun   Jul          │
│             │ ██████████████████████████████████████████████    │
│ Project A   │ ════════════                                      │
│ Project B   │      ════════════════════                         │
│ Project C   │           ═══════════════════════                 │
├─────────────┴───────────────────────────────────────────────────┤
│ DATE RANGE SLIDER                                               │
│ ○───────────────────────●──────────────────────○                │
│ [Start Date]                            [End Date]              │
└─────────────────────────────────────────────────────────────────┘
```

**Interaction Rules**:
- Left panel collapsible (toggle arrow)
- Bars colored by stage/status
- Hover bar → tooltip with details
- Click bar → Record Detail Modal
- Drag range slider → updates visible window
- Date inputs sync with slider

### 6.3 Color Coding by Status

Define consistent colors across all visualizations:

| Status Category | Color | CSS Class |
|-----------------|-------|-----------|
| Won/Success | Emerald (#10b981) | `.won` |
| Lost/Failed | Rose (#f43f5e) | `.lost` |
| Submitted/Pending | Blue (#3b82f6) | `.submitted`, `.pending` |
| Negotiating | Amber (#f59e0b) | `.negotiating` |
| Prospecting | Cyan (#06b6d4) | `.prospecting` |
| Committed | Violet (#8b5cf6) | `.committed` |
| Cancelled/No Action | Slate (#94a3b8) | `.cancelled` |
| Other/Default | Light Slate | `.other` |

**Badge Styling**:
```css
.stage-badge {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    background: rgba([color], 0.2);
    color: [color];
}
```

---

## 7. Navigation & Layout

### 7.1 Dashboard Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER BAR (fixed)                                                  │
│ [Title] ─────────────────────────── [Filters] [Fullscreen] [Export] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ KPI CARDS ROW                                                       │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                    │
│ │ KPI │ │ KPI │ │ KPI │ │ KPI │ │ KPI │ │ KPI │                    │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                    │
│                                                                     │
│ CHART GRID (2x2 or responsive)                                      │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ WIDE CHART (Throughput - spans full width)                   │   │
│ └──────────────────────────────────────────────────────────────┘   │
│ ┌───────────────────────────┐ ┌───────────────────────────┐        │
│ │ CHART A                   │ │ CHART B                   │        │
│ └───────────────────────────┘ └───────────────────────────┘        │
│ ┌───────────────────────────┐ ┌───────────────────────────┐        │
│ │ CHART C                   │ │ CHART D                   │        │
│ └───────────────────────────┘ └───────────────────────────┘        │
│                                                                     │
│ FEATURED COMPONENT (Gantt - spans full width)                       │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │                                                              │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Header Bar Components

| Component | Position | Function |
|-----------|----------|----------|
| Dashboard Title | Left | Static branding |
| Filters Button | Right | Opens filter sidebar, shows count badge |
| Fullscreen Button | Right | Toggle fullscreen mode |
| Source Data Button | Right | Download source CSV |

### 7.3 Fullscreen Modes

Two levels of fullscreen:
1. **Dashboard Fullscreen**: Entire dashboard fills viewport
2. **Component Fullscreen**: Single chart/visualization fills viewport

**Controls**:
- F11 or button → Dashboard fullscreen
- Component fullscreen button → That component only
- ESC → Exit fullscreen

---

## 8. Responsive Behavior

### 8.1 Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Desktop | > 1024px | Full 2-column chart grid |
| Tablet Landscape | 769-1024px | Reduced gaps, sidebar narrower |
| Tablet Portrait | 768px | Single column charts |
| Mobile | < 768px | Stacked layout, full-width sidebar |

### 8.2 Responsive Adaptations

#### Sidebar
- Desktop: Fixed 360px width
- Tablet: 320px width
- Mobile: 100% width (max 360px)

#### Charts
- Desktop: Fixed height (260px)
- Tablet Landscape: Reduced height (220px)
- Tablet Portrait: Increased height (300px), single column
- Mobile: Increased height (280px)

#### Tables in Modals
- Horizontal scroll on narrow viewports
- Critical columns remain visible
- Action column stays pinned right

### 8.3 Touch Considerations

- Minimum touch target: 44px × 44px
- Swipe gestures for sidebar (open/close)
- Tap-and-hold for tooltips (no hover)
- Scroll momentum preserved

---

## 9. State Management

### 9.1 Application State Structure

```javascript
{
    // Global filter state
    filters: {
        dateRange: { start: Date, end: Date },
        stages: string[],
        accounts: string[],
        regions: string[],
        valueRange: { min: number, max: number }
    },
    
    // Per-chart local filter state
    chartFilters: {
        throughput: { ... },
        gantt: { ... }
    },
    
    // UI state
    ui: {
        sidebarOpen: boolean,
        expandedSections: string[],
        activeModal: string | null,
        fullscreenElement: string | null
    },
    
    // Session metadata
    meta: {
        filterDefaultsVersion: number,
        savedAt: timestamp
    }
}
```

### 9.2 State Persistence Rules

| State Type | Storage | Lifetime |
|------------|---------|----------|
| Filter selections | sessionStorage | Browser session |
| UI preferences | sessionStorage | Browser session |
| Collapsed sections | sessionStorage | Browser session |
| Data cache | Memory only | Page load |

### 9.3 State Synchronization

When filters change:
1. Update global filter state
2. Recalculate filtered dataset
3. Update all KPI values
4. Re-render all charts
5. Update filter count badge
6. Persist to sessionStorage

### 9.4 Version-Based Cache Invalidation

```javascript
// Check saved state version
if (savedState.filterDefaultsVersion !== CURRENT_VERSION) {
    clearSavedState();
    applyDefaults();
}
```

---

## 10. Accessibility & Feedback

### 10.1 Loading States

**Chart Loading**:
- Skeleton placeholder (pulsing animation)
- Minimum 200ms display to prevent flicker

**Data Processing**:
- Debounce search inputs (150ms)
- Show spinner for operations > 500ms

### 10.2 Empty States

When no data matches filters:
```
┌─────────────────────────────────────────┐
│                                         │
│               📊 (icon)                 │
│                                         │
│        No matching records              │
│                                         │
│   Try adjusting your filters or         │
│   selecting a different date range.     │
│                                         │
│          [Reset Filters]                │
│                                         │
└─────────────────────────────────────────┘
```

### 10.3 Error States

Display errors inline with affected component:
- Red border accent
- Error icon + message
- Retry action if applicable

### 10.4 Success Feedback

- Export complete: Brief toast notification
- Filter applied: Count badge updates
- Action complete: Visual state change

### 10.5 Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move between interactive elements |
| Enter | Activate focused element |
| Escape | Close modal/dropdown |
| Arrow keys | Navigate within dropdowns/lists |
| F11 | Toggle fullscreen |

### 10.6 ARIA Considerations

- Modals: `role="dialog"`, `aria-modal="true"`
- Buttons: Clear `aria-label` for icon-only buttons
- Tables: Proper `<thead>`, `<tbody>` structure
- Live regions: Announce filter changes to screen readers
- Focus management: Return focus to trigger after modal close

---

## Appendix: Component Checklist

When implementing a new dashboard component, ensure:

- [ ] Consistent color usage from design tokens
- [ ] Hover/active states defined
- [ ] Click handlers open appropriate modal
- [ ] Export functionality included
- [ ] Filter-aware (respects global + local filters)
- [ ] Responsive at all breakpoints
- [ ] Loading/empty/error states handled
- [ ] Keyboard accessible
- [ ] Tooltips for data points
- [ ] Action buttons in header (expand, fullscreen, etc.)

---

*Document Version: 1.0*
*Last Updated: January 2, 2026*

