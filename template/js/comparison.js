// === COMPARISON MODE ===

let comparisonMode = false;
let periodAData = [];
let periodBData = [];
let currentPeriodType = 'month'; // 'month', 'quarter', 'year'

// Available periods extracted from data
let availableMonths = [];
let availableQuarters = [];
let availableYears = [];

// Shared filter selections
let selectedDivisions = [];
let selectedCategories = [];

let periodA = {
    startDate: null,
    endDate: null,
    divisions: [],
    deptCategories: [],
    docTypes: []
};

let periodB = {
    startDate: null,
    endDate: null,
    divisions: [],
    deptCategories: [],
    docTypes: []
};

function initComparisonFilters() {
    extractAvailablePeriods();
    populatePeriodSelects();
    initComparisonMultiselects();
    setDefaultPeriodSelections();
}

function extractAvailablePeriods() {
    const dates = rawData.map(r => r['G/L Date']).filter(Boolean).sort();
    if (dates.length === 0) return;

    // Extract unique months with data
    const monthSet = new Set();
    const quarterSet = new Set();
    const yearSet = new Set();

    dates.forEach(date => {
        const year = date.substring(0, 4);
        const month = date.substring(0, 7);
        const q = Math.ceil(parseInt(date.substring(5, 7)) / 3);

        monthSet.add(month);
        quarterSet.add(`${year}-Q${q}`);
        yearSet.add(year);
    });

    // Convert to sorted arrays (most recent first)
    availableMonths = [...monthSet].sort().reverse();
    availableQuarters = [...quarterSet].sort().reverse();
    availableYears = [...yearSet].sort().reverse();
}

function formatMonthOption(monthStr) {
    const [year, month] = monthStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
}

function formatQuarterOption(quarterStr) {
    return quarterStr.replace('-Q', ' Q');
}

function populatePeriodSelects() {
    const selectA = document.getElementById('periodASelect');
    const selectB = document.getElementById('periodBSelect');
    if (!selectA || !selectB) return;

    let options = [];

    switch (currentPeriodType) {
        case 'month':
            options = availableMonths.map(m => ({
                value: m,
                label: formatMonthOption(m)
            }));
            break;
        case 'quarter':
            options = availableQuarters.map(q => ({
                value: q,
                label: formatQuarterOption(q)
            }));
            break;
        case 'year':
            options = availableYears.map(y => ({
                value: y,
                label: y
            }));
            break;
    }

    const optionsHtml = '<option value="">Select...</option>' +
        options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');

    selectA.innerHTML = optionsHtml;
    selectB.innerHTML = optionsHtml;
}

function setDefaultPeriodSelections() {
    const selectA = document.getElementById('periodASelect');
    const selectB = document.getElementById('periodBSelect');
    if (!selectA || !selectB) return;

    // Set defaults based on period type
    switch (currentPeriodType) {
        case 'month':
            if (availableMonths.length >= 2) {
                selectB.value = availableMonths[0]; // Most recent
                selectA.value = availableMonths[1]; // Second most recent
            } else if (availableMonths.length === 1) {
                selectB.value = availableMonths[0];
            }
            break;
        case 'quarter':
            if (availableQuarters.length >= 2) {
                selectB.value = availableQuarters[0];
                selectA.value = availableQuarters[1];
            } else if (availableQuarters.length === 1) {
                selectB.value = availableQuarters[0];
            }
            break;
        case 'year':
            if (availableYears.length >= 2) {
                selectB.value = availableYears[0];
                selectA.value = availableYears[1];
            } else if (availableYears.length === 1) {
                selectB.value = availableYears[0];
            }
            break;
    }

    updatePeriodFromSelects();
    updateComparisonWarnings();
}

function updatePeriodFromSelects() {
    const selectA = document.getElementById('periodASelect');
    const selectB = document.getElementById('periodBSelect');
    if (!selectA || !selectB) return;

    const valA = selectA.value;
    const valB = selectB.value;

    if (valA) {
        const range = getPeriodDateRange(valA, currentPeriodType);
        periodA.startDate = range.start;
        periodA.endDate = range.end;
    } else {
        periodA.startDate = null;
        periodA.endDate = null;
    }

    if (valB) {
        const range = getPeriodDateRange(valB, currentPeriodType);
        periodB.startDate = range.start;
        periodB.endDate = range.end;
    } else {
        periodB.startDate = null;
        periodB.endDate = null;
    }
}

