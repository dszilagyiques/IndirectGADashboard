// === DASHBOARD UPDATE ===

function updateEmptyState() {
    const emptyOverlay = document.getElementById('emptyStateOverlay');
    const chartGrid = document.querySelector('.chart-grid');

    if (filteredData.length === 0) {
        // Show empty state and hide charts
        emptyOverlay.classList.add('visible');
        chartGrid.style.display = 'none';

        // Generate contextual tips based on active filters
        const tips = [];
        if (filters.startDate || filters.endDate) {
            tips.push('Expand or remove the date range filter');
        }
        if (filters.divisions.length > 0) {
            tips.push(`Remove some of the ${filters.divisions.length} selected divisions`);
        }
        if (filters.jobType !== 'all') {
            tips.push(`Remove the "${filters.jobType}" job type filter`);
        }
        if (tips.length === 0) {
            tips.push('Check that your data source contains transactions');
        }

        const tipsList = document.getElementById('emptyStateTips');
        tipsList.innerHTML = tips.map(t => `<li>${t}</li>`).join('');
    } else {
        // Hide empty state and show charts
        emptyOverlay.classList.remove('visible');
        chartGrid.style.display = 'grid';
    }
}

function updateDashboard() {
    // Use cached metrics if available (from single-pass computation)
    const kpis = cachedMetrics ? cachedMetrics.kpis : calculateKPIs();
    updateKPIs(kpis);
    document.getElementById('recordCount').textContent = `${filteredData.length.toLocaleString()} records`;

    // Update insights panel
    if (typeof updateInsightsPanel === 'function') {
        updateInsightsPanel();
    }

    // Check for empty state
    updateEmptyState();

    // Progressive rendering - defer charts to next frame
    if (filteredData.length > 0) {
        requestAnimationFrame(() => {
            renderMonthlyTrend();
            renderExplorerChart();
        });
    }
}

// === INITIALIZATION ===

function setupFilters() {
    // ── Single-pass extraction of ALL multiselect filter values ──
    // Pre-extract field names for tight loop (avoids config object access per row)
    const fields = MULTISELECT_FILTERS.map(f => f.field);
    const numF = fields.length;
    const sets = [];
    for (let j = 0; j < numF; j++) sets.push(new Set());
    const deptCatSet = new Set();

    const len = rawData.length;
    for (let i = 0; i < len; i++) {
        const r = rawData[i];
        for (let j = 0; j < numF; j++) {
            const v = r[fields[j]];
            if (v != null && v !== '') sets[j].add(String(v));
        }
        if (r['Dept_Category']) deptCatSet.add(r['Dept_Category']);
    }

    // Populate and setup each multiselect from config
    for (let j = 0; j < numF; j++) {
        const f = MULTISELECT_FILTERS[j];
        const values = Array.from(sets[j]).sort();
        filterTotals[f.key] = values.length;
        populateMultiselect(document.getElementById(f.id + 'Options'), values, f.key);
    }
    setupAllMultiselects();

    // Dept Category chips
    const deptCategories = Array.from(deptCatSet).sort();
    filterTotals.deptCategories = deptCategories.length;
    setupDeptCategoryChips(deptCategories);

    // Setup Job Type toggle buttons
    setupJobTypeToggle();

    document.getElementById('startDate').addEventListener('change', e => {
        filters.startDate = e.target.value || null;
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
        debouncedApplyFilters();
    });
    document.getElementById('endDate').addEventListener('change', e => {
        filters.endDate = e.target.value || null;
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
        debouncedApplyFilters();
    });

    // Date preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => applyDatePreset(btn.dataset.preset));
    });
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        // Don't close if clicking inside a dropdown
        if (e.target.closest('.mini-dropdown') || e.target.closest('.mini-trigger')) return;
        document.querySelectorAll('.mini-dropdown.open').forEach(d => d.classList.remove('open'));
        document.querySelectorAll('.mini-trigger.active').forEach(t => t.classList.remove('active'));
    });
}

function setupDeptCategoryChips(categories) {
    const container = document.getElementById('deptCategoryChips');
    if (!container) return;

    container.innerHTML = categories.map(cat => `
        <button class="chip-toggle" data-value="${escapeHtml(cat)}">${escapeHtml(cat)}</button>
    `).join('');

    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip-toggle');
        if (!btn) return;

        const value = btn.dataset.value;
        btn.classList.toggle('active');

        if (btn.classList.contains('active')) {
            if (!filters.deptCategories.includes(value)) {
                filters.deptCategories.push(value);
            }
        } else {
            filters.deptCategories = filters.deptCategories.filter(v => v !== value);
        }

        debouncedApplyFilters();
    });
}

