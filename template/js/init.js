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
        if (filters.departments.length > 0) {
            tips.push(`Remove some of the ${filters.departments.length} selected departments`);
        }
        if (filters.categories.length > 0) {
            tips.push(`Clear the ${filters.categories.length} category filter(s)`);
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
    const kpis = calculateKPIs();
    updateKPIs(kpis);
    document.getElementById('recordCount').textContent = `${filteredData.length.toLocaleString()} records`;

    // Update insights panel
    if (typeof updateInsightsPanel === 'function') {
        updateInsightsPanel();
    }

    // Check for empty state
    updateEmptyState();

    if (filteredData.length > 0) {
        renderMonthlyTrend();
        renderDepartmentChart();
        renderDivisionChart();
        renderCategoryChart();
        renderDocTypeChart();
        renderCostTypeChart();
    }
}

// === INITIALIZATION ===

function setupFilters() {
    const divisions = [...new Set(rawData.map(r => r['Division Name']).filter(Boolean))].sort();
    const departments = [...new Set(rawData.map(r => r['Department']).filter(Boolean))].sort();
    const deptCategories = [...new Set(rawData.map(r => r['Dept_Category']).filter(Boolean))].sort();
    const categories = [...new Set(rawData.map(r => r['Category']).filter(Boolean))].sort();
    const docTypes = [...new Set(rawData.map(r => r['Document Type']).filter(Boolean))].sort();

    populateMultiselect(document.getElementById('divisionOptions'), divisions, 'divisions');
    populateMultiselect(document.getElementById('departmentOptions'), departments, 'departments');
    populateMultiselect(document.getElementById('deptCategoryOptions'), deptCategories, 'deptCategories');
    populateMultiselect(document.getElementById('categoryOptions'), categories, 'categories');
    populateMultiselect(document.getElementById('docTypeOptions'), docTypes, 'docTypes');

    setupMultiselect('divisionMultiselect', 'divisionTrigger', 'divisionDropdown', 'divisionOptions', 'divisions');
    setupMultiselect('departmentMultiselect', 'departmentTrigger', 'departmentDropdown', 'departmentOptions', 'departments');
    setupMultiselect('deptCategoryMultiselect', 'deptCategoryTrigger', 'deptCategoryDropdown', 'deptCategoryOptions', 'deptCategories');
    setupMultiselect('categoryMultiselect', 'categoryTrigger', 'categoryDropdown', 'categoryOptions', 'categories');
    setupMultiselect('docTypeMultiselect', 'docTypeTrigger', 'docTypeDropdown', 'docTypeOptions', 'docTypes');

    document.getElementById('startDate').addEventListener('change', e => {
        filters.startDate = e.target.value || null;
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
        updateFilterPreview();
    });
    document.getElementById('endDate').addEventListener('change', e => {
        filters.endDate = e.target.value || null;
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
        updateFilterPreview();
    });
    document.getElementById('jobTypeFilter').addEventListener('change', e => {
        filters.jobType = e.target.value;
        updateFilterPreview();
    });

    // Date preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => applyDatePreset(btn.dataset.preset));
    });
    document.getElementById('applyFiltersBtn').addEventListener('click', applyFilters);
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.multiselect-dropdown.open').forEach(d => d.classList.remove('open'));
        document.querySelectorAll('.multiselect-trigger.active').forEach(t => t.classList.remove('active'));
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
    document.getElementById('trendTopN').addEventListener('change', e => {
        trendTopN = parseInt(e.target.value);
        renderMonthlyTrend();
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
        setupDrill();
        setupComparisonListeners();
        updateDashboard();
    } catch (e) {
        console.error('Decryption failed:', e);
        error.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Unlock Dashboard';
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
        case 'a':
        case 'A':
            if (!e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                applyFilters();
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
