// === CHART EXPAND MODAL ===

const ChartExpandModal = (function() {
    let expandedChart = null;
    let currentChartId = null;
    let currentChartConfig = null;
    let showDataTable = false;

    // Chart ID to title mapping
    const chartTitles = {
        'monthlyTrendChart': { title: 'Monthly Cost Trend', subtitle: 'Cost trends over time' },
        'departmentChart': { title: 'Cost by Department', subtitle: 'Breakdown by department' },
        'divisionChart': { title: 'Cost by Division', subtitle: 'Top 10 divisions by cost' },
        'categoryChart': { title: 'Cost Categories', subtitle: 'Distribution by cost category' },
        'docTypeChart': { title: 'Transaction Types', subtitle: 'Top 10 document types' },
        'costTypeChart': { title: 'Top Cost Types', subtitle: 'Top 15 cost types by amount' }
    };

    /**
     * Open the expand modal for a chart
     * @param {string} chartId - The canvas ID of the chart to expand
     */
    function open(chartId) {
        currentChartId = chartId;

        // Get the source chart
        const sourceChart = getSourceChart(chartId);
        if (!sourceChart) {
            console.error('Chart not found:', chartId);
            return;
        }

        // Clone the chart configuration
        currentChartConfig = cloneChartConfig(sourceChart);

        // Update modal header
        const titles = chartTitles[chartId] || { title: 'Chart', subtitle: '' };
        document.getElementById('chartExpandTitle').textContent = titles.title;
        document.getElementById('chartExpandSubtitle').textContent = titles.subtitle;

        // Update info stats
        updateInfoStats(chartId, sourceChart);

        // Clear any existing expanded chart
        if (expandedChart) {
            expandedChart.destroy();
            expandedChart = null;
        }

        // Create the expanded chart
        const ctx = document.getElementById('expandedChart').getContext('2d');
        expandedChart = new Chart(ctx, enhanceConfigForExpanded(currentChartConfig));

        // Reset data table state
        showDataTable = false;
        document.getElementById('chartDataTableWrapper').classList.remove('visible');

        // Open the modal
        ModalManager.open('chartExpandModal', {
            onClose: () => {
                if (expandedChart) {
                    expandedChart.destroy();
                    expandedChart = null;
                }
                currentChartId = null;
                currentChartConfig = null;
            }
        });
    }

    /**
     * Get the source Chart.js instance by canvas ID
     */
    function getSourceChart(chartId) {
        switch(chartId) {
            case 'monthlyTrendChart': return charts.monthly;
            case 'departmentChart': return charts.dept;
            case 'divisionChart': return charts.division;
            case 'categoryChart': return charts.category;
            case 'docTypeChart': return charts.docType;
            case 'costTypeChart': return charts.costType;
            default: return null;
        }
    }

    /**
     * Clone a chart configuration for the expanded view
     */
    function cloneChartConfig(chart) {
        return {
            type: chart.config.type,
            data: JSON.parse(JSON.stringify(chart.data)),
            options: JSON.parse(JSON.stringify(chart.options))
        };
    }

    /**
     * Enhance chart config for fullscreen display
     */
    function enhanceConfigForExpanded(config) {
        const enhanced = { ...config };

        // Enhance options for expanded view
        enhanced.options = {
            ...config.options,
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                ...config.options.plugins,
                legend: {
                    ...config.options.plugins?.legend,
                    labels: {
                        ...config.options.plugins?.legend?.labels,
                        padding: 16,
                        font: { size: 13 }
                    }
                },
                tooltip: {
                    ...config.options.plugins?.tooltip,
                    padding: 16,
                    titleFont: { size: 14, weight: 600 },
                    bodyFont: { size: 13 }
                }
            }
        };

        // Enhance scales if present
        if (enhanced.options.scales) {
            if (enhanced.options.scales.x) {
                enhanced.options.scales.x.ticks = {
                    ...enhanced.options.scales.x.ticks,
                    font: { size: 12 }
                };
            }
            if (enhanced.options.scales.y) {
                enhanced.options.scales.y.ticks = {
                    ...enhanced.options.scales.y.ticks,
                    font: { size: 12 }
                };
            }
        }

        // Add click handler for drill-through
        enhanced.options.onClick = (e, el) => {
            if (el.length > 0) {
                // Trigger the same drill-through as the original chart
                triggerDrillThrough(currentChartId, el[0].index);
            }
        };

        return enhanced;
    }

    /**
     * Update the info stats section
     */
    function updateInfoStats(chartId, chart) {
        const infoEl = document.getElementById('chartExpandInfo');

        // Calculate basic stats from chart data
        const datasets = chart.data.datasets;
        let totalValue = 0;
        let itemCount = 0;

        datasets.forEach(ds => {
            if (ds.data) {
                ds.data.forEach(v => {
                    if (typeof v === 'number') {
                        totalValue += v;
                        itemCount++;
                    }
                });
            }
        });

        const avgValue = itemCount > 0 ? totalValue / itemCount : 0;

        infoEl.innerHTML = `
            <div class="chart-modal-stat">
                <span class="chart-modal-stat-label">Total</span>
                <span class="chart-modal-stat-value blue">${formatCurrency(totalValue)}</span>
            </div>
            <div class="chart-modal-stat">
                <span class="chart-modal-stat-label">Data Points</span>
                <span class="chart-modal-stat-value">${itemCount}</span>
            </div>
            <div class="chart-modal-stat">
                <span class="chart-modal-stat-label">Average</span>
                <span class="chart-modal-stat-value">${formatCurrency(avgValue)}</span>
            </div>
        `;
    }

    /**
     * Toggle data table visibility
     */
    function toggleDataTable() {
        showDataTable = !showDataTable;
        const wrapper = document.getElementById('chartDataTableWrapper');

        if (showDataTable && expandedChart) {
            populateDataTable();
            wrapper.classList.add('visible');
        } else {
            wrapper.classList.remove('visible');
        }
    }

    /**
     * Populate the data table from chart data
     */
    function populateDataTable() {
        if (!expandedChart) return;

        const labels = expandedChart.data.labels || [];
        const datasets = expandedChart.data.datasets || [];

        const thead = document.getElementById('chartDataTableHead');
        const tbody = document.getElementById('chartDataTableBody');

        // Build header
        let headerHtml = '<tr><th>Label</th>';
        datasets.forEach(ds => {
            headerHtml += `<th class="col-value">${ds.label || 'Value'}</th>`;
        });
        headerHtml += '</tr>';
        thead.innerHTML = headerHtml;

        // Build body
        let bodyHtml = '';
        labels.forEach((label, idx) => {
            bodyHtml += `<tr><td>${escapeHtml(label)}</td>`;
            datasets.forEach(ds => {
                const value = ds.data[idx];
                const formatted = typeof value === 'number' ? formatCurrency(value) : value;
                bodyHtml += `<td class="col-value">${formatted}</td>`;
            });
            bodyHtml += '</tr>';
        });
        tbody.innerHTML = bodyHtml;
    }

    /**
     * Export chart as PNG
     */
    function exportPNG() {
        if (!expandedChart) return;

        const canvas = document.getElementById('expandedChart');
        const link = document.createElement('a');
        link.download = `${currentChartId || 'chart'}_${new Date().toISOString().slice(0,10)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    /**
     * Trigger drill-through based on chart element click
     */
    function triggerDrillThrough(chartId, index) {
        // Close the expand modal first
        ModalManager.close('chartExpandModal');

        // Get the appropriate filter based on chart type
        const labels = expandedChart?.data?.labels || [];
        const label = labels[index];

        switch(chartId) {
            case 'monthlyTrendChart':
                // Monthly trend uses month prefix filter
                const months = Object.keys(aggregateMonthlyData(filteredData)).sort();
                if (months[index]) {
                    openDrill(formatMonthLabel(months[index]), `All transactions for ${formatMonthLabel(months[index])}`, r => (r['G/L Date']||'').startsWith(months[index]));
                }
                break;
            case 'departmentChart':
                openDrill(label, `All transactions for ${label}`, r => r['Department'] === label);
                break;
            case 'divisionChart':
                openDrill(label, `All transactions for ${label}`, r => r['Division Name'] === label);
                break;
            case 'categoryChart':
                openDrill(label, `All transactions for ${label}`, r => r['Category'] === label);
                break;
            case 'docTypeChart':
                openDrill(label, `All transactions - ${DOC_TYPE_NAMES[label] || label}`, r => r['Document Type'] === label);
                break;
            case 'costTypeChart':
                openDrill(label, `All transactions for ${label}`, r => String(r['Cost Type'] || '').includes(label));
                break;
        }
    }

    /**
     * Open drill-through for all data in current chart
     */
    function openAllDataDrill() {
        const titles = chartTitles[currentChartId] || { title: 'All Data' };
        ModalManager.close('chartExpandModal');
        openDrill(titles.title, `All transactions in current view`, () => true);
    }

    /**
     * Initialize event listeners
     */
    function init() {
        // Data table toggle
        document.getElementById('chartExpandTableToggle')?.addEventListener('click', toggleDataTable);

        // Export PNG
        document.getElementById('chartExpandExport')?.addEventListener('click', exportPNG);

        // View all data drill-through
        document.getElementById('chartExpandDrill')?.addEventListener('click', openAllDataDrill);

        // Add click handlers to all expand buttons
        document.querySelectorAll('.chart-expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const chartId = btn.dataset.chartId;
                if (chartId) open(chartId);
            });
        });
    }

    return {
        open,
        init,
        toggleDataTable,
        exportPNG
    };
})();
