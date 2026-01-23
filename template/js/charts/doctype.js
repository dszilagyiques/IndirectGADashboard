// === DOCUMENT TYPE CHART ===

function aggregateDocTypeData(data) {
    const dtData = {};
    data.forEach(r => { const dt = r['Document Type'] || '?'; if (!dtData[dt]) dtData[dt] = { count: 0 }; dtData[dt].count++; });
    return dtData;
}

function renderDocTypeChart() {
    const ctx = document.getElementById('docTypeChart').getContext('2d');
    if (charts.docType) charts.docType.destroy();

    if (comparisonMode && periodAData.length > 0 && periodBData.length > 0) {
        const dtDataA = aggregateDocTypeData(periodAData);
        const dtDataB = aggregateDocTypeData(periodBData);

        const allDts = [...new Set([...Object.keys(dtDataA), ...Object.keys(dtDataB)])];
        const sorted = allDts
            .map(d => ({ code: d, a: (dtDataA[d] || { count: 0 }).count, b: (dtDataB[d] || { count: 0 }).count }))
            .sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b))
            .slice(0, 10);

        const codes = sorted.map(d => d.code);
        const labels = sorted.map(d => `${d.code} - ${(DOC_TYPE_NAMES[d.code] || 'Unknown').substring(0, 18)}`);
        const valuesA = sorted.map(d => d.a);
        const valuesB = sorted.map(d => d.b);

        charts.docType = new Chart(ctx, {
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
                    tooltip: {
                        callbacks: {
                            title: items => `${codes[items[0].dataIndex]} - ${DOC_TYPE_NAMES[codes[items[0].dataIndex]] || 'Unknown'}`,
                            label: ctx => `${ctx.dataset.label}: ${ctx.raw.toLocaleString()} transactions`
                        }
                    }
                },
                scales: {
                    x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e' } },
                    y: { grid: { display: false }, ticks: { color: '#8b949e', font: { size: 10 } } }
                },
                onClick: (e, el) => { if (el.length > 0) openDrill(`${codes[el[0].index]} - ${DOC_TYPE_NAMES[codes[el[0].index]] || 'Unknown'}`, `All ${DOC_TYPE_NAMES[codes[el[0].index]] || codes[el[0].index]} transactions`, r => r['Document Type'] === codes[el[0].index]); }
            }
        });
        return;
    }

    const dtData = aggregateDocTypeData(filteredData);
    const sorted = Object.entries(dtData).sort((a, b) => b[1].count - a[1].count).slice(0, 10);
    const codes = sorted.map(d => d[0]);
    const labels = sorted.map(d => `${d[0]} - ${(DOC_TYPE_NAMES[d[0]] || 'Unknown').substring(0, 18)}`);
    const values = sorted.map(d => d[1].count);

    charts.docType = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ data: values, backgroundColor: PALETTE, borderRadius: 4 }] },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { title: items => `${codes[items[0].dataIndex]} - ${DOC_TYPE_NAMES[codes[items[0].dataIndex]] || 'Unknown'}`, label: ctx => `${ctx.raw.toLocaleString()} transactions` } } },
            scales: { x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e' } }, y: { grid: { display: false }, ticks: { color: '#8b949e', font: { size: 10 } } } },
            onClick: (e, el) => { if (el.length > 0) openDrill(`${codes[el[0].index]} - ${DOC_TYPE_NAMES[codes[el[0].index]] || 'Unknown'}`, `All ${DOC_TYPE_NAMES[codes[el[0].index]] || codes[el[0].index]} transactions`, r => r['Document Type'] === codes[el[0].index]); }
        }
    });
}
