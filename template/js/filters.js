// === FILTER LOGIC (config-driven) ===

// Cached metrics for performance
let cachedMetrics = null;

// Filter dimension totals for display
let filterTotals = {};

// Debounce utility for auto-apply filters
let filterDebounceTimer = null;
function debouncedApplyFilters() {
    if (filterDebounceTimer) clearTimeout(filterDebounceTimer);
    showFilterLoading(true);
    filterDebounceTimer = setTimeout(() => {
        applyFilters();
        showFilterLoading(false);
    }, 150);
}

function showFilterLoading(show) {
    const status = document.getElementById('filterStatus');
    if (status) {
        status.classList.toggle('loading', show);
    }
}

function applyDatePreset(preset) {
    const today = new Date();
    let start, end;

    switch (preset) {
        case 'ytd':
            start = new Date(today.getFullYear(), 0, 1);
            end = today;
            break;
        case 'qtd':
            const quarter = Math.floor(today.getMonth() / 3);
            start = new Date(today.getFullYear(), quarter * 3, 1);
            end = today;
            break;
        case 'mtd':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = today;
            break;
        case 'l12m':
            start = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
            end = today;
            break;
        case 'l30d':
            start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            end = today;
            break;
        default:
            return;
    }

    const formatDate = d => d.toISOString().split('T')[0];
    filters.startDate = formatDate(start);
    filters.endDate = formatDate(end);

    document.getElementById('startDate').value = filters.startDate;
    document.getElementById('endDate').value = filters.endDate;

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === preset);
    });

    debouncedApplyFilters();
}

// Single-pass aggregation for all metrics
function computeAllMetrics(data) {
    const metrics = {
        gross: 0, alloc: 0, gaTotal: 0, inTotal: 0,
        months: new Set(), grossRecords: 0, allocRecords: 0,
        monthlyAgg: {},
        byDivision: {}, byDeptCategory: {}, byDepartment: {},
        byDocType: {}, byCostType: {}
    };

    const len = data.length;
    for (let i = 0; i < len; i++) {
        const row = data[i];
        const amt = row['Actual Amount'] || 0;
        const ct = String(row['Cost Type'] || '');
        const isAlloc = ct.startsWith('693');
        const glDate = row['G/L Date'] || '';
        const month = glDate.substring(0, 7);
        const jobType = row['Job Type'];
        const divName = row['Division Name'] || 'Unknown';
        const deptCat = row['Dept_Category'] || 'Other';
        const dept = row['Department'] || 'Unknown';
        const docType = row['Document Type'] || 'Unknown';
        const costDesc = row['Description'] || 'Unknown';

        if (isAlloc) { metrics.alloc += amt; metrics.allocRecords++; }
        else { metrics.gross += amt; metrics.grossRecords++; }

        if (jobType === 'GA') metrics.gaTotal += amt;
        else if (jobType === 'IN') metrics.inTotal += amt;

        if (month) metrics.months.add(month);

        if (month) {
            if (!metrics.monthlyAgg[month]) {
                metrics.monthlyAgg[month] = {
                    total: 0, gross: 0, alloc: 0, ga: 0, in: 0, manhours: 0,
                    byDiv: {}, byDept: {}, byDeptCat: {}
                };
            }
            const ma = metrics.monthlyAgg[month];
            ma.total += amt;
            if (isAlloc) ma.alloc += amt; else ma.gross += amt;
            if (jobType === 'GA') ma.ga += amt;
            else if (jobType === 'IN') ma.in += amt;

            if (typeof MANHOUR_DOC_TYPES !== 'undefined' && MANHOUR_DOC_TYPES.includes(docType) &&
                typeof MANHOUR_COST_PREFIX !== 'undefined' && ct.startsWith(MANHOUR_COST_PREFIX)) {
                ma.manhours += Math.abs(row['Actual Units'] || 0);
            }

            if (!isAlloc) {
                ma.byDiv[divName] = (ma.byDiv[divName] || 0) + amt;
                ma.byDept[dept] = (ma.byDept[dept] || 0) + amt;
                ma.byDeptCat[deptCat] = (ma.byDeptCat[deptCat] || 0) + amt;
            }
        }

        if (!isAlloc) {
            if (!metrics.byDivision[divName]) metrics.byDivision[divName] = { amount: 0, count: 0 };
            metrics.byDivision[divName].amount += amt;
            metrics.byDivision[divName].count++;

            if (!metrics.byDepartment[dept]) metrics.byDepartment[dept] = { amount: 0, count: 0 };
            metrics.byDepartment[dept].amount += amt;
            metrics.byDepartment[dept].count++;

            if (!metrics.byCostType[costDesc]) metrics.byCostType[costDesc] = { amount: 0, count: 0 };
            metrics.byCostType[costDesc].amount += amt;
            metrics.byCostType[costDesc].count++;
        }

        if (!metrics.byDeptCategory[deptCat]) metrics.byDeptCategory[deptCat] = { amount: 0, count: 0 };
        metrics.byDeptCategory[deptCat].amount += amt;
        metrics.byDeptCategory[deptCat].count++;

        const docTypeLabel = (typeof DOC_TYPE_NAMES !== 'undefined' && DOC_TYPE_NAMES[docType])
            ? `${docType} - ${DOC_TYPE_NAMES[docType]}`
            : docType;
        if (!metrics.byDocType[docTypeLabel]) metrics.byDocType[docTypeLabel] = { amount: 0, count: 0 };
        metrics.byDocType[docTypeLabel].amount += amt;
        metrics.byDocType[docTypeLabel].count++;
    }

    const net = metrics.gross + metrics.alloc;
    const total = metrics.gaTotal + metrics.inTotal;
    const monthCount = metrics.months.size || 1;

    metrics.kpis = {
        gross: metrics.gross, alloc: metrics.alloc, net: net,
        recoveryPct: metrics.gross !== 0 ? Math.abs(metrics.alloc / metrics.gross * 100) : 0,
        gaPct: total !== 0 ? (metrics.gaTotal / total * 100) : 0,
        inPct: total !== 0 ? (metrics.inTotal / total * 100) : 0,
        monthlyAvg: net / monthCount, monthCount: monthCount,
        grossRecords: metrics.grossRecords, allocRecords: metrics.allocRecords
    };

    return metrics;
}

