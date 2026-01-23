// === UTILITY FUNCTIONS ===

function formatCurrency(val) {
    if (val == null || isNaN(val)) return '$0';
    const abs = Math.abs(val);
    if (abs >= 1e9) return (val < 0 ? '-' : '') + '$' + (abs / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return (val < 0 ? '-' : '') + '$' + (abs / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return (val < 0 ? '-' : '') + '$' + (abs / 1e3).toFixed(1) + 'K';
    return (val < 0 ? '-' : '') + '$' + abs.toFixed(0);
}

function formatFullCurrency(val) {
    if (val == null || isNaN(val)) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

function formatMonthLabel(m) {
    const [y, mo] = m.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[parseInt(mo) - 1] + ' ' + y.slice(2);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// Enhanced tooltip formatters for charts
const TooltipFormatters = {
    /**
     * Format currency value for tooltip label
     */
    currencyLabel: (ctx) => {
        const label = ctx.dataset.label || '';
        const value = formatCurrency(ctx.raw);
        return label ? `${label}: ${value}` : value;
    },

    /**
     * Format currency with percentage of total
     */
    currencyWithPercent: (ctx, total) => {
        const label = ctx.dataset.label || ctx.label || '';
        const value = formatCurrency(ctx.raw);
        const pct = total ? ((ctx.raw / total) * 100).toFixed(1) : '0.0';
        return `${label}: ${value} (${pct}%)`;
    },

    /**
     * Format tooltip title from month
     */
    monthTitle: (items) => {
        if (!items.length) return '';
        return items[0].label || '';
    },

    /**
     * Add variance information between two values
     */
    variance: (current, previous, label = '') => {
        if (!previous) return '';
        const diff = current - previous;
        const pct = previous !== 0 ? ((diff / Math.abs(previous)) * 100).toFixed(1) : '0.0';
        const arrow = diff > 0 ? '\u25B2' : (diff < 0 ? '\u25BC' : '-');
        const prefix = label ? `${label}: ` : '';
        return `${prefix}${arrow} ${pct}% (${formatCurrency(diff)})`;
    },

    /**
     * Create afterBody callback for summary tooltips
     */
    summaryAfterBody: (items, monthlyAgg, months) => {
        const lines = [];
        if (!items.length) return lines;

        const idx = items[0].dataIndex;
        const currentMonth = months[idx];
        const prevIdx = idx - 1;

        if (prevIdx >= 0) {
            const prevMonth = months[prevIdx];
            const gross = monthlyAgg[currentMonth].gross;
            const prevGross = monthlyAgg[prevMonth].gross;
            const net = gross + monthlyAgg[currentMonth].alloc;
            const prevNet = prevGross + monthlyAgg[prevMonth].alloc;

            lines.push('\u2500'.repeat(16));
            lines.push(`vs ${formatMonthLabel(prevMonth)}:`);

            const grossChange = prevGross !== 0 ? ((gross - prevGross) / Math.abs(prevGross) * 100).toFixed(1) : '0.0';
            const netChange = prevNet !== 0 ? ((net - prevNet) / Math.abs(prevNet) * 100).toFixed(1) : '0.0';

            lines.push(`  Gross: ${gross > prevGross ? '\u25B2' : '\u25BC'} ${grossChange}%`);
            lines.push(`  Net: ${net > prevNet ? '\u25B2' : '\u25BC'} ${netChange}%`);
        }

        return lines;
    }
};

/**
 * Format number with thousands separator
 */
function formatNumber(val) {
    if (val == null || isNaN(val)) return '0';
    return new Intl.NumberFormat('en-US').format(Math.round(val));
}

/**
 * Format percentage value
 */
function formatPercent(val, decimals = 1) {
    if (val == null || isNaN(val)) return '0%';
    return val.toFixed(decimals) + '%';
}

/**
 * Calculate percent change between two values
 */
function percentChange(current, previous) {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Get trend indicator class
 */
function getTrendClass(change, invertColors = false) {
    if (change > 0) return invertColors ? 'down' : 'up';
    if (change < 0) return invertColors ? 'up' : 'down';
    return 'neutral';
}

/**
 * Get trend arrow character
 */
function getTrendArrow(change) {
    if (change > 0) return '\u25B2';
    if (change < 0) return '\u25BC';
    return '-';
}
