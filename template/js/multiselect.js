// === MULTISELECT SETUP ===

function setupMultiselect(containerId, triggerId, dropdownId, optionsId, filterKey) {
    const container = document.getElementById(containerId);
    const trigger = document.getElementById(triggerId);
    const dropdown = document.getElementById(dropdownId);
    const optionsContainer = document.getElementById(optionsId);
    // Support both old and new class names
    const searchInput = dropdown.querySelector('.multiselect-search') || dropdown.querySelector('.mini-search');

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close other dropdowns (both old and new classes)
        document.querySelectorAll('.multiselect-dropdown.open, .mini-dropdown.open').forEach(d => { if (d !== dropdown) d.classList.remove('open'); });
        document.querySelectorAll('.multiselect-trigger.active, .mini-trigger.active').forEach(t => { if (t !== trigger) t.classList.remove('active'); });
        dropdown.classList.toggle('open');
        trigger.classList.toggle('active', dropdown.classList.contains('open'));
        if (dropdown.classList.contains('open') && searchInput) searchInput.focus();
    });

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase();
            optionsContainer.querySelectorAll('label').forEach(opt => opt.style.display = opt.textContent.toLowerCase().includes(q) ? 'flex' : 'none');
        });
    }

    // Support both old and new class names for action buttons
    const actionBtns = dropdown.querySelectorAll('.multiselect-all button, .mini-actions button');
    actionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            optionsContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = action === 'all');
            filters[filterKey] = action === 'all' ? [...optionsContainer.querySelectorAll('input[type="checkbox"]')].map(cb => cb.value) : [];
            updateMultiselectTriggers();
            if (typeof debouncedApplyFilters === 'function') debouncedApplyFilters();
        });
    });
}

function populateMultiselect(optionsContainer, values, filterKey) {
    optionsContainer.innerHTML = values.map(v => `<label><input type="checkbox" value="${escapeHtml(v)}"><span>${escapeHtml(v)}</span></label>`).join('');
    optionsContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
            filters[filterKey] = [...optionsContainer.querySelectorAll('input[type="checkbox"]:checked')].map(c => c.value);
            updateMultiselectTriggers();
            if (typeof debouncedApplyFilters === 'function') debouncedApplyFilters();
        });
    });
}
