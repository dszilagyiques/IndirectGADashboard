// === MONTHLY TREND CHART (MAIN FOCUS) ===

function aggregateMonthlyData(data) {
    // Use cached metrics if available
    if (cachedMetrics && cachedMetrics.monthlyAgg && Object.keys(cachedMetrics.monthlyAgg).length > 0) {
        return cachedMetrics.monthlyAgg;
    }

    // Fallback: compute from scratch
    const monthlyAgg = {};
    data.forEach(r => {
        const m = (r['G/L Date'] || '').substring(0, 7);
        if (!m) return;
        if (!monthlyAgg[m]) monthlyAgg[m] = { total: 0, gross: 0, alloc: 0, ga: 0, in: 0, manhours: 0, byDiv: {}, byDept: {}, byDeptCat: {} };
        const amt = r['Actual Amount'] || 0;
        const ct = String(r['Cost Type'] || '');
        const isAlloc = ct.startsWith('693');

        monthlyAgg[m].total += amt;
        if (isAlloc) monthlyAgg[m].alloc += amt; else monthlyAgg[m].gross += amt;
        if (r['Job Type'] === 'GA') monthlyAgg[m].ga += amt;
        else if (r['Job Type'] === 'IN') monthlyAgg[m].in += amt;

        // Track manhours for T1-T4 document types
        const docType = r['Document Type'] || '';
        if (MANHOUR_DOC_TYPES.includes(docType)) {
            monthlyAgg[m].manhours += Math.abs(r['Actual Units'] || 0);
        }

        if (!isAlloc) {
            const div = r['Division Name'] || 'Unknown';
            const dept = r['Department'] || 'Unknown';
            const deptCat = r['Dept_Category'] || 'Other';
            monthlyAgg[m].byDiv[div] = (monthlyAgg[m].byDiv[div] || 0) + amt;
            monthlyAgg[m].byDept[dept] = (monthlyAgg[m].byDept[dept] || 0) + amt;
            monthlyAgg[m].byDeptCat[deptCat] = (monthlyAgg[m].byDeptCat[deptCat] || 0) + amt;
        }
    });
    return monthlyAgg;
}

// Aggregate data by a dimension for comparison mode
function aggregateByDimension(data, dimension) {
    const result = {};
    data.forEach(r => {
        const ct = String(r['Cost Type'] || '');
        const isAlloc = ct.startsWith('693');
        if (isAlloc) return; // Exclude allocations for breakdown views

        let key;
        switch (dimension) {
            case 'division': key = r['Division Name'] || 'Unknown'; break;
            case 'department': key = r['Department'] || 'Unknown'; break;
            case 'deptcat': key = r['Dept_Category'] || 'Other'; break;
            case 'jobtype': key = r['Job Type'] || 'Unknown'; break;
            default: key = 'Unknown';
        }
        result[key] = (result[key] || 0) + (r['Actual Amount'] || 0);
    });
    return result;
}

// Aggregate GA vs IN data including allocations for totals
function aggregateJobTypeData(data) {
    const result = { GA: 0, IN: 0 };
    data.forEach(r => {
        const jt = r['Job Type'];
        if (jt === 'GA') result.GA += (r['Actual Amount'] || 0);
        else if (jt === 'IN') result.IN += (r['Actual Amount'] || 0);
    });
    return result;
}

