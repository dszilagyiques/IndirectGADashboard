// === DIVISION CHART ===

function aggregateDivData(data) {
    const divData = {};
    data.forEach(r => {
        if (!String(r['Cost Type']||'').startsWith('693')) {
            const div = r['Division Name'] || 'Unknown';
            divData[div] = (divData[div] || 0) + (r['Actual Amount'] || 0);
        }
    });
    return divData;
}

function renderDivisionChart() {
    const ctx = document.getElementById('divisionChart').getContext('2d');
    if (charts.division) charts.division.destroy();

    if (comparisonMode && periodAData.length > 0 && periodBData.length > 0) {
        const divDataA = aggregateDivData(periodAData);
        const divDataB = aggregateDivData(periodBData);

        const allDivs = [...new Set([...Object.keys(divDataA), ...Object.keys(divDataB)])];
        const sorted = allDivs
            .map(d => ({ name: d, a: divDataA[d] || 0, b: divDataB[d] || 0 }))
            .sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b))
            .slice(0, 10);

        const labels = sorted.map(d => d.name.length > 25 ? d.name.substring(0, 22) + '...' : d.name);
        const fullLabels = sorted.map(d => d.name);
        const valuesA = sorted.map(d => d.a);
        const valuesB = sorted.map(d => d.b);

        charts.division = new Chart(ctx, {
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
                            title: items => fullLabels[items[0].dataIndex],
                            label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', callback: v => formatCurrency(v) } },
                    y: { grid: { display: false }, ticks: { color: '#8b949e', font: { size: 10 } } }
                },
                onClick: (e, el) => { if (el.length > 0) openDrill(fullLabels[el[0].index], `All transactions for ${fullLabels[el[0].index]}`, r => r['Division Name'] === fullLabels[el[0].index]); }
            }
        });
        return;
    }

    const divData = aggregateDivData(filteredData);
    const sorted = Object.entries(divData).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const labels = sorted.map(d => d[0].length > 25 ? d[0].substring(0, 22) + '...' : d[0]);
    const fullLabels = sorted.map(d => d[0]);
    const values = sorted.map(d => d[1]);

    const total = values.reduce((s, v) => s + v, 0);

    charts.division = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ data: values, backgroundColor: sorted.map((_, i) => PALETTE[i % PALETTE.length]), borderRadius: 4 }] },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: items => fullLabels[items[0].dataIndex],
                        label: ctx => formatCurrency(ctx.raw),
                        afterLabel: ctx => {
                            const pct = total !== 0 ? ((ctx.raw / total) * 100).toFixed(1) : '0.0';
                            const rank = ctx.dataIndex + 1;
                            return `${pct}% of total (Rank #${rank})`;
                        }
                    }
                }
            },
            scales: { x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', callback: v => formatCurrency(v) } }, y: { grid: { display: false }, ticks: { color: '#8b949e', font: { size: 10 } } } },
            onClick: (e, el) => { if (el.length > 0) openDrill(fullLabels[el[0].index], `All transactions for ${fullLabels[el[0].index]}`, r => r['Division Name'] === fullLabels[el[0].index]); }
        }
    });
}
