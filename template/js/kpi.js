// === SPARKLINE RENDERING ===

function renderSparkline(canvasId, data, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || data.length < 2) {
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        return;
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 2;

    ctx.clearRect(0, 0, width, height);

    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const xStep = (width - padding * 2) / (data.length - 1);

    // Draw area fill
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    data.forEach((d, i) => {
        const x = padding + i * xStep;
        const y = height - padding - ((d.value - min) / range) * (height - padding * 2);
        if (i === 0) ctx.lineTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.lineTo(padding + (data.length - 1) * xStep, height - padding);
    ctx.closePath();
    ctx.fillStyle = color + '20';
    ctx.fill();

    // Draw line
    ctx.beginPath();
    data.forEach((d, i) => {
        const x = padding + i * xStep;
        const y = height - padding - ((d.value - min) / range) * (height - padding * 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw endpoint dot
    const lastX = padding + (data.length - 1) * xStep;
    const lastY = height - padding - ((values[values.length - 1] - min) / range) * (height - padding * 2);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
}

function getMonthlyTrendData() {
    const monthlyData = {};
    filteredData.forEach(r => {
        const m = (r['G/L Date'] || '').substring(0, 7);
        if (!m) return;
        if (!monthlyData[m]) monthlyData[m] = { gross: 0, alloc: 0, net: 0 };
        const amt = r['Actual Amount'] || 0;
        const ct = String(r['Cost Type'] || '');
        if (ct.startsWith('693')) {
            monthlyData[m].alloc += amt;
        } else {
            monthlyData[m].gross += amt;
        }
        monthlyData[m].net = monthlyData[m].gross + monthlyData[m].alloc;
    });

    const sortedMonths = Object.keys(monthlyData).sort().slice(-12);
    return {
        gross: sortedMonths.map(m => ({ month: m, value: monthlyData[m].gross })),
        alloc: sortedMonths.map(m => ({ month: m, value: Math.abs(monthlyData[m].alloc) })),
        net: sortedMonths.map(m => ({ month: m, value: monthlyData[m].net })),
        monthly: sortedMonths.map(m => ({ month: m, value: monthlyData[m].net }))
    };
}

// === KPI CALCULATIONS ===

function calculatePriorPeriodKPIs() {
    // Determine the date range of current filtered data
    const dates = filteredData.map(r => r['G/L Date']).filter(Boolean).sort();
    if (dates.length === 0) return null;

    const startDate = new Date(dates[0]);
    const endDate = new Date(dates[dates.length - 1]);
    const duration = endDate - startDate;

    // Calculate prior period with same duration
    const priorEnd = new Date(startDate.getTime() - 24 * 60 * 60 * 1000); // Day before start
    const priorStart = new Date(priorEnd.getTime() - duration);

    const priorStartStr = priorStart.toISOString().split('T')[0];
    const priorEndStr = priorEnd.toISOString().split('T')[0];

    // Filter raw data for prior period (applying same non-date filters)
    const priorData = rawData.filter(row => {
        if (!row['G/L Date'] || row['G/L Date'] < priorStartStr || row['G/L Date'] > priorEndStr) return false;
        if (filters.jobType !== 'all' && row['Job Type'] !== filters.jobType) return false;
        if (filters.divisions.length > 0 && !filters.divisions.includes(row['Division Name'])) return false;
        if (filters.departments.length > 0 && !filters.departments.includes(row['Department'])) return false;
        if (filters.deptCategories.length > 0 && !filters.deptCategories.includes(row['Dept_Category'])) return false;
        if (filters.categories.length > 0 && !filters.categories.includes(row['Category'])) return false;
        if (filters.docTypes.length > 0 && !filters.docTypes.includes(row['Document Type'])) return false;
        return true;
    });

    if (priorData.length === 0) return null;

    let gross = 0, alloc = 0;
    const months = new Set();
    priorData.forEach(r => {
        const amt = r['Actual Amount'] || 0;
        const ct = String(r['Cost Type'] || '');
        if (r['G/L Date']) months.add(r['G/L Date'].substring(0, 7));
        if (ct.startsWith('693')) alloc += amt; else gross += amt;
    });

    const net = gross + alloc;
    const monthCount = months.size || 1;
    return { gross, alloc, net, monthlyAvg: net / monthCount };
}

function calculateKPIs() {
    let gross = 0, alloc = 0, gaTotal = 0, inTotal = 0;
    const months = new Set();
    filteredData.forEach(r => {
        const amt = r['Actual Amount'] || 0;
        const ct = String(r['Cost Type'] || '');
        if (r['G/L Date']) months.add(r['G/L Date'].substring(0, 7));
        if (ct.startsWith('693')) alloc += amt; else gross += amt;
        if (r['Job Type'] === 'GA') gaTotal += amt;
        else if (r['Job Type'] === 'IN') inTotal += amt;
    });
    const net = gross + alloc;
    const recoveryPct = gross !== 0 ? Math.abs(alloc / gross * 100) : 0;
    const total = gaTotal + inTotal;
    const gaPct = total !== 0 ? (gaTotal / total * 100) : 0;
    const inPct = total !== 0 ? (inTotal / total * 100) : 0;
    const monthCount = months.size || 1;

    // Calculate prior period for comparison
    const priorKPIs = calculatePriorPeriodKPIs();

    return {
        gross, alloc, net, recoveryPct, gaPct, inPct,
        monthlyAvg: net / monthCount, monthCount,
        grossRecords: filteredData.filter(r => !String(r['Cost Type']||'').startsWith('693')).length,
        allocRecords: filteredData.filter(r => String(r['Cost Type']||'').startsWith('693')).length,
        priorKPIs
    };
}

function formatTrendIndicator(current, prior) {
    if (prior === null || prior === undefined || prior === 0) return '';
    const change = ((current - prior) / Math.abs(prior)) * 100;
    if (Math.abs(change) < 0.1) {
        return '<span class="kpi-trend neutral"><span class="arrow">-</span>0%</span>';
    }
    const arrow = change > 0 ? '&#9650;' : '&#9660;';
    const cls = change > 0 ? 'up' : 'down';
    return `<span class="kpi-trend ${cls}"><span class="arrow">${arrow}</span>${Math.abs(change).toFixed(1)}%</span>`;
}

function updateKPIs(kpis) {
    document.getElementById('kpiGross').textContent = formatCurrency(kpis.gross);
    document.getElementById('kpiGrossRecords').textContent = `${kpis.grossRecords.toLocaleString()} records`;
    document.getElementById('kpiAllocations').textContent = formatCurrency(kpis.alloc);
    document.getElementById('kpiAllocRecords').textContent = `${kpis.allocRecords.toLocaleString()} records`;
    document.getElementById('kpiNet').textContent = formatCurrency(kpis.net);

    // Update recovery progress ring
    const recoveryPct = Math.min(kpis.recoveryPct, 100); // Cap at 100% for display
    const ringProgress = document.getElementById('ringProgress');
    const ringText = document.getElementById('ringText');
    if (ringProgress && ringText) {
        ringProgress.setAttribute('stroke-dasharray', `${recoveryPct}, 100`);
        ringText.textContent = `${kpis.recoveryPct.toFixed(0)}%`;
    }
    document.getElementById('kpiRatio').textContent = `${kpis.gaPct.toFixed(0)}% / ${kpis.inPct.toFixed(0)}%`;
    document.getElementById('kpiMonthlyAvg').textContent = formatCurrency(kpis.monthlyAvg);
    document.getElementById('kpiMonthCount').textContent = `${kpis.monthCount} months`;

    // Update trend indicators
    const prior = kpis.priorKPIs;
    document.getElementById('kpiGrossTrend').innerHTML = prior ? formatTrendIndicator(kpis.gross, prior.gross) : '';
    document.getElementById('kpiAllocTrend').innerHTML = prior ? formatTrendIndicator(Math.abs(kpis.alloc), Math.abs(prior.alloc)) : '';
    document.getElementById('kpiNetTrend').innerHTML = prior ? formatTrendIndicator(kpis.net, prior.net) : '';
    document.getElementById('kpiMonthlyTrend').innerHTML = prior ? formatTrendIndicator(kpis.monthlyAvg, prior.monthlyAvg) : '';

    // Render sparklines
    const trendData = getMonthlyTrendData();
    renderSparkline('sparklineGross', trendData.gross, '#58a6ff');
    renderSparkline('sparklineAlloc', trendData.alloc, '#3fb950');
    renderSparkline('sparklineNet', trendData.net, '#d29922');
    renderSparkline('sparklineMonthly', trendData.monthly, '#58a6ff');
}