/**
 * Apply all active filters — config-driven, highly optimized.
 * Only builds Sets for filters that actually have selections.
 */
function applyFilters() {
    const result = [];
    const len = rawData.length;

    // Scalar filters
    const hasDateStart = !!filters.startDate;
    const hasDateEnd = !!filters.endDate;
    const hasJobType = filters.jobType !== 'all';
    const hasDeptCats = filters.deptCategories.length > 0;
    const deptCatSet = hasDeptCats ? new Set(filters.deptCategories) : null;

    // Build active multiselect filter Sets (only for filters with selections)
    const activeSets = [];
    const activeFields = [];
    for (let i = 0; i < MULTISELECT_FILTERS.length; i++) {
        const f = MULTISELECT_FILTERS[i];
        if (filters[f.key].length > 0) {
            activeSets.push(new Set(filters[f.key]));
            activeFields.push(f.field);
        }
    }
    const numActive = activeSets.length;

    for (let i = 0; i < len; i++) {
        const row = rawData[i];
        if (hasDateStart && row['G/L Date'] < filters.startDate) continue;
        if (hasDateEnd && row['G/L Date'] > filters.endDate) continue;
        if (hasJobType && row['Job Type'] !== filters.jobType) continue;
        if (hasDeptCats && !deptCatSet.has(row['Dept_Category'])) continue;

        // Check all active multiselect filters
        if (numActive > 0) {
            let skip = false;
            for (let j = 0; j < numActive; j++) {
                if (!activeSets[j].has(row[activeFields[j]])) { skip = true; break; }
            }
            if (skip) continue;
        }

        result.push(row);
    }

    filteredData = result;
    cachedMetrics = computeAllMetrics(filteredData);
    updateDashboard();
    updateFilterPills();
}

function clearFilters() {
    filters.startDate = null;
    filters.endDate = null;
    filters.jobType = 'all';
    filters.deptCategories = [];

    // Clear all multiselect filters
    MULTISELECT_FILTERS.forEach(f => { filters[f.key] = []; });

    // Date inputs
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));

    // Job type toggle
    const jobToggle = document.getElementById('jobTypeToggle');
    if (jobToggle) {
        jobToggle.querySelectorAll('.pill-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === 'all');
        });
    }

    // Dept category chips
    document.querySelectorAll('.chip-toggle').forEach(chip => chip.classList.remove('active'));

    // All multiselect checkboxes
    document.querySelectorAll('.multiselect-options input[type="checkbox"], .mini-options input[type="checkbox"]').forEach(cb => cb.checked = false);

    updateMultiselectTriggers();
    applyFilters();
}

function updateFilterPills() {
    const container = document.getElementById('activeFilters');
    container.innerHTML = '';

    const addPill = (text, onRemove) => {
        const pill = document.createElement('span');
        pill.className = 'filter-pill';
        pill.innerHTML = `${escapeHtml(text)}${onRemove ? '<button>\u00d7</button>' : ''}`;
        if (onRemove) pill.querySelector('button').onclick = onRemove;
        container.appendChild(pill);
    };

    if (filters.startDate || filters.endDate) {
        addPill(`${filters.startDate || '...'} to ${filters.endDate || '...'}`, () => {
            filters.startDate = null; filters.endDate = null;
            document.getElementById('startDate').value = '';
            document.getElementById('endDate').value = '';
            applyFilters();
        });
    }
    if (filters.jobType !== 'all') {
        addPill(`Type: ${filters.jobType}`, () => { filters.jobType = 'all'; applyFilters(); });
    }
    if (filters.deptCategories.length > 0) {
        addPill(`${filters.deptCategories.length} dept cats`, () => {
            filters.deptCategories = [];
            document.querySelectorAll('.chip-toggle').forEach(chip => chip.classList.remove('active'));
            applyFilters();
        });
    }

    // Config-driven pills for all multiselects
    for (const f of MULTISELECT_FILTERS) {
        if (filters[f.key].length > 0) {
            addPill(`${filters[f.key].length} ${f.label.toLowerCase()}`, () => {
                filters[f.key] = [];
                syncMultiselectCheckboxes(f.id + 'Options', []);
                updateMultiselectTriggers();
                applyFilters();
            });
        }
    }
}

function syncMultiselectCheckboxes(optionsId, values) {
    const el = document.getElementById(optionsId);
    if (!el) return;
    el.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = values.includes(cb.value));
}

function updateMultiselectTriggers() {
    for (const f of MULTISELECT_FILTERS) {
        const trigger = document.getElementById(f.id + 'Trigger');
        if (!trigger) continue;
        const count = filters[f.key].length;
        const total = filterTotals[f.key] || 0;
        const span = trigger.querySelector('span');
        if (span) {
            if (count === 0) span.textContent = 'All';
            else if (total > 0) span.textContent = `${count} of ${total}`;
            else span.textContent = `${count} sel`;
        }
        trigger.classList.toggle('has-selection', count > 0);
    }
}