function getPeriodDateRange(value, type) {
    switch (type) {
        case 'month':
            return {
                start: value + '-01',
                end: getLastDayOfMonth(value)
            };
        case 'quarter':
            const [year, qStr] = value.split('-Q');
            const q = parseInt(qStr);
            const startMonth = (q - 1) * 3 + 1;
            const endMonth = q * 3;
            return {
                start: `${year}-${String(startMonth).padStart(2, '0')}-01`,
                end: getLastDayOfMonth(`${year}-${String(endMonth).padStart(2, '0')}`)
            };
        case 'year':
            return {
                start: `${value}-01-01`,
                end: `${value}-12-31`
            };
        default:
            return { start: null, end: null };
    }
}

function getLastDayOfMonth(monthStr) {
    const [year, month] = monthStr.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return `${monthStr}-${String(lastDay).padStart(2, '0')}`;
}

function initComparisonMultiselects() {
    const divisions = [...new Set(rawData.map(r => r['Division Name']).filter(Boolean))].sort();
    const deptCategories = [...new Set(rawData.map(r => r['Dept_Category']).filter(Boolean))].sort();

    // Populate divisions multiselect
    const divisionsOptions = document.getElementById('compareDivisionsOptions');
    if (divisionsOptions) {
        divisionsOptions.innerHTML = divisions.map(d => `
            <div class="multiselect-option" data-value="${escapeHtml(d)}">
                <span class="multiselect-checkbox">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <span>${escapeHtml(d)}</span>
            </div>
        `).join('');
    }

    // Populate categories multiselect
    const categoriesOptions = document.getElementById('compareCategoriesOptions');
    if (categoriesOptions) {
        categoriesOptions.innerHTML = deptCategories.map(c => `
            <div class="multiselect-option" data-value="${escapeHtml(c)}">
                <span class="multiselect-checkbox">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <span>${escapeHtml(c)}</span>
            </div>
        `).join('');
    }

    // Setup multiselect interactions
    setupComparisonMultiselect('compareDivisions', () => {
        updateMultiselectText('compareDivisions', selectedDivisions, 'All Divisions');
    });
    setupComparisonMultiselect('compareCategories', () => {
        updateMultiselectText('compareCategories', selectedCategories, 'All Categories');
    });
}

function setupComparisonMultiselect(baseName, onChange) {
    const container = document.getElementById(`${baseName}Container`);
    const trigger = document.getElementById(`${baseName}Trigger`);
    const dropdown = document.getElementById(`${baseName}Dropdown`);
    const options = document.getElementById(`${baseName}Options`);

    if (!container || !trigger || !dropdown || !options) return;

    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();

        // Close other multiselects
        document.querySelectorAll('.comparison-multiselect.open').forEach(el => {
            if (el !== container) el.classList.remove('open');
        });

        container.classList.toggle('open');
    });

    // Handle option clicks
    options.addEventListener('click', (e) => {
        const option = e.target.closest('.multiselect-option');
        if (!option) return;

        const value = option.dataset.value;
        const isSelected = option.classList.contains('selected');
        const selections = baseName === 'compareDivisions' ? selectedDivisions : selectedCategories;

        if (isSelected) {
            option.classList.remove('selected');
            const idx = selections.indexOf(value);
            if (idx > -1) selections.splice(idx, 1);
        } else {
            option.classList.add('selected');
            selections.push(value);
        }

        onChange();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            container.classList.remove('open');
        }
    });
}

function updateMultiselectText(baseName, selections, defaultText) {
    const trigger = document.getElementById(`${baseName}Trigger`);
    if (!trigger) return;

    const textEl = trigger.querySelector('.multiselect-text');
    if (!textEl) return;

    if (selections.length === 0) {
        textEl.textContent = defaultText;
    } else if (selections.length === 1) {
        textEl.textContent = selections[0];
    } else {
        textEl.textContent = `${selections.length} selected`;
    }
}

