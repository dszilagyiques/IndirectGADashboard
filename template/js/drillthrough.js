// === DRILL-THROUGH ===

function openDrill(title, subtitle, filterFn) {
    document.getElementById('drillTitle').textContent = title;
    document.getElementById('drillSubtitle').textContent = subtitle;
    drill.data = filteredData.filter(filterFn);
    drill.page = 1; drill.search = '';
    document.getElementById('drillSearchInput').value = '';
    updateDrillSummary();
    applyDrillFilters();
    document.getElementById('drillModal').classList.add('open');
}

function closeDrill() { document.getElementById('drillModal').classList.remove('open'); }

function updateDrillSummary() {
    let gross = 0, alloc = 0;
    const divs = new Set(), depts = new Set();
    drill.data.forEach(r => {
        const amt = r['Actual Amount'] || 0;
        if (String(r['Cost Type']||'').startsWith('693')) alloc += amt; else gross += amt;
        if (r['Division Name']) divs.add(r['Division Name']);
        if (r['Department']) depts.add(r['Department']);
    });
    document.getElementById('drillSummary').innerHTML = `
        <div class="drill-stat"><div class="drill-stat-label">Records</div><div class="drill-stat-value purple">${drill.data.length.toLocaleString()}</div></div>
        <div class="drill-stat"><div class="drill-stat-label">Gross</div><div class="drill-stat-value blue">${formatFullCurrency(gross)}</div></div>
        <div class="drill-stat"><div class="drill-stat-label">Alloc</div><div class="drill-stat-value green">${formatFullCurrency(alloc)}</div></div>
        <div class="drill-stat"><div class="drill-stat-label">Net</div><div class="drill-stat-value orange">${formatFullCurrency(gross + alloc)}</div></div>
        <div class="drill-stat"><div class="drill-stat-label">Divisions</div><div class="drill-stat-value purple">${divs.size}</div></div>
        <div class="drill-stat"><div class="drill-stat-label">Depts</div><div class="drill-stat-value purple">${depts.size}</div></div>
    `;
}

function applyDrillFilters() {
    let data = [...drill.data];
    if (drill.search) {
        const q = drill.search.toLowerCase();
        data = data.filter(r => String(r['Division Name']||'').toLowerCase().includes(q) || String(r['Department']||'').toLowerCase().includes(q) || String(r['Job']||'').toLowerCase().includes(q) || String(r['Description']||'').toLowerCase().includes(q) || String(r['Cost Type']||'').toLowerCase().includes(q));
    }
    data.sort((a, b) => {
        let av = a[drill.sortCol], bv = b[drill.sortCol];
        if (drill.sortCol === 'Actual Amount') { av = av || 0; bv = bv || 0; } else { av = String(av||'').toLowerCase(); bv = String(bv||'').toLowerCase(); }
        if (av < bv) return drill.sortDir === 'asc' ? -1 : 1;
        if (av > bv) return drill.sortDir === 'asc' ? 1 : -1;
        return 0;
    });
    drill.filtered = data;
    renderDrillTable();
    updateDrillPagination();
}

function renderDrillTable() {
    const tbody = document.getElementById('drillTableBody');
    const start = (drill.page - 1) * drill.pageSize;
    const pageData = drill.filtered.slice(start, start + drill.pageSize);
    if (pageData.length === 0) { tbody.innerHTML = '<tr><td colspan="9"><div class="drill-empty">No transactions found</div></td></tr>'; return; }

    // Calculate max amount for data bars
    const amounts = pageData.map(r => Math.abs(r['Actual Amount'] || 0));
    const maxAmount = Math.max(...amounts, 1);

    tbody.innerHTML = pageData.map(r => {
        const amt = r['Actual Amount'] || 0;
        const jt = r['Job Type'] || '';
        const barWidth = Math.round((Math.abs(amt) / maxAmount) * 100);
        const barColor = amt >= 0 ? 'var(--accent-blue)' : 'var(--accent-green)';
        const dataBar = `<div class="amount-bar" style="width: ${barWidth}%; background: ${barColor}"></div>`;
        return `<tr><td class="col-date">${r['G/L Date'] || '\u2014'}</td><td>${escapeHtml((r['Division Name']||'').substring(0, 25))}</td><td>${escapeHtml(r['Department'] || '\u2014')}</td><td class="col-job">${r['Job'] || '\u2014'}</td><td><span class="job-badge ${jt.toLowerCase()}">${jt || '\u2014'}</span></td><td title="${escapeHtml(r['Description']||'')}">${escapeHtml((r['Description']||'').substring(0, 30))}</td><td title="${escapeHtml(r['Cost Type']||'')}">${escapeHtml((r['Cost Type']||'').substring(0, 25))}</td><td class="col-amount ${amt >= 0 ? 'positive' : 'negative'}"><div class="amount-cell">${dataBar}<span class="amount-value">${formatFullCurrency(amt)}</span></div></td><td>${r['Document Type'] || '\u2014'}</td></tr>`;
    }).join('');
    document.querySelectorAll('#drillTable th').forEach(th => { th.classList.remove('sorted'); const icon = th.querySelector('.sort-icon'); if (icon) icon.textContent = '\u2195'; });
    const sortedTh = document.querySelector(`#drillTable th[data-col="${drill.sortCol}"]`);
    if (sortedTh) { sortedTh.classList.add('sorted'); sortedTh.querySelector('.sort-icon').textContent = drill.sortDir === 'asc' ? '\u2191' : '\u2193'; }
}

function updateDrillPagination() {
    const total = drill.filtered.length;
    const start = Math.min((drill.page - 1) * drill.pageSize + 1, total);
    const end = Math.min(drill.page * drill.pageSize, total);
    document.getElementById('drillPageInfo').textContent = total > 0 ? `${start}-${end} of ${total.toLocaleString()}` : 'No results';
    document.getElementById('drillPrevPage').disabled = drill.page <= 1;
    document.getElementById('drillNextPage').disabled = drill.page >= Math.ceil(total / drill.pageSize);
}

function exportCsv() {
    if (drill.filtered.length === 0) return;
    const headers = ['G/L Date', 'Division Name', 'Department', 'Job', 'Job Type', 'Description', 'Cost Type', 'Actual Amount', 'Document Type'];
    const csv = [headers.join(','), ...drill.filtered.map(r => headers.map(h => { let v = r[h] ?? ''; if (typeof v === 'string' && (v.includes(',') || v.includes('"'))) v = '"' + v.replace(/"/g, '""') + '"'; return v; }).join(','))].join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = `drillthrough_${new Date().toISOString().slice(0, 10)}.csv`; link.click();
}

function exportExcel() {
    if (drill.filtered.length === 0) return;
    if (typeof XLSX === 'undefined') { exportCsv(); return; }
    const headers = ['G/L Date', 'Division Name', 'Department', 'Job', 'Job Type', 'Description', 'Cost Type', 'Actual Amount', 'Document Type'];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...drill.filtered.map(r => headers.map(h => r[h] ?? ''))]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Data'); XLSX.writeFile(wb, `drillthrough_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
