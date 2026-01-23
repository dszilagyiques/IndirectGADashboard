// === AUTO-INSIGHTS GENERATION ===

function generateInsights() {
    if (filteredData.length === 0) return [];

    const insights = [];

    // 1. Find largest department
    const deptTotals = {};
    let totalGross = 0;
    filteredData.forEach(r => {
        if (!String(r['Cost Type']||'').startsWith('693')) {
            const dept = r['Department'] || 'Unknown';
            const amt = r['Actual Amount'] || 0;
            deptTotals[dept] = (deptTotals[dept] || 0) + amt;
            totalGross += amt;
        }
    });

    const sortedDepts = Object.entries(deptTotals).sort((a, b) => b[1] - a[1]);
    if (sortedDepts.length > 0) {
        const [topDept, topAmt] = sortedDepts[0];
        const pct = totalGross !== 0 ? ((topAmt / totalGross) * 100).toFixed(0) : 0;
        insights.push({
            icon: 'dept',
            text: `Largest dept: <strong>${topDept}</strong> (${formatCurrency(topAmt)}, ${pct}%)`
        });
    }

    // 2. Find largest division
    const divTotals = {};
    filteredData.forEach(r => {
        if (!String(r['Cost Type']||'').startsWith('693')) {
            const div = r['Division Name'] || 'Unknown';
            const amt = r['Actual Amount'] || 0;
            divTotals[div] = (divTotals[div] || 0) + amt;
        }
    });

    const sortedDivs = Object.entries(divTotals).sort((a, b) => b[1] - a[1]);
    if (sortedDivs.length > 0) {
        const [topDiv, topAmt] = sortedDivs[0];
        const pct = totalGross !== 0 ? ((topAmt / totalGross) * 100).toFixed(0) : 0;
        const shortName = topDiv.length > 25 ? topDiv.substring(0, 22) + '...' : topDiv;
        insights.push({
            icon: 'div',
            text: `Top division: <strong>${shortName}</strong> (${formatCurrency(topAmt)}, ${pct}%)`
        });
    }

    // 3. Calculate month-over-month change
    const monthlyData = {};
    filteredData.forEach(r => {
        const m = (r['G/L Date'] || '').substring(0, 7);
        if (!m) return;
        if (!monthlyData[m]) monthlyData[m] = { gross: 0 };
        if (!String(r['Cost Type']||'').startsWith('693')) {
            monthlyData[m].gross += r['Actual Amount'] || 0;
        }
    });

    const months = Object.keys(monthlyData).sort();
    if (months.length >= 2) {
        const lastMonth = months[months.length - 1];
        const prevMonth = months[months.length - 2];
        const lastGross = monthlyData[lastMonth].gross;
        const prevGross = monthlyData[prevMonth].gross;

        if (prevGross !== 0) {
            const change = ((lastGross - prevGross) / Math.abs(prevGross)) * 100;
            const arrow = change > 0 ? '&#9650;' : '&#9660;';
            const color = change > 0 ? 'up' : 'down';
            insights.push({
                icon: 'trend',
                text: `MoM change: <span class="${color}">${arrow} ${Math.abs(change).toFixed(1)}%</span> (${formatMonthLabel(prevMonth)} to ${formatMonthLabel(lastMonth)})`
            });
        }
    }

    // 4. Find biggest category
    const catTotals = {};
    filteredData.forEach(r => {
        if (!String(r['Cost Type']||'').startsWith('693')) {
            const cat = r['Category'] || 'Other';
            catTotals[cat] = (catTotals[cat] || 0) + (r['Actual Amount'] || 0);
        }
    });

    const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    if (sortedCats.length > 0) {
        const [topCat, topCatAmt] = sortedCats[0];
        const pct = totalGross !== 0 ? ((topCatAmt / totalGross) * 100).toFixed(0) : 0;
        insights.push({
            icon: 'cat',
            text: `Top category: <strong>${topCat}</strong> (${pct}% of gross)`
        });
    }

    // 5. Recovery rate insight
    let alloc = 0, gross = 0;
    filteredData.forEach(r => {
        const amt = r['Actual Amount'] || 0;
        const ct = String(r['Cost Type'] || '');
        if (ct.startsWith('693')) alloc += amt; else gross += amt;
    });

    if (gross !== 0) {
        const recoveryPct = Math.abs(alloc / gross * 100);
        let recoveryInsight = '';
        if (recoveryPct >= 80) {
            recoveryInsight = `Strong recovery: <strong>${recoveryPct.toFixed(1)}%</strong> of costs allocated`;
        } else if (recoveryPct >= 50) {
            recoveryInsight = `Moderate recovery: <strong>${recoveryPct.toFixed(1)}%</strong> of costs allocated`;
        } else if (recoveryPct > 0) {
            recoveryInsight = `Low recovery: <strong>${recoveryPct.toFixed(1)}%</strong> of costs allocated`;
        }
        if (recoveryInsight) {
            insights.push({ icon: 'recovery', text: recoveryInsight });
        }
    }

    return insights.slice(0, 5); // Limit to 5 insights
}

function updateInsightsPanel() {
    const panel = document.getElementById('insightsPanel');
    const content = document.getElementById('insightsContent');

    if (!panel || !content) return;

    const insights = generateInsights();

    if (insights.length === 0) {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = 'block';
    content.innerHTML = insights.map(i => `<div class="insight-item">${i.text}</div>`).join('');
}

function toggleInsightsPanel() {
    const panel = document.getElementById('insightsPanel');
    const content = document.getElementById('insightsContent');
    const toggle = document.getElementById('insightsToggle');

    if (!panel || !content || !toggle) return;

    const isCollapsed = panel.classList.toggle('collapsed');
    toggle.textContent = isCollapsed ? '+' : '-';
}
