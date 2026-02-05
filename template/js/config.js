// === CONFIGURATION & CONSTANTS ===

// Document type descriptions
const DOC_TYPE_NAMES = {
    'TE': 'Time Sheet Entry', 'PV': 'Voucher', 'JA': 'Budget/Cost Allocation',
    'T3': 'Actual Burden Journal', 'DP': 'Depreciation Journal', 'P9': 'P-Card Vouchers',
    'JE': 'Journal Entry', 'T2': 'Payroll Labor Dist', 'PT': 'Electronic Funds',
    'PM': 'Manual Voucher', 'T4': 'Labor Billing Dist', 'RJ': 'A/R Invoice',
    'RC': 'Receipts - A/R', 'PK': 'Automated Check', 'RO': 'Reversing/Void'
};

// Chart colors
const COLORS = {
    blue: '#58a6ff', green: '#3fb950', purple: '#a371f7',
    orange: '#d29922', red: '#f85149', cyan: '#39c5cf',
    pink: '#db61a2', gray: '#8b949e'
};

const PALETTE = ['#58a6ff', '#3fb950', '#a371f7', '#d29922', '#39c5cf', '#db61a2', '#f85149', '#8b949e', '#238636', '#6e7681', '#f0883e', '#79c0ff', '#7ee787', '#d2a8ff', '#ffd33d'];

const CATEGORY_COLORS = {
    'Labor Costs': COLORS.blue, 'Travel & Per Diem': COLORS.purple, 'Fleet & Materials': COLORS.orange,
    'Facilities & Services': COLORS.cyan, 'Equipment Costs': COLORS.pink, 'Allocation Credits': COLORS.green,
    'Other Allocations': '#238636', 'Corporate Overhead': '#f85149', 'G&A & Other': COLORS.gray, 'Other': '#6e7681'
};

const DEPT_CATEGORY_COLORS = {
    'G&A': COLORS.blue,
    'Ops Support': COLORS.purple,
    'Equipment': COLORS.orange,
    'Safety': COLORS.green,
    'Tools': COLORS.cyan,
    'Field': COLORS.pink,
    'Comms': '#f0883e',
    'Other': COLORS.gray
};

const MANHOUR_DOC_TYPES = ['T1', 'T2', 'T3', 'T4'];

// Unified chart configuration defaults
const CHART_DEFAULTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: {
                color: '#8b949e',
                usePointStyle: true,
                padding: 12,
                font: { size: 11 }
            }
        },
        tooltip: {
            backgroundColor: 'rgba(22, 27, 34, 0.95)',
            borderColor: '#30363d',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            titleFont: { size: 12, weight: 600 },
            bodyFont: { size: 11 },
            displayColors: true
        }
    },
    scales: {
        x: {
            grid: { color: '#21262d' },
            ticks: { color: '#8b949e', font: { size: 10 } }
        },
        y: {
            grid: { color: '#21262d' },
            ticks: { color: '#8b949e', font: { size: 10 } }
        }
    },
    animation: {
        duration: 600,
        easing: 'easeOutQuart'
    }
};

// Expanded chart defaults for fullscreen modals
const CHART_EXPANDED_DEFAULTS = {
    ...CHART_DEFAULTS,
    plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: {
            ...CHART_DEFAULTS.plugins.legend,
            labels: {
                ...CHART_DEFAULTS.plugins.legend.labels,
                padding: 16,
                font: { size: 13 }
            }
        },
        tooltip: {
            ...CHART_DEFAULTS.plugins.tooltip,
            padding: 16,
            titleFont: { size: 14, weight: 600 },
            bodyFont: { size: 13 }
        }
    },
    scales: {
        x: {
            ...CHART_DEFAULTS.scales.x,
            ticks: { color: '#8b949e', font: { size: 12 } }
        },
        y: {
            ...CHART_DEFAULTS.scales.y,
            ticks: { color: '#8b949e', font: { size: 12 } }
        }
    }
};

/**
 * Create a chart configuration by merging defaults with custom options
 * @param {string} type - Chart type ('bar', 'line', 'doughnut', etc.)
 * @param {Object} data - Chart data configuration
 * @param {Object} customOptions - Custom options to merge
 * @param {boolean} expanded - Whether to use expanded defaults (for fullscreen modals)
 * @returns {Object} Complete chart configuration
 */
function createChartConfig(type, data, customOptions = {}, expanded = false) {
    const defaults = expanded ? CHART_EXPANDED_DEFAULTS : CHART_DEFAULTS;

    // Deep merge helper
    function deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    const options = deepMerge(defaults, customOptions);

    return { type, data, options };
}
