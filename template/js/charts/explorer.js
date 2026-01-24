// === COST EXPLORER - UNIFIED DATA EXPLORATION CHART ===

let explorerDimension = 'division';
let explorerMetric = 'amount';
let explorerSort = 'value';
let explorerLimit = 15;

const EXPLORER_DIMENSIONS = {
    division: { field: 'Division Name', label: 'Division', excludeAlloc: true },
    deptcat: { field: 'Dept_Category', label: 'Dept Category', excludeAlloc: false },
    costtype: { field: 'Description', label: 'Cost Type', excludeAlloc: true },
    doctype: { field: 'Document Type', label: 'Doc Type', excludeAlloc: false },
    department: { field: 'Department', label: 'Department', excludeAlloc: true }
};

function aggregateExplorerData(data, dimension, metric) {
    // Use cached metrics if available
    if (cachedMetrics) {
        const cacheMap = {
            'division': cachedMetrics.byDivision,
            'deptcat': cachedMetrics.byDeptCategory,
            'department': cachedMetrics.byDepartment,
            'doctype': cachedMetrics.byDocType,
            'costtype': cachedMetrics.byCostType
        };
        if (cacheMap[dimension] && Object.keys(cacheMap[dimension]).length > 0) {
            return cacheMap[dimension];
        }
    }

    // Fallback: compute from scratch
    const config = EXPLORER_DIMENSIONS[dimension];
    const result = {};

    data.forEach(r => {
        // Optionally exclude allocation codes
        if (config.excludeAlloc && String(r['Cost Type'] || '').startsWith('693')) {
            return;
        }

        let key = r[config.field] || 'Unknown';

        // For doc types, include the code name
        if (dimension === 'doctype' && DOC_TYPE_NAMES[key]) {
            key = `${key} - ${DOC_TYPE_NAMES[key]}`;
        }

        if (!result[key]) {
            result[key] = { amount: 0, count: 0 };
        }

        result[key].amount += (r['Actual Amount'] || 0);
        result[key].count += 1;
    });

    return result;
}

function sortExplorerData(data, sort, limit) {
    let entries = Object.entries(data);

    switch (sort) {
        case 'value':
            entries.sort((a, b) => Math.abs(b[1].amount) - Math.abs(a[1].amount));
            break;
        case 'volume':
            entries.sort((a, b) => b[1].count - a[1].count);
            break;
        case 'alpha':
            entries.sort((a, b) => a[0].localeCompare(b[0]));
            break;
    }

    if (limit > 0) {
        entries = entries.slice(0, limit);
    }

    return entries;
}

function renderExplorerChart() {
    const ctx = document.getElementById('explorerChart').getContext('2d');
    if (charts.explorer) charts.explorer.destroy();

    const config = EXPLORER_DIMENSIONS[explorerDimension];
    const aggData = aggregateExplorerData(filteredData, explorerDimension, explorerMetric);
    const sorted = sortExplorerData(aggData, explorerSort, explorerLimit);

    // Prepare labels and data
    const fullLabels = sorted.map(d => d[0]);
    const labels = sorted.map(d => {
        const maxLen = explorerDimension === 'costtype' ? 35 : 25;
        return d[0].length > maxLen ? d[0].substring(0, maxLen - 3) + '...' : d[0];
    });

    const values = explorerMetric === 'count'
        ? sorted.map(d => d[1].count)
        : sorted.map(d => d[1].amount);

    // Calculate totals for footer
    const totalAmount = sorted.reduce((s, d) => s + d[1].amount, 0);
    const totalCount = sorted.reduce((s, d) => s + d[1].count, 0);

    // Update footer
    const footerEl = document.getElementById('explorerFooter');
    if (footerEl) {
        footerEl.innerHTML = `
            <span class="explorer-stat"><strong>${sorted.length}</strong> items</span>
            <span class="explorer-stat"><strong>${formatCurrency(totalAmount)}</strong> total</span>
            <span class="explorer-stat"><strong>${totalCount.toLocaleString()}</strong> transactions</span>
        `;
    }

    // Update subtitle
    const subtitleEl = document.getElementById('explorerSubtitle');
    if (subtitleEl) {
        const sortLabel = explorerSort === 'value' ? 'by value' : (explorerSort === 'volume' ? 'by volume' : 'alphabetically');
        subtitleEl.textContent = `${config.label} breakdown ${sortLabel}${explorerLimit > 0 ? ` (Top ${explorerLimit})` : ''}`;
    }

    // Generate colors
    const barColors = sorted.map((_, i) => PALETTE[i % PALETTE.length] + 'cc');

    charts.explorer = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: barColors,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: items => fullLabels[items[0].dataIndex],
                        label: ctx => {
                            const idx = ctx.dataIndex;
                            const item = sorted[idx][1];
                            if (explorerMetric === 'count') {
                                return `${ctx.raw.toLocaleString()} transactions`;
                            }
                            return formatCurrency(ctx.raw);
                        },
                        afterLabel: ctx => {
                            const idx = ctx.dataIndex;
                            const item = sorted[idx][1];
                            const pct = totalAmount !== 0 ? ((item.amount / totalAmount) * 100).toFixed(1) : '0.0';
                            return [
                                `${pct}% of total`,
                                `${item.count.toLocaleString()} transactions`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: '#21262d' },
                    ticks: {
                        color: '#8b949e',
                        callback: v => explorerMetric === 'count' ? v.toLocaleString() : formatCurrency(v)
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#8b949e', font: { size: 10 } }
                }
            },
            onClick: (e, el) => {
                if (el.length > 0) {
                    const label = fullLabels[el[0].index];
                    const config = EXPLORER_DIMENSIONS[explorerDimension];

                    // Build filter function based on dimension
                    let filterFn;
                    if (explorerDimension === 'doctype') {
                        // Extract doc type code from "XX - Name" format
                        const code = label.split(' - ')[0];
                        filterFn = r => r['Document Type'] === code;
                    } else {
                        filterFn = r => r[config.field] === label;
                    }

                    openDrill(label, `All transactions for ${label}`, filterFn);
                }
            }
        }
    });
}

function setupExplorerControls() {
    // Dimension pills
    document.querySelectorAll('[data-explorer-dim]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-explorer-dim]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            explorerDimension = btn.dataset.explorerDim;
            renderExplorerChart();
        });
    });

    // Metric toggle
    document.querySelectorAll('[data-explorer-metric]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-explorer-metric]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            explorerMetric = btn.dataset.explorerMetric;
            renderExplorerChart();
        });
    });

    // Sort select
    const sortSelect = document.getElementById('explorerSort');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            explorerSort = sortSelect.value;
            renderExplorerChart();
        });
    }

    // Limit select
    const limitSelect = document.getElementById('explorerLimit');
    if (limitSelect) {
        limitSelect.addEventListener('change', () => {
            explorerLimit = parseInt(limitSelect.value) || 0;
            renderExplorerChart();
        });
    }
}