function updateComparisonWarnings() {
    const warningsEl = document.getElementById('comparisonWarnings');
    if (!warningsEl) return;

    const warnings = [];
    const selectA = document.getElementById('periodASelect');
    const selectB = document.getElementById('periodBSelect');

    const valA = selectA?.value;
    const valB = selectB?.value;

    if (!valA && !valB) {
        warningsEl.innerHTML = '';
        warningsEl.style.display = 'none';
        return;
    }

    // Check if periods are the same
    if (valA && valB && valA === valB) {
        warnings.push('Both periods are the same');
    }

    // Check if Period A has data
    if (valA) {
        const range = getPeriodDateRange(valA, currentPeriodType);
        const testPeriod = { startDate: range.start, endDate: range.end, divisions: [], deptCategories: [], docTypes: [] };
        const data = filterDataForPeriod(rawData, testPeriod);
        if (data.length === 0) {
            warnings.push(`Period A has no data`);
        }
    }

    // Check if Period B has data
    if (valB) {
        const range = getPeriodDateRange(valB, currentPeriodType);
        const testPeriod = { startDate: range.start, endDate: range.end, divisions: [], deptCategories: [], docTypes: [] };
        const data = filterDataForPeriod(rawData, testPeriod);
        if (data.length === 0) {
            warnings.push(`Period B has no data`);
        }
    }

    if (warnings.length > 0) {
        warningsEl.innerHTML = warnings.map(w => `<span class="comparison-warning">${w}</span>`).join('');
        warningsEl.style.display = 'flex';
    } else {
        warningsEl.innerHTML = '';
        warningsEl.style.display = 'none';
    }
}

function filterDataForPeriod(data, period) {
    return data.filter(row => {
        if (period.startDate && row['G/L Date'] < period.startDate) return false;
        if (period.endDate && row['G/L Date'] > period.endDate) return false;
        if (period.divisions.length > 0 && !period.divisions.includes(row['Division Name'])) return false;
        if (period.deptCategories.length > 0 && !period.deptCategories.includes(row['Dept_Category'])) return false;
        if (period.docTypes.length > 0 && !period.docTypes.includes(row['Document Type'])) return false;
        return true;
    });
}

function applyComparison() {
    updatePeriodFromSelects();

    // Apply shared filters to both periods
    periodA.divisions = [...selectedDivisions];
    periodA.deptCategories = [...selectedCategories];
    periodA.docTypes = [];

    periodB.divisions = [...selectedDivisions];
    periodB.deptCategories = [...selectedCategories];
    periodB.docTypes = [];

    periodAData = filterDataForPeriod(rawData, periodA);
    periodBData = filterDataForPeriod(rawData, periodB);

    comparisonMode = true;
    updateComparisonKPIs();
    updateComparisonCharts();
}

function clearComparison() {
    comparisonMode = false;
    periodAData = [];
    periodBData = [];
    selectedDivisions = [];
    selectedCategories = [];

    periodA = { startDate: null, endDate: null, divisions: [], deptCategories: [], docTypes: [] };
    periodB = { startDate: null, endDate: null, divisions: [], deptCategories: [], docTypes: [] };

    // Reset multiselect UI
    document.querySelectorAll('.comparison-multiselect .multiselect-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    updateMultiselectText('compareDivisions', [], 'All Divisions');
    updateMultiselectText('compareCategories', [], 'All Categories');

    setDefaultPeriodSelections();
    resetComparisonResults();

    // Clear warnings
    const warningsEl = document.getElementById('comparisonWarnings');
    if (warningsEl) {
        warningsEl.innerHTML = '';
        warningsEl.style.display = 'none';
    }

    updateDashboard();
}

function resetComparisonResults() {
    document.getElementById('compareGrossA').textContent = '-';
    document.getElementById('compareGrossB').textContent = '-';
    document.getElementById('compareAllocA').textContent = '-';
    document.getElementById('compareAllocB').textContent = '-';
    document.getElementById('compareNetA').textContent = '-';
    document.getElementById('compareNetB').textContent = '-';
    document.getElementById('compareRecoveryA').textContent = '-';
    document.getElementById('compareRecoveryB').textContent = '-';

    ['compareGrossVar', 'compareAllocVar', 'compareNetVar', 'compareRecoveryVar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.querySelector('.var-amount').textContent = '-';
            el.querySelector('.var-pct').textContent = '';
            el.classList.remove('positive', 'negative', 'neutral');
        }
    });
}

function calculateVariance(a, b) {
    const diff = b - a;
    const pct = a !== 0 ? ((b - a) / Math.abs(a)) * 100 : (b !== 0 ? 100 : 0);
    return { diff, pct };
}

