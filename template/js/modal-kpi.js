// === KPI DETAIL MODAL ===

const KPIDetailModal = (function() {
    let trendChart = null;
    let breakdownChart = null;
    let currentKPI = null;
    let kpiData = [];
    let trendChartType = 'line';
    let breakdownType = 'category';

    // KPI configurations
    const kpiConfigs = {
        gross: {
            title: 'Gross Costs',
            subtitle: 'Total costs before allocation credits',
            color: 'blue',
            filter: (r) => !String(r['Cost Type'] || '').startsWith('693'),
            valueField: 'Actual Amount'
        },
        allocations: {
            title: 'Allocation Credits',
            subtitle: 'Cost recovery through allocations (693xxx)',
            color: 'green',
            filter: (r) => String(r['Cost Type'] || '').startsWith('693'),
            valueField: 'Actual Amount'
        },
        net: {
            title: 'Net Costs',
            subtitle: 'Gross costs minus allocation credits',
            color: 'orange',
            filter: () => true,
            valueField: 'Actual Amount'
        },
        ratio: {
            title: 'G&A vs Indirect',
            subtitle: 'Job type distribution (GA/IN)',
            color: 'purple',
            filter: () => true,
            valueField: 'Actual Amount'
        },
        monthly: {
            title: 'Monthly Average',
            subtitle: 'Average monthly cost over the period',
            color: 'blue',
            filter: () => true,
            valueField: 'Actual Amount'
        }
    };

    /**
     * Open the KPI detail modal
     * @param {string} kpiType - The KPI type to display
     */
    function open(kpiType) {
        currentKPI = kpiType;
        const config = kpiConfigs[kpiType];

        if (!config) {
            console.error('Unknown KPI type:', kpiType);
            return;
        }

        // Filter data for this KPI
        kpiData = filteredData.filter(config.filter);

        // Update header
        document.getElementById('kpiModalTitle').textContent = config.title;
        document.getElementById('kpiModalSubtitle').textContent = config.subtitle;

        // Update summary stats
        updateSummaryStats(config);

        // Reset chart types
        trendChartType = 'line';
        breakdownType = 'category';

        // Update button states
        document.querySelectorAll('[data-kpi-chart]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.kpiChart === trendChartType);
        });
        document.querySelectorAll('[data-kpi-breakdown]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.kpiBreakdown === breakdownType);
        });

        // Render charts
        renderTrendChart();
        renderBreakdownChart();
        renderContributorsTable();

        // Update footer info
        const dateRange = getDateRange();
        document.getElementById('kpiModalFooterInfo').textContent =
            `Showing ${kpiData.length.toLocaleString()} transactions${dateRange}`;

        // Open modal
        ModalManager.open('kpiDetailModal', {
            onClose: cleanup
        });
    }

    /**
     * Update summary statistics
     */
    function updateSummaryStats(config) {
        // Calculate totals
        const total = kpiData.reduce((sum, r) => sum + (r['Actual Amount'] || 0), 0);
        const count = kpiData.length;

        // Calculate monthly average
        const monthlyAgg = {};
        kpiData.forEach(r => {
            const month = (r['G/L Date'] || '').substring(0, 7);
            if (month) {
                monthlyAgg[month] = (monthlyAgg[month] || 0) + (r['Actual Amount'] || 0);
            }
        });
        const months = Object.keys(monthlyAgg);
        const monthlyAvg = months.length > 0 ? total / months.length : 0;

        // Calculate trend (compare last 2 months)
        const sortedMonths = months.sort().slice(-2);
        let trendPct = 0;
        let trendClass = 'neutral';
        if (sortedMonths.length === 2) {
            const prev = monthlyAgg[sortedMonths[0]] || 0;
            const curr = monthlyAgg[sortedMonths[1]] || 0;
            trendPct = prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : 0;
            trendClass = trendPct > 0 ? 'up' : (trendPct < 0 ? 'down' : 'neutral');
        }

        // Update UI
        const totalEl = document.getElementById('kpiModalTotal');
        totalEl.textContent = formatCurrency(total);
        totalEl.className = `kpi-summary-value ${config.color}`;

        document.getElementById('kpiModalCount').textContent = count.toLocaleString();
        document.getElementById('kpiModalAvg').textContent = formatCurrency(monthlyAvg);

        const trendEl = document.getElementById('kpiModalTrend');
        const arrow = trendPct > 0 ? '\u25B2' : (trendPct < 0 ? '\u25BC' : '-');
        trendEl.textContent = `${arrow} ${Math.abs(trendPct).toFixed(1)}% MoM`;
        trendEl.className = `kpi-summary-change ${trendClass}`;
    }

    /**
     * Render the trend chart
     */
    function renderTrendChart() {
        const ctx = document.getElementById('kpiTrendChart').getContext('2d');

        if (trendChart) {
            trendChart.destroy();
        }

        // Aggregate by month
        const monthlyAgg = {};
        kpiData.forEach(r => {
            const month = (r['G/L Date'] || '').substring(0, 7);
            if (month) {
                monthlyAgg[month] = (monthlyAgg[month] || 0) + (r['Actual Amount'] || 0);
            }
        });

        const months = Object.keys(monthlyAgg).sort();
        const labels = months.map(formatMonthLabel);
        const values = months.map(m => monthlyAgg[m]);

        const config = kpiConfigs[currentKPI];
        const color = COLORS[config.color] || COLORS.blue;

        trendChart = new Chart(ctx, {
            type: trendChartType,
            data: {
                labels,
                datasets: [{
                    label: config.title,
                    data: values,
                    backgroundColor: trendChartType === 'bar' ? color + 'cc' : 'transparent',
                    borderColor: color,
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: trendChartType === 'line' ? 4 : 0,
                    pointBackgroundColor: color,
                    fill: trendChartType === 'line',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => formatCurrency(ctx.raw)
                        }
                    }
                },
                scales: {
                    x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e' } },
                    y: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', callback: v => formatCurrency(v) } }
                }
            }
        });
    }

    /**
     * Render the breakdown chart
     */
    function renderBreakdownChart() {
        const ctx = document.getElementById('kpiBreakdownChart').getContext('2d');

        if (breakdownChart) {
            breakdownChart.destroy();
        }

        // Aggregate by breakdown type
        const agg = {};
        const fieldMap = {
            'category': 'Category',
            'department': 'Department',
            'division': 'Division Name'
        };
        const field = fieldMap[breakdownType];

        kpiData.forEach(r => {
            const key = r[field] || 'Unknown';
            agg[key] = (agg[key] || 0) + (r['Actual Amount'] || 0);
        });

        // Sort and take top 8
        const sorted = Object.entries(agg)
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
            .slice(0, 8);

        const labels = sorted.map(d => d[0].length > 15 ? d[0].substring(0, 13) + '...' : d[0]);
        const values = sorted.map(d => d[1]);

        const colors = breakdownType === 'category'
            ? sorted.map(d => CATEGORY_COLORS[d[0]] || COLORS.gray)
            : sorted.map((_, i) => PALETTE[i % PALETTE.length]);

        breakdownChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values.map(Math.abs),
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#8b949e',
                            usePointStyle: true,
                            padding: 8,
                            font: { size: 10 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const total = values.reduce((s, v) => s + Math.abs(v), 0);
                                const pct = total > 0 ? ((Math.abs(ctx.raw) / total) * 100).toFixed(1) : '0.0';
                                return `${formatCurrency(values[ctx.dataIndex])} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Render the top contributors table
     */
    function renderContributorsTable() {
        const tbody = document.getElementById('kpiContributorsBody');

        // Sort by absolute amount and take top 10
        const sorted = [...kpiData]
            .sort((a, b) => Math.abs(b['Actual Amount'] || 0) - Math.abs(a['Actual Amount'] || 0))
            .slice(0, 10);

        const total = kpiData.reduce((s, r) => s + Math.abs(r['Actual Amount'] || 0), 0);

        tbody.innerHTML = sorted.map((r, i) => {
            const amt = r['Actual Amount'] || 0;
            const pct = total > 0 ? (Math.abs(amt) / total) * 100 : 0;
            const config = kpiConfigs[currentKPI];
            const amtClass = amt < 0 ? 'green' : (config.color || 'blue');

            return `
                <tr>
                    <td class="col-rank">${i + 1}</td>
                    <td>${escapeHtml(r['Description'] || r['Cost Type'] || '-')}</td>
                    <td>${escapeHtml(r['Category'] || '-')}</td>
                    <td>${r['G/L Date'] || '-'}</td>
                    <td style="color: var(--accent-${amtClass})">${formatFullCurrency(amt)}</td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Get date range string for footer
     */
    function getDateRange() {
        const dates = kpiData
            .map(r => r['G/L Date'])
            .filter(Boolean)
            .sort();

        if (dates.length < 2) return '';

        return ` from ${dates[0]} to ${dates[dates.length - 1]}`;
    }

    /**
     * Open drill-through for all KPI data
     */
    function openAllTransactions() {
        const config = kpiConfigs[currentKPI];
        ModalManager.close('kpiDetailModal');
        openDrill(config.title, `All ${config.title.toLowerCase()} transactions`, config.filter);
    }

    /**
     * Export KPI data as CSV
     */
    function exportData() {
        if (kpiData.length === 0) return;

        const headers = ['G/L Date', 'Division Name', 'Department', 'Job', 'Job Type', 'Description', 'Cost Type', 'Category', 'Actual Amount', 'Document Type'];
        const csvContent = [
            headers.join(','),
            ...kpiData.map(r => headers.map(h => {
                const val = r[h];
                if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                    return `"${val.replace(/"/g, '""')}"`;
                }
                return val ?? '';
            }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${currentKPI}_data_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
    }

    /**
     * Cleanup on modal close
     */
    function cleanup() {
        if (trendChart) {
            trendChart.destroy();
            trendChart = null;
        }
        if (breakdownChart) {
            breakdownChart.destroy();
            breakdownChart = null;
        }
        currentKPI = null;
        kpiData = [];
    }

    /**
     * Initialize event listeners
     */
    function init() {
        // Trend chart type toggle
        document.querySelectorAll('[data-kpi-chart]').forEach(btn => {
            btn.addEventListener('click', () => {
                trendChartType = btn.dataset.kpiChart;
                document.querySelectorAll('[data-kpi-chart]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderTrendChart();
            });
        });

        // Breakdown type toggle
        document.querySelectorAll('[data-kpi-breakdown]').forEach(btn => {
            btn.addEventListener('click', () => {
                breakdownType = btn.dataset.kpiBreakdown;
                document.querySelectorAll('[data-kpi-breakdown]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderBreakdownChart();
            });
        });

        // View all transactions button
        document.getElementById('kpiModalViewAll')?.addEventListener('click', openAllTransactions);

        // Export button
        document.getElementById('kpiModalExport')?.addEventListener('click', exportData);

        // KPI card click handlers
        document.querySelectorAll('.kpi-card[data-kpi]').forEach(card => {
            card.addEventListener('click', () => {
                const kpiType = card.dataset.kpi;
                if (kpiType) open(kpiType);
            });
        });
    }

    return {
        open,
        init
    };
})();
