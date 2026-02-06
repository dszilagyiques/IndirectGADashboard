// === MULTISELECT SETUP (optimized for large option lists) ===

function setupMultiselect(containerId, triggerId, dropdownId, optionsId, filterKey) {
    const container = document.getElementById(containerId);
    const trigger = document.getElementById(triggerId);
    const dropdown = document.getElementById(dropdownId);
    const optionsContainer = document.getElementById(optionsId);
    if (!container || !trigger || !dropdown) return;

    const searchInput = dropdown.querySelector('.multiselect-search') || dropdown.querySelector('.mini-search');

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.multiselect-dropdown.open, .mini-dropdown.open').forEach(d => { if (d !== dropdown) d.classList.remove('open'); });
        document.querySelectorAll('.multiselect-trigger.active, .mini-trigger.active').forEach(t => { if (t !== trigger) t.classList.remove('active'); });
        dropdown.classList.toggle('open');
        trigger.classList.toggle('active', dropdown.classList.contains('open'));
        if (dropdown.classList.contains('open') && searchInput) {
            searchInput.value = '';
            searchInput.focus();
            // Reset search visibility
            if (optionsContainer) {
                optionsContainer.querySelectorAll('label').forEach(l => l.style.display = '');
            }
        }
    });

    if (searchInput) {
        let searchTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                const q = searchInput.value.toLowerCase();
                if (!optionsContainer) return;
                const labels = optionsContainer.querySelectorAll('label');
                for (let i = 0; i < labels.length; i++) {
                    labels[i].style.display = labels[i].textContent.toLowerCase().includes(q) ? '' : 'none';
                }
            }, 80); // debounce for large lists
        });
    }

    const actionBtns = dropdown.querySelectorAll('.multiselect-all button, .mini-actions button');
    actionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            if (!optionsContainer) return;
            const cbs = optionsContainer.querySelectorAll('input[type="checkbox"]');
            const newValues = [];
            for (let i = 0; i < cbs.length; i++) {
                cbs[i].checked = action === 'all';
                if (action === 'all') newValues.push(cbs[i].value);
            }
            filters[filterKey] = newValues;
            updateMultiselectTriggers();
            if (typeof debouncedApplyFilters === 'function') debouncedApplyFilters();
        });
    });
}

/**
 * Populate multiselect options using innerHTML (fastest for bulk insertion)
 * + event delegation (one click handler instead of one per checkbox).
 */
function populateMultiselect(optionsContainer, values, filterKey) {
    if (!optionsContainer) return;

    // Build HTML string (faster than createElement for large lists)
    optionsContainer.innerHTML = values.map(v =>
        `<label><input type="checkbox" value="${escapeHtml(String(v))}"><span>${escapeHtml(String(v))}</span></label>`
    ).join('');

    // Event delegation: one click handler for all checkboxes
    optionsContainer.onclick = function(e) {
        if (!e.target.matches('input[type="checkbox"]')) return;
        // Collect checked values
        const checked = optionsContainer.querySelectorAll('input[type="checkbox"]:checked');
        const vals = new Array(checked.length);
        for (let i = 0; i < checked.length; i++) vals[i] = checked[i].value;
        filters[filterKey] = vals;
        updateMultiselectTriggers();
        if (typeof debouncedApplyFilters === 'function') debouncedApplyFilters();
    };
}

/**
 * Setup ALL multiselect filters from the MULTISELECT_FILTERS config.
 * Call once after populating options.
 */
function setupAllMultiselects() {
    for (const f of MULTISELECT_FILTERS) {
        setupMultiselect(f.id + 'Multiselect', f.id + 'Trigger', f.id + 'Dropdown', f.id + 'Options', f.key);
    }
}
