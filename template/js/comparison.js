// === COMPARISON MODE ===

let comparisonMode = false;
let periodAData = [];
let periodBData = [];

let periodA = {
    startDate: null,
    endDate: null,
    divisions: [],
    departments: [],
    deptCategories: [],
    categories: [],
    docTypes: []
};

let periodB = {
    startDate: null,
    endDate: null,
    divisions: [],
    departments: [],
    deptCategories: [],
    categories: [],
    docTypes: []
};

function initComparisonFilters() {
    const divisions = [...new Set(rawData.map(r => r['Division Name']).filter(Boolean))].sort();
    const deptCategories = [...new Set(rawData.map(r => r['Dept_Category']).filter(Boolean))].sort();

    // Populate comparison filter dropdowns
    populateCompareSelect('periodADivisions', divisions, 'All Div');
    populateCompareSelect('periodBDivisions', divisions, 'All Div');
    populateCompareSelect('periodADeptCategories', deptCategories, 'All Cat');
    populateCompareSelect('periodBDeptCategories', deptCategories, 'All Cat');

    // Also populate hidden selects for JS compatibility
    const departments = [...new Set(rawData.map(r => r['Department']).filter(Boolean))].sort();
    const categories = [...new Set(rawData.map(r => r['Category']).filter(Boolean))].sort();
    const docTypes = [...new Set(rawData.map(r => r['Document Type']).filter(Boolean))].sort();

    populateCompareSelect('periodADepartments', departments, 'All');
    populateCompareSelect('periodBDepartments', departments, 'All');
    populateCompareSelect('periodACategories', categories, 'All');
    populateCompareSelect('periodBCategories', categories, 'All');
    populateCompareSelect('periodADocTypes', docTypes, 'All');
    populateCompareSelect('periodBDocTypes', docTypes, 'All');

    // Set default dates
    setDefaultComparisonDates();
}

function populateCompareSelect(selectId, options, placeholder) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = `<option value="">${placeholder}</option>` + options.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
}

function setDefaultComparisonDates() {
    const dates = rawData.map(r => r['G/L Date']).filter(Boolean).sort();
    if (dates.length === 0) return;

    const maxDate = dates[dates.length - 1];
    const maxDateObj = new Date(maxDate);

    // Period B: Current month
    const periodBEnd = maxDate;
    const periodBStart = new Date(maxDateObj.getFullYear(), maxDateObj.getMonth(), 1).toISOString().slice(0, 10);

    // Period A: Previous month
    const periodAEndObj = new Date(maxDateObj.getFullYear(), maxDateObj.getMonth(), 0);
    const periodAEnd = periodAEndObj.toISOString().slice(0, 10);
    const periodAStart = new Date(periodAEndObj.getFullYear(), periodAEndObj.getMonth(), 1).toISOString().slice(0, 10);

    document.getElementById('periodAStartDate').value = periodAStart;
    document.getElementById('periodAEndDate').value = periodAEnd;
    document.getElementById('periodBStartDate').value = periodBStart;
    document.getElementById('periodBEndDate').value = periodBEnd;

    periodA.startDate = periodAStart;
    periodA.endDate = periodAEnd;
    periodB.startDate = periodBStart;
    periodB.endDate = periodBEnd;
}

