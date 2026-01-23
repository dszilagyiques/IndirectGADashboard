// === FILTER LOGIC ===

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

    // Update active state on preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === preset);
    });

    applyFilters();
}

function updateFilterPreview() {
    // Calculate what the count would be with current filter settings
    const previewCount = rawData.filter(row => {
        if (filters.startDate && row['G/L Date'] < filters.startDate) return false;
        if (filters.endDate && row['G/L Date'] > filters.endDate) return false;
        if (filters.jobType !== 'all' && row['Job Type'] !== filters.jobType) return false;
        if (filters.divisions.length > 0 && !filters.divisions.includes(row['Division Name'])) return false;
        if (filters.departments.length > 0 && !filters.departments.includes(row['Department'])) return false;
        if (filters.deptCategories.length > 0 && !filters.deptCategories.includes(row['Dept_Category'])) return false;
        if (filters.categories.length > 0 && !filters.categories.includes(row['Category'])) return false;
        if (filters.docTypes.length > 0 && !filters.docTypes.includes(row['Document Type'])) return false;
        return true;
    }).length;

    const preview = document.getElementById('filterPreview');
    const currentCount = filteredData.length;

    if (previewCount !== currentCount) {
        preview.textContent = `${previewCount.toLocaleString()} records`;
        preview.classList.add('visible', 'changed');
    } else {
        preview.classList.remove('visible', 'changed');
    }
}

function applyFilters() {
    // Hide preview after applying
    document.getElementById('filterPreview').classList.remove('visible', 'changed');

    filteredData = rawData.filter(row => {
        if (filters.startDate && row['G/L Date'] < filters.startDate) return false;
        if (filters.endDate && row['G/L Date'] > filters.endDate) return false;
        if (filters.jobType !== 'all' && row['Job Type'] !== filters.jobType) return false;
        if (filters.divisions.length > 0 && !filters.divisions.includes(row['Division Name'])) return false;
        if (filters.departments.length > 0 && !filters.departments.includes(row['Department'])) return false;
        if (filters.deptCategories.length > 0 && !filters.deptCategories.includes(row['Dept_Category'])) return false;
        if (filters.categories.length > 0 && !filters.categories.includes(row['Category'])) return false;
        if (filters.docTypes.length > 0 && !filters.docTypes.includes(row['Document Type'])) return false;
        return true;
    });
    updateDashboard();
    updateFilterPills();
}

function clearFilters() {
    filters = { startDate: null, endDate: null, jobType: 'all', divisions: [], departments: [], deptCategories: [], categories: [], docTypes: [] };
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('jobTypeFilter').value = 'all';
    document.querySelectorAll('.multiselect-options input[type="checkbox"]').forEach(cb => cb.checked = false);
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
        addPill(`Type: ${filters.jobType}`, () => { filters.jobType = 'all'; document.getElementById('jobTypeFilter').value = 'all'; applyFilters(); });
    }
    if (filters.divisions.length > 0) addPill(`${filters.divisions.length} divisions`, () => { filters.divisions = []; syncMultiselectCheckboxes('divisionOptions', []); updateMultiselectTriggers(); applyFilters(); });
    if (filters.departments.length > 0) addPill(`${filters.departments.length} depts`, () => { filters.departments = []; syncMultiselectCheckboxes('departmentOptions', []); updateMultiselectTriggers(); applyFilters(); });
    if (filters.deptCategories.length > 0) addPill(`${filters.deptCategories.length} dept cats`, () => { filters.deptCategories = []; syncMultiselectCheckboxes('deptCategoryOptions', []); updateMultiselectTriggers(); applyFilters(); });
    if (filters.categories.length > 0) addPill(`${filters.categories.length} categories`, () => { filters.categories = []; syncMultiselectCheckboxes('categoryOptions', []); updateMultiselectTriggers(); applyFilters(); });
    if (filters.docTypes.length > 0) addPill(`${filters.docTypes.length} doc types`, () => { filters.docTypes = []; syncMultiselectCheckboxes('docTypeOptions', []); updateMultiselectTriggers(); applyFilters(); });
}

function syncMultiselectCheckboxes(optionsId, values) {
    document.querySelectorAll(`#${optionsId} input[type="checkbox"]`).forEach(cb => cb.checked = values.includes(cb.value));
}

function updateMultiselectTriggers() {
    const update = (id, arr) => {
        const trigger = document.getElementById(id);
        const count = arr.length;
        trigger.querySelector('span').textContent = count === 0 ? 'All' : `${count} sel`;
        trigger.classList.toggle('has-selection', count > 0);
    };
    update('divisionTrigger', filters.divisions);
    update('departmentTrigger', filters.departments);
    update('deptCategoryTrigger', filters.deptCategories);
    update('categoryTrigger', filters.categories);
    update('docTypeTrigger', filters.docTypes);
}