function setupJobTypeToggle() {
    const container = document.getElementById('jobTypeToggle');
    if (!container) return;

    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.pill-btn');
        if (!btn) return;

        container.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filters.jobType = btn.dataset.value;
        debouncedApplyFilters();
    });
}

function setupTrendControls() {
    document.querySelectorAll('[data-trend-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-trend-view]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            trendView = btn.dataset.trendView;
            renderMonthlyTrend();
        });
    });
}

function setupDrill() {
    document.getElementById('drillClose').addEventListener('click', closeDrill);
    document.getElementById('drillModal').addEventListener('click', e => { if (e.target.id === 'drillModal') closeDrill(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrill(); });
    let searchTimeout;
    document.getElementById('drillSearchInput').addEventListener('input', e => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { drill.search = e.target.value; drill.page = 1; applyDrillFilters(); }, 200); });
    document.getElementById('drillPrevPage').addEventListener('click', () => { if (drill.page > 1) { drill.page--; renderDrillTable(); updateDrillPagination(); } });
    document.getElementById('drillNextPage').addEventListener('click', () => { if (drill.page < Math.ceil(drill.filtered.length / drill.pageSize)) { drill.page++; renderDrillTable(); updateDrillPagination(); } });
    document.querySelectorAll('#drillTable th[data-col]').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.col;
            if (drill.sortCol === col) drill.sortDir = drill.sortDir === 'asc' ? 'desc' : 'asc';
            else { drill.sortCol = col; drill.sortDir = col === 'Actual Amount' ? 'desc' : 'asc'; }
            drill.page = 1; applyDrillFilters();
        });
    });
    document.getElementById('drillExportCsv').addEventListener('click', exportCsv);
    document.getElementById('drillExportExcel').addEventListener('click', exportExcel);
}

async function handlePassword() {
    const password = document.getElementById('passwordInput').value;
    const btn = document.getElementById('passwordBtn');
    const error = document.getElementById('passwordError');
    btn.disabled = true; btn.textContent = 'Decrypting...'; error.style.display = 'none';
    try {
        const csvData = await decryptData(password, encryptedPayload);
        rawData = Papa.parse(csvData, { header: true, dynamicTyping: true, skipEmptyLines: true }).data;
        filteredData = [...rawData];
        document.getElementById('passwordOverlay').style.display = 'none';
        document.getElementById('dashboard').classList.add('visible');
        setupFilters();
        setupTrendControls();
        setupExplorerControls();
        setupDrill();
        setupComparisonListeners();
        setupModals();
        updateDashboard();
    } catch (e) {
        console.error('Decryption failed:', e);
        error.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Unlock Dashboard';
    }
}

function setupModals() {
    // Initialize the modal manager
    ModalManager.init();

    // Initialize chart expand modal
    if (typeof ChartExpandModal !== 'undefined') {
        ChartExpandModal.init();
    }

    // Initialize KPI detail modal
    if (typeof KPIDetailModal !== 'undefined') {
        KPIDetailModal.init();
    }

    // Initialize import modal
    if (typeof ImportModal !== 'undefined') {
        ImportModal.init();
    }
}

document.getElementById('passwordBtn').addEventListener('click', handlePassword);
document.getElementById('passwordInput').addEventListener('keypress', e => { if (e.key === 'Enter') handlePassword(); });

// === KEYBOARD SHORTCUTS ===
document.addEventListener('keydown', e => {
    // Don't trigger shortcuts when typing in inputs
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
    const isPasswordScreen = document.getElementById('passwordOverlay').style.display !== 'none';
    const isModalOpen = document.getElementById('drillModal').classList.contains('open');

    // Escape always works - close modal or clear focus
    if (e.key === 'Escape') {
        if (isModalOpen) {
            closeDrill();
        } else if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
        }
        return;
    }

    // Other shortcuts only work when not typing and not on password screen
    if (isTyping || isPasswordScreen) return;

    switch (e.key) {
        case '/':
            e.preventDefault();
            // Focus drill search if modal is open, otherwise no-op
            if (isModalOpen) {
                document.getElementById('drillSearchInput').focus();
            }
            break;
        case 'c':
        case 'C':
            if (!e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                clearFilters();
            }
            break;
    }
});
