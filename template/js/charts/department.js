// === DEPARTMENT CHART ===

function aggregateDeptData(data) {
    const deptData = {};
    data.forEach(r => {
        if (!String(r['Cost Type']||'').startsWith('693')) {
            const dept = r['Department'] || 'Unknown';
            deptData[dept] = (deptData[dept] || 0) + (r['Actual Amount'] || 0);
        }
    });
    return deptData;
}

function renderDepartmentChart() {
    const ctx = document.getElementById('departmentChart').getContext('2d');
    if (charts.dept) charts.dept.destroy();

    if (comparisonMode && periodAData.length > 0 && periodBData.length > 0) {
        const deptDataA = aggregateDeptData(periodAData);
        const deptDataB = aggregateDeptData(periodBData);

        // Combine keys from both periods
        const allDepts = [...new Set([...Object.keys(deptDataA), ...Object.keys(deptDataB)])];
        const sorted = allDepts
            .map(d => ({ name: d, a: deptDataA[d] || 0, b: deptDataB[d] || 0 }))
            .sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b));

        const labels = sorted.map(d => d.name);
        const valuesA = sorted.map(d => d.a);
        const valuesB = sorted.map(d => d.b);

        charts.dept = new Chart(ctx, {
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
                            label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`,
                            afterBody: (items) => {
                                if (items.length === 2) {
                                    const diff = items[1].raw - items[0].raw;
                                    const pct = items[0].raw !== 0 ? ((diff / Math.abs(items[0].raw)) * 100).toFixed(1) : '0';
                                    return [`Variance: ${formatCurrency(diff)} (${diff >= 0 ? '+' : ''}${pct}%)`];
                                }
                                return [];
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', callback: v => formatCurrency(v) } },
                    y: { grid: { display: false }, ticks: { color: '#8b949e', font: { size: 10 } } }
                },
                onClick: (e, el) => { if (el.length > 0) openDrill(labels[el[0].index], `All transactions for ${labels[el[0].index]}`, r => r['Department'] === labels[el[0].index]); }
            }
        });
        return;
    }

    const deptData = aggregateDeptData(filteredData);
    const sorted = Object.entries(deptData).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(d => d[0]);
    const values = sorted.map(d => d[1]);

    const total = values.reduce((s, v) => s + v, 0);

    charts.dept = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ data: values, backgroundColor: sorted.map((_, i) => PALETTE[i % PALETTE.length]), borderRadius: 4 }] },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
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
            onClick: (e, el) => { if (el.length > 0) openDrill(labels[el[0].index], `All transactions for ${labels[el[0].index]}`, r => r['Department'] === labels[el[0].index]); }
        }
    });
}