function applyComparisonPreset(presetType) {
    const dates = rawData.map(r => r['G/L Date']).filter(Boolean).sort();
    if (dates.length === 0) return;

    const maxDate = dates[dates.length - 1];
    const maxDateObj = new Date(maxDate);

    // Update preset pill states
    document.querySelectorAll('.preset-pill').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-preset="${presetType}"]`)?.classList.add('active');

    let aStart, aEnd, bStart, bEnd;

    switch (presetType) {
        case 'yoy':
            bEnd = maxDate;
            bStart = new Date(maxDateObj.getFullYear(), 0, 1).toISOString().slice(0, 10);
            aEnd = new Date(maxDateObj.getFullYear() - 1, maxDateObj.getMonth(), maxDateObj.getDate()).toISOString().slice(0, 10);
            aStart = new Date(maxDateObj.getFullYear() - 1, 0, 1).toISOString().slice(0, 10);
            break;

        case 'mom':
            bEnd = maxDate;
            bStart = new Date(maxDateObj.getFullYear(), maxDateObj.getMonth(), 1).toISOString().slice(0, 10);
            const prevMonthEnd = new Date(maxDateObj.getFullYear(), maxDateObj.getMonth(), 0);
            aEnd = prevMonthEnd.toISOString().slice(0, 10);
            aStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1).toISOString().slice(0, 10);
            break;

        case 'qoq':
            const currentQ = Math.floor(maxDateObj.getMonth() / 3);
            bStart = new Date(maxDateObj.getFullYear(), currentQ * 3, 1).toISOString().slice(0, 10);
            bEnd = maxDate;

            const prevQYear = currentQ === 0 ? maxDateObj.getFullYear() - 1 : maxDateObj.getFullYear();
            const prevQ = currentQ === 0 ? 3 : currentQ - 1;
            aStart = new Date(prevQYear, prevQ * 3, 1).toISOString().slice(0, 10);
            aEnd = new Date(prevQYear, prevQ * 3 + 3, 0).toISOString().slice(0, 10);
            break;

        default:
            return;
    }

    document.getElementById('periodAStartDate').value = aStart;
    document.getElementById('periodAEndDate').value = aEnd;
    document.getElementById('periodBStartDate').value = bStart;
    document.getElementById('periodBEndDate').value = bEnd;

    periodA.startDate = aStart;
    periodA.endDate = aEnd;
    periodB.startDate = bStart;
    periodB.endDate = bEnd;
}

function collectPeriodFilters(period, prefix) {
    period.startDate = document.getElementById(`${prefix}StartDate`).value || null;
    period.endDate = document.getElementById(`${prefix}EndDate`).value || null;
    period.divisions = getSelectValues(`${prefix}Divisions`);
    period.departments = getSelectValues(`${prefix}Departments`);
    period.deptCategories = getSelectValues(`${prefix}DeptCategories`);
    period.categories = getSelectValues(`${prefix}Categories`);
    period.docTypes = getSelectValues(`${prefix}DocTypes`);
}

function getSelectValues(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return [];
    const val = select.value;
    return val ? [val] : [];
}

function filterDataForPeriod(data, period) {
    return data.filter(row => {
        if (period.startDate && row['G/L Date'] < period.startDate) return false;
        if (period.endDate && row['G/L Date'] > period.endDate) return false;
        if (period.divisions.length > 0 && !period.divisions.includes(row['Division Name'])) return false;
        if (period.departments.length > 0 && !period.departments.includes(row['Department'])) return false;
        if (period.deptCategories.length > 0 && !period.deptCategories.includes(row['Dept_Category'])) return false;
        if (period.categories.length > 0 && !period.categories.includes(row['Category'])) return false;
        if (period.docTypes.length > 0 && !period.docTypes.includes(row['Document Type'])) return false;
        return true;
    });
}

function applyComparison() {
    collectPeriodFilters(periodA, 'periodA');
    collectPeriodFilters(periodB, 'periodB');

    periodAData = filterDataForPeriod(rawData, periodA);
    periodBData = filterDataForPeriod(rawData, periodB);

    comparisonMode = true;
    updateComparisonKPIs();
    updateComparisonCharts();
}

function clearComparison() {
    document.querySelectorAll('.preset-pill').forEach(btn => btn.classList.remove('active'));

    comparisonMode = false;
    periodAData = [];
    periodBData = [];

    periodA = { startDate: null, endDate: null, divisions: [], departments: [], deptCategories: [], categories: [], docTypes: [] };
    periodB = { startDate: null, endDate: null, divisions: [], departments: [], deptCategories: [], categories: [], docTypes: [] };

    setDefaultComparisonDates();
    resetComparisonResults();
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
    renderMonthlyTrend();
    renderDepartmentChart();
    renderDivisionChart();
    renderCategoryChart();
    renderDocTypeChart();
    renderCostTypeChart();
}

function setupComparisonListeners() {
    document.getElementById('applyComparisonBtn')?.addEventListener('click', applyComparison);
    document.getElementById('clearComparisonBtn')?.addEventListener('click', clearComparison);

    // Preset pills
    document.querySelectorAll('.preset-pill').forEach(btn => {
        btn.addEventListener('click', () => applyComparisonPreset(btn.dataset.preset));
    });

    // Date change listeners
    ['periodAStartDate', 'periodAEndDate', 'periodBStartDate', 'periodBEndDate'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', e => {
            const prefix = id.startsWith('periodA') ? 'periodA' : 'periodB';
            const period = prefix === 'periodA' ? periodA : periodB;
            const field = id.includes('Start') ? 'startDate' : 'endDate';
            period[field] = e.target.value || null;
        });
    });

    // Initialize comparison filters
    initComparisonFilters();
}
