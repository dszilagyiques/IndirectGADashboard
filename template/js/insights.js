// === DEPARTMENT OVERVIEW ===

let showAllDepts = false;
const DEFAULT_DEPT_COUNT = 15;

function aggregateDepartmentData() {
    if (filteredData.length === 0) return [];

    const deptTotals = {};
    let totalGross = 0;

    filteredData.forEach(r => {
        if (!String(r['Cost Type'] || '').startsWith('693')) {
            const dept = r['Department'] || 'Unknown';
            const amt = r['Actual Amount'] || 0;
            deptTotals[dept] = (deptTotals[dept] || 0) + amt;
            totalGross += amt;
        }
    });

    const sorted = Object.entries(deptTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount]) => ({
            name,
            amount,
            pct: totalGross !== 0 ? (amount / totalGross) * 100 : 0
        }));

    return { departments: sorted, totalGross };
}

function renderDepartmentOverview() {
    const panel = document.getElementById('insightsPanel');
    const content = document.getElementById('deptOverviewContent');
    const showAllBtn = document.getElementById('showAllDeptsBtn');

    if (!panel || !content) return;

    const { departments, totalGross } = aggregateDepartmentData();

    if (departments.length === 0) {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = 'block';

    // Determine which departments to show
    const displayDepts = showAllDepts ? departments : departments.slice(0, DEFAULT_DEPT_COUNT);
    const hasMore = departments.length > DEFAULT_DEPT_COUNT;

    // Update show all button
    if (showAllBtn) {
        if (hasMore) {
            showAllBtn.style.display = 'inline-block';
            showAllBtn.textContent = showAllDepts ? 'Show Less' : `Show All (${departments.length})`;
        } else {
            showAllBtn.style.display = 'none';
        }
    }

    // Calculate max amount for scaling
    const maxAmount = Math.max(...displayDepts.map(d => d.amount));

    // Render department bars
    content.innerHTML = displayDepts.map((dept, i) => {
        const widthPct = maxAmount > 0 ? (dept.amount / maxAmount) * 100 : 0;
        const color = PALETTE[i % PALETTE.length];
        const formattedAmount = formatCurrency(dept.amount);
        const pctText = dept.pct.toFixed(1);

        return `
            <div class="dept-bar-item" data-dept="${escapeHtml(dept.name)}" title="${escapeHtml(dept.name)}: ${formattedAmount} (${pctText}%)">
                <div class="dept-bar-header">
                    <span class="dept-bar-name">${escapeHtml(dept.name)}</span>
                    <span class="dept-bar-value">${formattedAmount}</span>
                </div>
                <div class="dept-bar-track">
                    <div class="dept-bar-fill" style="width: ${widthPct}%; background: ${color};">
                    </div>
                </div>
                <span class="dept-bar-pct">${pctText}%</span>
            </div>
        `;
    }).join('');

    // Add click handlers for drill-through
    content.querySelectorAll('.dept-bar-item').forEach(item => {
        item.addEventListener('click', () => {
            const deptName = item.dataset.dept;
            openDrill(deptName, `All ${deptName} transactions`, r => r['Department'] === deptName);
        });
    });
}

function updateInsightsPanel() {
    renderDepartmentOverview();
}

function setupDeptOverviewListeners() {
    const showAllBtn = document.getElementById('showAllDeptsBtn');
    if (showAllBtn) {
        showAllBtn.addEventListener('click', () => {
            showAllDepts = !showAllDepts;
            renderDepartmentOverview();
        });
    }
}

// Initialize on load - will be called after password handling
document.addEventListener('DOMContentLoaded', () => {
    // Delay setup until dashboard is ready
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.classList && mutation.target.classList.contains('visible')) {
                setupDeptOverviewListeners();
                observer.disconnect();
            }
        });
    });

    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        observer.observe(dashboard, { attributes: true, attributeFilter: ['class'] });
    }
});