function renderMonthlyTrend() {
    const ctx = document.getElementById('monthlyTrendChart').getContext('2d');
    if (charts.monthly) charts.monthly.destroy();

    // Comparison mode: show grouped bar chart based on trendView
    if (comparisonMode && periodAData.length > 0 && periodBData.length > 0) {
        const aggA = aggregateMonthlyData(periodAData);
        const aggB = aggregateMonthlyData(periodBData);

        const monthsA = Object.keys(aggA).sort();
        const monthsB = Object.keys(aggB).sort();

        // Build subtitle with actual date ranges
        const formatRange = (months) => {
            if (months.length === 0) return 'No data';
            if (months.length === 1) return formatMonthLabel(months[0]);
            return `${formatMonthLabel(months[0])} - ${formatMonthLabel(months[months.length - 1])}`;
        };
        const subtitleA = formatRange(monthsA);
        const subtitleB = formatRange(monthsB);

        let labels, datasets, subtitle, chartOptions;

        if (trendView === 'summary') {
            // Summary view: monthly comparison with gross/net
            const maxMonths = Math.max(monthsA.length, monthsB.length);
            labels = Array.from({ length: maxMonths }, (_, i) => `Month ${i + 1}`);

            const grossA = monthsA.map(m => aggA[m].gross);
            const grossB = monthsB.map(m => aggB[m].gross);
            const netA = monthsA.map(m => aggA[m].gross + aggA[m].alloc);
            const netB = monthsB.map(m => aggB[m].gross + aggB[m].alloc);

            subtitle = `Period A (${subtitleA}) vs Period B (${subtitleB})`;
            datasets = [
                {
                    label: 'Period A - Gross',
                    data: grossA,
                    backgroundColor: COLORS.blue + 'cc',
                    borderColor: COLORS.blue,
                    borderWidth: 1,
                    borderRadius: 6,
                    barPercentage: 0.4,
                    categoryPercentage: 0.8,
                    order: 3,
                    monthsRef: monthsA
                },
                {
                    label: 'Period B - Gross',
                    data: grossB,
                    backgroundColor: COLORS.purple + 'cc',
                    borderColor: COLORS.purple,
                    borderWidth: 1,
                    borderRadius: 6,
                    barPercentage: 0.4,
                    categoryPercentage: 0.8,
                    order: 4,
                    monthsRef: monthsB
                },
                {
                    label: 'Period A - Net',
                    data: netA,
                    type: 'line',
                    borderColor: COLORS.orange,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: COLORS.orange,
                    order: 1,
                    monthsRef: monthsA
                },
                {
                    label: 'Period B - Net',
                    data: netB,
                    type: 'line',
                    borderColor: COLORS.pink,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: COLORS.pink,
                    order: 2,
                    monthsRef: monthsB
                }
            ];

            chartOptions = {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', labels: { color: '#8b949e', usePointStyle: true, padding: 15, font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            title: (items) => {
                                if (!items.length) return '';
                                const idx = items[0].dataIndex;
                                const monthA = monthsA[idx] ? formatMonthLabel(monthsA[idx]) : '-';
                                const monthB = monthsB[idx] ? formatMonthLabel(monthsB[idx]) : '-';
                                return `A: ${monthA}  |  B: ${monthB}`;
                            },
                            label: ctx => ctx.dataset.label + ': ' + formatCurrency(ctx.raw)
                        }
                    }
                },
                scales: {
                    x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e' } },
                    y: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', callback: v => formatCurrency(v) } }
                }
            };
        } else if (trendView === 'by-jobtype') {
            // GA vs IN comparison
            const jtA = aggregateJobTypeData(periodAData);
            const jtB = aggregateJobTypeData(periodBData);

            labels = ['G&A', 'Indirect'];
            subtitle = `G&A vs Indirect: Period A (${subtitleA}) vs Period B (${subtitleB})`;

            datasets = [
                {
                    label: 'Period A',
                    data: [jtA.GA, jtA.IN],
                    backgroundColor: COLORS.blue + 'cc',
                    borderColor: COLORS.blue,
                    borderWidth: 1,
                    borderRadius: 6,
                    barPercentage: 0.4,
                    categoryPercentage: 0.7
                },
                {
                    label: 'Period B',
                    data: [jtB.GA, jtB.IN],
                    backgroundColor: COLORS.purple + 'cc',
                    borderColor: COLORS.purple,
                    borderWidth: 1,
                    borderRadius: 6,
                    barPercentage: 0.4,
                    categoryPercentage: 0.7
                }
            ];

            chartOptions = {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', labels: { color: '#8b949e', usePointStyle: true, padding: 15, font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: ctx => ctx.dataset.label + ': ' + formatCurrency(ctx.raw)
                        }
                    }
                },
                scales: {
                    x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e' } },
                    y: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', callback: v => formatCurrency(v) } }
                }
            };
        } else {
            // By Division, Department, or Dept Category breakdown
            const dimensionMap = { 'by-division': 'division', 'by-department': 'department', 'by-deptcat': 'deptcat' };
            const labelMap = { 'by-division': 'Division', 'by-department': 'Department', 'by-deptcat': 'Dept Category' };
            const dimension = dimensionMap[trendView];

            const dataA = aggregateByDimension(periodAData, dimension);
            const dataB = aggregateByDimension(periodBData, dimension);

            // Get all unique keys from both periods, sort by combined total
            const allKeys = [...new Set([...Object.keys(dataA), ...Object.keys(dataB)])];
            const sortedKeys = allKeys
                .map(k => ({ key: k, total: (dataA[k] || 0) + (dataB[k] || 0) }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 15) // Top 15
                .map(d => d.key);

            labels = sortedKeys.map(k => k.length > 20 ? k.substring(0, 18) + '...' : k);
            subtitle = `${labelMap[trendView]}: Period A (${subtitleA}) vs Period B (${subtitleB})`;

            datasets = [
                {
                    label: 'Period A',
                    data: sortedKeys.map(k => dataA[k] || 0),
                    backgroundColor: COLORS.blue + 'cc',
                    borderColor: COLORS.blue,
                    borderWidth: 1,
                    borderRadius: 6,
                    barPercentage: 0.4,
                    categoryPercentage: 0.8
                },
                {
                    label: 'Period B',
                    data: sortedKeys.map(k => dataB[k] || 0),
                    backgroundColor: COLORS.purple + 'cc',
                    borderColor: COLORS.purple,
                    borderWidth: 1,
                    borderRadius: 6,
                    barPercentage: 0.4,
                    categoryPercentage: 0.8
                }
            ];

            // Store full labels for drill-through
            const fullLabels = sortedKeys;

            chartOptions = {
                indexAxis: 'y',
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', labels: { color: '#8b949e', usePointStyle: true, padding: 15, font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            title: (items) => items.length ? fullLabels[items[0].dataIndex] : '',
                            label: ctx => ctx.dataset.label + ': ' + formatCurrency(ctx.raw),
                            afterBody: (items) => {
                                if (!items.length) return [];
                                const idx = items[0].dataIndex;
                                const valA = dataA[fullLabels[idx]] || 0;
                                const valB = dataB[fullLabels[idx]] || 0;
                                const diff = valB - valA;
                                const pct = valA !== 0 ? ((diff / Math.abs(valA)) * 100).toFixed(1) : (valB !== 0 ? '100.0' : '0.0');
                                const arrow = diff > 0 ? '\u25b2' : (diff < 0 ? '\u25bc' : '-');
                                return [
                                    '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
                                    `Variance: ${arrow} ${formatCurrency(diff)} (${pct}%)`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', callback: v => formatCurrency(v) } },
                    y: { grid: { color: '#21262d' }, ticks: { color: '#8b949e' } }
                }
            };
        }

        document.getElementById('monthlyTrendSubtitle').textContent = subtitle;

        charts.monthly = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: chartOptions
        });
        return;
    }

    // Standard mode
    const monthlyAgg = aggregateMonthlyData(filteredData);
    const months = Object.keys(monthlyAgg).sort();
    const labels = months.map(formatMonthLabel);
    let datasets = [];
    let subtitle = '';

    if (trendView === 'summary') {
        subtitle = 'Showing gross costs, allocations, net total, and manhours';
        const hasManhours = months.some(m => monthlyAgg[m].manhours > 0);
        datasets = [
            { label: 'Gross Costs', data: months.map(m => monthlyAgg[m].gross), backgroundColor: COLORS.blue + 'cc', order: 3, yAxisID: 'y' },
            { label: 'Allocations', data: months.map(m => Math.abs(monthlyAgg[m].alloc)), backgroundColor: COLORS.green + 'cc', order: 4, yAxisID: 'y' },
            { label: 'Net', data: months.map(m => monthlyAgg[m].gross + monthlyAgg[m].alloc), type: 'line', borderColor: COLORS.orange, backgroundColor: 'transparent', borderWidth: 3, pointRadius: 4, pointBackgroundColor: COLORS.orange, tension: 0.3, order: 2, yAxisID: 'y' }
        ];
        if (hasManhours) {
            datasets.push({
                label: 'Manhours',
                data: months.map(m => monthlyAgg[m].manhours),
                type: 'line',
                borderColor: COLORS.cyan,
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 3],
                pointRadius: 3,
                pointBackgroundColor: COLORS.cyan,
                tension: 0.3,
                order: 1,
                yAxisID: 'y1'
            });
        }
    } else if (trendView === 'by-jobtype') {
        subtitle = 'G&A vs Indirect comparison';
        datasets = [
            { label: 'G&A', data: months.map(m => monthlyAgg[m].ga), backgroundColor: COLORS.purple + 'cc', stack: 'stack1' },
            { label: 'Indirect', data: months.map(m => monthlyAgg[m].in), backgroundColor: COLORS.cyan + 'cc', stack: 'stack1' }
        ];
    } else {
        // Show all items by total
        const keyMap = { 'by-division': 'byDiv', 'by-department': 'byDept', 'by-deptcat': 'byDeptCat' };
        const key = keyMap[trendView];
        const labelMap = { 'by-division': 'division', 'by-department': 'department', 'by-deptcat': 'dept category' };
        subtitle = `All ${labelMap[trendView]}${trendView === 'by-deptcat' ? 'ies' : 's'} by total cost`;

        // Sum totals across all months for ranking
        const totals = {};
        months.forEach(m => {
            Object.entries(monthlyAgg[m][key] || {}).forEach(([k, v]) => {
                totals[k] = (totals[k] || 0) + v;
            });
        });

        // Sort by total descending and show all items
        const allItems = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(d => d[0]);

        datasets = allItems.map((item, i) => ({
            label: item.length > 20 ? item.substring(0, 18) + '...' : item,
            data: months.map(m => (monthlyAgg[m][key] || {})[item] || 0),
            backgroundColor: PALETTE[i % PALETTE.length] + 'cc',
            stack: 'stack1'
        }));
    }

    document.getElementById('monthlyTrendSubtitle').textContent = subtitle;

    charts.monthly = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { color: '#8b949e', usePointStyle: true, padding: 15, font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        title: (items) => {
                            if (!items.length) return '';
                            const idx = items[0].dataIndex;
                            const currentMonth = months[idx];
                            return formatMonthLabel(currentMonth);
                        },
                        label: ctx => {
                            if (ctx.dataset.label === 'Manhours') {
                                return ctx.dataset.label + ': ' + ctx.raw.toLocaleString() + ' hrs';
                            }
                            return ctx.dataset.label + ': ' + formatCurrency(ctx.raw);
                        },
                        afterBody: (items) => {
                            const lines = [];
                            if (trendView === 'summary' && items.length > 0) {
                                const idx = items[0].dataIndex;
                                const currentMonth = months[idx];
                                const prevIdx = idx - 1;

                                // Calculate totals for current month
                                const gross = monthlyAgg[currentMonth].gross;
                                const alloc = monthlyAgg[currentMonth].alloc;
                                const net = gross + alloc;

                                if (prevIdx >= 0) {
                                    const prevMonth = months[prevIdx];
                                    const prevGross = monthlyAgg[prevMonth].gross;
                                    const prevNet = prevGross + monthlyAgg[prevMonth].alloc;

                                    lines.push('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
                                    lines.push(`vs ${formatMonthLabel(prevMonth)}:`);

                                    const grossChange = prevGross !== 0 ? ((gross - prevGross) / Math.abs(prevGross) * 100).toFixed(1) : '0.0';
                                    const netChange = prevNet !== 0 ? ((net - prevNet) / Math.abs(prevNet) * 100).toFixed(1) : '0.0';
                                    const grossArrow = gross > prevGross ? '\u25b2' : (gross < prevGross ? '\u25bc' : '-');
                                    const netArrow = net > prevNet ? '\u25b2' : (net < prevNet ? '\u25bc' : '-');

                                    lines.push(`  Gross: ${grossArrow} ${grossChange}%`);
                                    lines.push(`  Net: ${netArrow} ${netChange}%`);
                                }

                                // Check for same month last year
                                const [year, mon] = currentMonth.split('-');
                                const lastYearMonth = `${parseInt(year) - 1}-${mon}`;
                                if (monthlyAgg[lastYearMonth]) {
                                    const lyGross = monthlyAgg[lastYearMonth].gross;
                                    const lyNet = lyGross + monthlyAgg[lastYearMonth].alloc;

                                    lines.push(`vs ${formatMonthLabel(lastYearMonth)}:`);
                                    const grossYoY = lyGross !== 0 ? ((gross - lyGross) / Math.abs(lyGross) * 100).toFixed(1) : '0.0';
                                    const netYoY = lyNet !== 0 ? ((net - lyNet) / Math.abs(lyNet) * 100).toFixed(1) : '0.0';
                                    const grossYoYArrow = gross > lyGross ? '\u25b2' : (gross < lyGross ? '\u25bc' : '-');
                                    const netYoYArrow = net > lyNet ? '\u25b2' : (net < lyNet ? '\u25bc' : '-');

                                    lines.push(`  Gross: ${grossYoYArrow} ${grossYoY}%`);
                                    lines.push(`  Net: ${netYoYArrow} ${netYoY}%`);
                                }
                            } else if (trendView !== 'summary') {
                                const total = items.reduce((s, i) => s + (i.raw || 0), 0);
                                lines.push('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
                                lines.push(`Total: ${formatCurrency(total)}`);
                            }
                            return lines;
                        }
                    }
                }
            },
            scales: {
                x: { stacked: trendView !== 'summary', grid: { color: '#21262d' }, ticks: { color: '#8b949e' } },
                y: {
                    type: 'linear',
                    position: 'left',
                    stacked: trendView !== 'summary' && trendView !== 'by-jobtype' || trendView === 'by-jobtype',
                    grid: { color: '#21262d' },
                    ticks: { color: '#8b949e', callback: v => formatCurrency(v) }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    display: trendView === 'summary' && months.some(m => monthlyAgg[m].manhours > 0),
                    grid: { display: false },
                    ticks: { color: COLORS.cyan, callback: v => v.toLocaleString() + ' hrs' }
                }
            },
            onClick: (e, el) => {
                if (el.length > 0) {
                    const m = months[el[0].index];
                    openDrill(`${formatMonthLabel(m)}`, `All transactions for ${formatMonthLabel(m)}`, r => (r['G/L Date']||'').startsWith(m));
                }
            }
        }
    });
}
