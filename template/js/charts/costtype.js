// === COST TYPE CHART ===

function aggregateCostTypeData(data) {
    const ctData = {};
    data.forEach(r => {
        if (!String(r['Cost Type']||'').startsWith('693')) {
            const ct = r['Description'] || r['Cost Type'] || 'Unknown';
            ctData[ct] = (ctData[ct] || 0) + (r['Actual Amount'] || 0);
        }
    });
    return ctData;
}

function renderCostTypeChart() {
    const ctx = document.getElementById('costTypeChart').getContext('2d');
    if (charts.costType) charts.costType.destroy();

    if (comparisonMode && periodAData.length > 0 && periodBData.length > 0) {
        const ctDataA = aggregateCostTypeData(periodAData);
        const ctDataB = aggregateCostTypeData(periodBData);

        const allCts = [...new Set([...Object.keys(ctDataA), ...Object.keys(ctDataB)])];
        const sorted = allCts
            .map(c => ({ name: c, a: ctDataA[c] || 0, b: ctDataB[c] || 0 }))
            .sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b))
            .slice(0, 15);

        const labels = sorted.map(d => d.name.length > 35 ? d.name.substring(0, 32) + '...' : d.name);
        const fullLabels = sorted.map(d => d.name);
        const valuesA = sorted.map(d => d.a);
        const valuesB = sorted.map(d => d.b);

        charts.costType = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Period A', data: valuesA, backgroundColor: COLORS.blue + 'cc', borderRadius: 4 },
                    { label: 'Period B', data: valuesB, backgroundColor: COLORS.purple + '99', borderRadius: 4 }
                ]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'top', labels: { color: '#8b949e', usePointStyle: true, padding: 10 } },
                    tooltip: { callbacks: { title: items => fullLabels[items[0].dataIndex], label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` } }
                },
                scales: {
                    x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', callback: v => formatCurrency(v) } },
                    y: { grid: { display: false }, ticks: { color: '#8b949e', font: { size: 10 } } }
                },
                onClick: (e, el) => { if (el.length > 0) openDrill(fullLabels[el[0].index], `All transactions for this cost type`, r => (r['Description'] || r['Cost Type']) === fullLabels[el[0].index]); }
            }
        });
        return;
    }

    const ctData = aggregateCostTypeData(filteredData);
    const sorted = Object.entries(ctData).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const labels = sorted.map(d => d[0].length > 35 ? d[0].substring(0, 32) + '...' : d[0]);
    const fullLabels = sorted.map(d => d[0]);
    const values = sorted.map(d => d[1]);

    charts.costType = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ data: values, backgroundColor: COLORS.cyan, borderRadius: 4 }] },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { title: items => fullLabels[items[0].dataIndex], label: ctx => formatCurrency(ctx.raw) } } },
            scales: { x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', callback: v => formatCurrency(v) } }, y: { grid: { display: false }, ticks: { color: '#8b949e', font: { size: 10 } } } },
            onClick: (e, el) => { if (el.length > 0) openDrill(fullLabels[el[0].index], `All transactions for this cost type`, r => (r['Description'] || r['Cost Type']) === fullLabels[el[0].index]); }
        }
    });
}
