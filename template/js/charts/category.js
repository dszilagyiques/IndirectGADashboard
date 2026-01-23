// === CATEGORY CHART ===

function aggregateCatData(data) {
    const catData = {};
    data.forEach(r => { const cat = r['Category'] || 'Other'; catData[cat] = (catData[cat] || 0) + (r['Actual Amount'] || 0); });
    return catData;
}

function renderCategoryChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    if (charts.category) charts.category.destroy();

    if (comparisonMode && periodAData.length > 0 && periodBData.length > 0) {
        const catDataA = aggregateCatData(periodAData);
        const catDataB = aggregateCatData(periodBData);

        const allCats = [...new Set([...Object.keys(catDataA), ...Object.keys(catDataB)])];
        const sorted = allCats
            .map(c => ({ name: c, a: catDataA[c] || 0, b: catDataB[c] || 0 }))
            .sort((x, y) => Math.max(Math.abs(y.a), Math.abs(y.b)) - Math.max(Math.abs(x.a), Math.abs(x.b)));

        const labels = sorted.map(d => d.name);
        const valuesA = sorted.map(d => d.a);
        const valuesB = sorted.map(d => d.b);

        charts.category = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Period A', data: valuesA, backgroundColor: COLORS.blue + 'cc', borderRadius: 4 },
                    { label: 'Period B', data: valuesB, backgroundColor: COLORS.purple + '99', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'top', labels: { color: '#8b949e', usePointStyle: true, padding: 10 } },
                    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` } }
                },
                scales: {
                    x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', font: { size: 10 } } },
                    y: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', callback: v => formatCurrency(v) } }
                },
                onClick: (e, el) => { if (el.length > 0) openDrill(labels[el[0].index], `All ${labels[el[0].index]} transactions`, r => r['Category'] === labels[el[0].index]); }
            }
        });
        return;
    }

    const catData = aggregateCatData(filteredData);
    const sorted = Object.entries(catData).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const labels = sorted.map(d => d[0]);
    const values = sorted.map(d => d[1]);
    const colors = sorted.map(d => CATEGORY_COLORS[d[0]] || COLORS.gray);
    const total = values.reduce((s, v) => s + Math.abs(v), 0);

    charts.category = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values.map(Math.abs), backgroundColor: colors, borderWidth: 0 }] },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '60%',
            plugins: { legend: { position: 'right', labels: { color: '#8b949e', usePointStyle: true, padding: 8, font: { size: 10 } } }, tooltip: { callbacks: { label: ctx => ctx.label + ': ' + formatCurrency(values[ctx.dataIndex]) + ' (' + (ctx.raw / total * 100).toFixed(1) + '%)' } } },
            onClick: (e, el) => { if (el.length > 0) openDrill(labels[el[0].index], `All ${labels[el[0].index]} transactions`, r => r['Category'] === labels[el[0].index]); }
        }
    });
}
