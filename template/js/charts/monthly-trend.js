// === MONTHLY TREND CHART (MAIN FOCUS) ===

function aggregateMonthlyData(data) {
    const monthlyAgg = {};
    data.forEach(r => {
        const m = (r['G/L Date'] || '').substring(0, 7);
        if (!m) return;
        if (!monthlyAgg[m]) monthlyAgg[m] = { total: 0, gross: 0, alloc: 0, ga: 0, in: 0, byDept: {}, byDiv: {}, byCat: {} };
        const amt = r['Actual Amount'] || 0;
        const ct = String(r['Cost Type'] || '');
        const isAlloc = ct.startsWith('693');

        monthlyAgg[m].total += amt;
        if (isAlloc) monthlyAgg[m].alloc += amt; else monthlyAgg[m].gross += amt;
        if (r['Job Type'] === 'GA') monthlyAgg[m].ga += amt;
        else if (r['Job Type'] === 'IN') monthlyAgg[m].in += amt;

        if (!isAlloc) {
            const dept = r['Department'] || 'Unknown';
            const div = r['Division Name'] || 'Unknown';
            const cat = r['Category'] || 'Other';
            monthlyAgg[m].byDept[dept] = (monthlyAgg[m].byDept[dept] || 0) + amt;
            monthlyAgg[m].byDiv[div] = (monthlyAgg[m].byDiv[div] || 0) + amt;
            monthlyAgg[m].byCat[cat] = (monthlyAgg[m].byCat[cat] || 0) + amt;
        }
    });
    return monthlyAgg;
}

function renderMonthlyTrend() {
    const ctx = document.getElementById('monthlyTrendChart').getContext('2d');
    if (charts.monthly) charts.monthly.destroy();

    // Comparison mode: show overlaid line chart
    if (comparisonMode && periodAData.length > 0 && periodBData.length > 0) {
        const aggA = aggregateMonthlyData(periodAData);
        const aggB = aggregateMonthlyData(periodBData);

        const monthsA = Object.keys(aggA).sort();
        const monthsB = Object.keys(aggB).sort();

        // For comparison, use month numbers (Jan, Feb, etc.) as labels
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const maxMonths = Math.max(monthsA.length, monthsB.length);
        const labels = Array.from({ length: maxMonths }, (_, i) => monthNames[i % 12]);

        const grossA = monthsA.map(m => aggA[m].gross);
        const grossB = monthsB.map(m => aggB[m].gross);
        const netA = monthsA.map(m => aggA[m].gross + aggA[m].alloc);
        const netB = monthsB.map(m => aggB[m].gross + aggB[m].alloc);

        document.getElementById('monthlyTrendSubtitle').textContent = 'Period A vs Period B comparison';

        charts.monthly = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'Period A - Gross', data: grossA, borderColor: COLORS.blue, backgroundColor: 'transparent', borderWidth: 3, tension: 0.3, pointRadius: 4 },
                    { label: 'Period B - Gross', data: grossB, borderColor: COLORS.purple, backgroundColor: 'transparent', borderWidth: 3, borderDash: [5, 5], tension: 0.3, pointRadius: 4 },
                    { label: 'Period A - Net', data: netA, borderColor: COLORS.orange, backgroundColor: 'transparent', borderWidth: 2, tension: 0.3, pointRadius: 3 },
                    { label: 'Period B - Net', data: netB, borderColor: COLORS.pink, backgroundColor: 'transparent', borderWidth: 2, borderDash: [5, 5], tension: 0.3, pointRadius: 3 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', labels: { color: '#8b949e', usePointStyle: true, padding: 15, font: { size: 11 } } },
                    tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + formatCurrency(ctx.raw) } }
                },
                scales: {
                    x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e' } },
                    y: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', callback: v => formatCurrency(v) } }
                }
            }
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
        subtitle = 'Showing gross costs, allocations, and net total';
        datasets = [
            { label: 'Gross Costs', data: months.map(m => monthlyAgg[m].gross), backgroundColor: COLORS.blue + 'cc', order: 2 },
            { label: 'Allocations', data: months.map(m => Math.abs(monthlyAgg[m].alloc)), backgroundColor: COLORS.green + 'cc', order: 3 },
            { label: 'Net', data: months.map(m => monthlyAgg[m].gross + monthlyAgg[m].alloc), type: 'line', borderColor: COLORS.orange, backgroundColor: 'transparent', borderWidth: 3, pointRadius: 4, pointBackgroundColor: COLORS.orange, tension: 0.3, order: 1 }
        ];
    } else if (trendView === 'by-jobtype') {
        subtitle = 'G&A vs Indirect comparison';
        datasets = [
            { label: 'G&A', data: months.map(m => monthlyAgg[m].ga), backgroundColor: COLORS.purple + 'cc', stack: 'stack1' },
            { label: 'Indirect', data: months.map(m => monthlyAgg[m].in), backgroundColor: COLORS.cyan + 'cc', stack: 'stack1' }
        ];
    } else {
        // Get top N items by total
        const keyMap = { 'by-dept': 'byDept', 'by-division': 'byDiv', 'by-category': 'byCat' };
        const key = keyMap[trendView];
        const labelMap = { 'by-dept': 'department', 'by-division': 'division', 'by-category': 'category' };
        subtitle = `Top ${trendTopN} ${labelMap[trendView]}s by total cost`;

        // Sum totals across all months for ranking
        const totals = {};
        months.forEach(m => {
            Object.entries(monthlyAgg[m][key] || {}).forEach(([k, v]) => {
                totals[k] = (totals[k] || 0) + v;
            });
        });

        const topItems = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, trendTopN).map(d => d[0]);

        datasets = topItems.map((item, i) => ({
            label: item.length > 20 ? item.substring(0, 18) + '...' : item,
            data: months.map(m => (monthlyAgg[m][key] || {})[item] || 0),
            backgroundColor: PALETTE[i % PALETTE.length] + 'cc',
            stack: 'stack1'
        }));

        // Add "Other" for remaining
        const otherData = months.map(m => {
            const monthTotal = Object.values(monthlyAgg[m][key] || {}).reduce((s, v) => s + v, 0);
            const topTotal = topItems.reduce((s, item) => s + ((monthlyAgg[m][key] || {})[item] || 0), 0);
            return monthTotal - topTotal;
        });
        if (otherData.some(v => v > 0)) {
            datasets.push({ label: 'Other', data: otherData, backgroundColor: '#484f58cc', stack: 'stack1' });
        }
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
                        label: ctx => ctx.dataset.label + ': ' + formatCurrency(ctx.raw),
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
                y: { stacked: trendView !== 'summary' && trendView !== 'by-jobtype' || trendView === 'by-jobtype', grid: { color: '#21262d' }, ticks: { color: '#8b949e', callback: v => formatCurrency(v) } }
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
