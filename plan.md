# Filter System Overhaul - Implementation Plan

## Phase 1: Performance Optimizations

### 1.1 Single-Pass Aggregation
Create a unified `computeAllMetrics()` function that computes KPIs, monthly aggregations, and explorer data in ONE pass through filtered data.

**File: `template/js/filters.js`**
- Add new `computeAllMetrics(data)` function
- Cache result in `cachedMetrics` variable
- Modify `applyFilters()` to call this once

**File: `template/js/init.js`**
- Update `updateDashboard()` to use cached metrics
- Remove redundant iteration calls

**File: `template/js/kpi.js`**
- Modify `calculateKPIs()` to use cached metrics
- Remove `calculatePriorPeriodKPIs()` from hot path (defer or cache)

### 1.2 Chart Update vs Recreate
Modify chart rendering to update existing charts instead of destroy/recreate.

**File: `template/js/charts/monthly-trend.js`**
- Check if `charts.monthly` exists
- If yes: update data and call `chart.update('none')`
- If no: create new chart

**File: `template/js/charts/explorer.js`**
- Same pattern for explorer chart

---

## Phase 2: Filter UI Improvements

### 2.1 Dept Category → Inline Chip Toggles
Replace dropdown with always-visible toggle chips (only 6 items).

**File: `template/html/filters.html`**
```html
<!-- Replace multiselect with: -->
<div class="filter-chip">
    <label>Dept Cat</label>
    <div class="chip-toggles" id="deptCategoryChips"></div>
</div>
```

**File: `template/css/layout.css`**
- Add `.chip-toggles` container styles
- Add `.chip-toggle` button styles (similar to period-type-btn)

**File: `template/js/filters.js`**
- Add `setupDeptCategoryChips()` function
- Populate chips dynamically from data
- Handle click to toggle filter

### 2.2 Job Type → Pill Toggles
Replace dropdown with 3-button toggle (All/GA/IN).

**File: `template/html/filters.html`**
```html
<!-- Replace select with: -->
<div class="filter-chip">
    <label>Type</label>
    <div class="pill-toggle" id="jobTypeToggle">
        <button class="pill-btn active" data-value="all">All</button>
        <button class="pill-btn" data-value="GA">G&A</button>
        <button class="pill-btn" data-value="IN">Indirect</button>
    </div>
</div>
```

**File: `template/js/init.js`**
- Add job type toggle click handlers

### 2.3 Improved Multiselect Display
Show "X of Y" counts and fix positioning.

**File: `template/js/multiselect.js`**
- Modify `updateMultiselectTriggers()` to show "X of Y"
- Store total counts when populating options

**File: `template/js/filters.js`**
- Pass total counts to trigger update

**File: `template/css/layout.css`**
- Fix dropdown positioning (max-height, flip logic if needed)

### 2.4 Better Date Presets
Make presets more prominent and show active state clearly.

**File: `template/css/layout.css`**
- Increase preset button size
- Better active state styling

---

## Phase 3: Progressive Rendering

### 3.1 Deferred Updates
Use requestAnimationFrame for chart updates.

**File: `template/js/init.js`**
```javascript
function updateDashboard() {
    // Immediate: KPIs (fast feedback)
    updateKPIs(cachedMetrics.kpis);

    // Deferred: Charts
    requestAnimationFrame(() => {
        renderMonthlyTrend();
        renderExplorerChart();
    });
}
```

---

## Implementation Order

1. **filters.js** - Add `computeAllMetrics()` and caching
2. **init.js** - Update `updateDashboard()` to use cached metrics
3. **monthly-trend.js** - Chart update vs recreate
4. **explorer.js** - Chart update vs recreate
5. **filters.html** - Dept Category chips, Job Type toggles
6. **layout.css** - New component styles
7. **multiselect.js** - Better count display

---

## Files to Modify

| File | Changes |
|------|---------|
| `template/js/filters.js` | Add computeAllMetrics(), caching, dept cat chips |
| `template/js/init.js` | Use cached metrics, progressive rendering |
| `template/js/kpi.js` | Use cached metrics |
| `template/js/charts/monthly-trend.js` | Update vs recreate |
| `template/js/charts/explorer.js` | Update vs recreate |
| `template/js/multiselect.js` | "X of Y" counts |
| `template/html/filters.html` | Dept cat chips, job type toggles |
| `template/css/layout.css` | New component styles |

---

## Expected Results

- Filter response: **500ms+ → <200ms**
- No UI blocking during filter changes
- Clearer filter state visibility
- Fewer clicks for common filters (dept category, job type)