function calculatePeriodKPIs(data) {
    let gross = 0, alloc = 0;
    const months = new Set();

    data.forEach(r => {
        const amt = r['Actual Amount'] || 0;
        const ct = String(r['Cost Type'] || '');
        if (r['G/L Date']) months.add(r['G/L Date'].substring(0, 7));
        if (ct.startsWith('693')) alloc += amt; else gross += amt;
    });

    const net = gross + alloc;
    const recoveryPct = gross !== 0 ? Math.abs(alloc / gross * 100) : 0;

    return { gross, alloc, net, recoveryPct, monthCount: months.size || 1 };
}

function formatCompactCurrency(value) {
    const abs = Math.abs(value);
    if (abs >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (abs >= 1000) return (value / 1000).toFixed(0) + 'K';
    return value.toFixed(0);
}

function updateComparisonKPIs() {
    const kpisA = calculatePeriodKPIs(periodAData);
    const kpisB = calculatePeriodKPIs(periodBData);

    const grossVar = calculateVariance(kpisA.gross, kpisB.gross);
    const allocVar = calculateVariance(kpisA.alloc, kpisB.alloc);
    const netVar = calculateVariance(kpisA.net, kpisB.net);
    const recoveryVar = calculateVariance(kpisA.recoveryPct, kpisB.recoveryPct);

    // Update values
    document.getElementById('compareGrossA').textContent = formatCompactCurrency(kpisA.gross);
    document.getElementById('compareGrossB').textContent = formatCompactCurrency(kpisB.gross);
    updateVarianceDisplay('compareGrossVar', grossVar, true);

    document.getElementById('compareAllocA').textContent = formatCompactCurrency(kpisA.alloc);
    document.getElementById('compareAllocB').textContent = formatCompactCurrency(kpisB.alloc);
    updateVarianceDisplay('compareAllocVar', allocVar, false);

    document.getElementById('compareNetA').textContent = formatCompactCurrency(kpisA.net);
    document.getElementById('compareNetB').textContent = formatCompactCurrency(kpisB.net);
    updateVarianceDisplay('compareNetVar', netVar, true);

    document.getElementById('compareRecoveryA').textContent = `${kpisA.recoveryPct.toFixed(0)}%`;
    document.getElementById('compareRecoveryB').textContent = `${kpisB.recoveryPct.toFixed(0)}%`;
    updateVarianceDisplay('compareRecoveryVar', recoveryVar, false, true);
}

function updateVarianceDisplay(elementId, variance, positiveIsBad, isPercent = false) {
    const container = document.getElementById(elementId);
    if (!container) return;

    const amountEl = container.querySelector('.var-amount');
    const pctEl = container.querySelector('.var-pct');

    const sign = variance.diff >= 0 ? '+' : '';
    if (amountEl) amountEl.textContent = isPercent ? `${sign}${variance.diff.toFixed(0)}%` : `${sign}${formatCompactCurrency(variance.diff)}`;
    if (pctEl) pctEl.textContent = `${sign}${variance.pct.toFixed(0)}%`;

    container.classList.remove('positive', 'negative', 'neutral');
    if (Math.abs(variance.pct) < 0.5) {
        container.classList.add('neutral');
    } else if ((variance.diff > 0) === positiveIsBad) {
        container.classList.add('positive'); // positive class = bad (red)
    } else {
        container.classList.add('negative'); // negative class = good (green)
    }
}

function updateComparisonCharts() {
    // Only Monthly Trend shows period comparison
    renderMonthlyTrend();
}

function setupComparisonListeners() {
    // Period type toggle
    document.querySelectorAll('.period-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.period-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriodType = btn.dataset.periodType;
            populatePeriodSelects();
            setDefaultPeriodSelections();
        });
    });

    // Period select changes
    ['periodASelect', 'periodBSelect'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => {
            updatePeriodFromSelects();
            updateComparisonWarnings();
        });
    });

    // Apply and Reset buttons
    document.getElementById('applyComparisonBtn')?.addEventListener('click', () => {
        applyComparison();
        updateComparisonWarnings();
    });
    document.getElementById('clearComparisonBtn')?.addEventListener('click', clearComparison);

    // Initialize filters
    initComparisonFilters();
}

// Legacy function stubs for compatibility
function formatMonthLabel(monthStr) {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
}

function updatePeriodSummaries() {
    // No longer needed in simplified UI
}

function populateQuarterSelects() {
    // No longer needed - handled by populatePeriodSelects
}
