Auth.requireAuth();
Sidebar.init('analytics.html');

let currentPeriod = 'month';

/* ── Render KPI metrics ──────────────────────────────────── */
function renderMetrics(d) {
  document.getElementById('a-revenue').textContent         = Utils.formatCurrency(d.revenue);
  document.getElementById('a-revenue-delta').textContent   = `+${d.revenue_delta}% vs previous`;
  document.getElementById('a-revenue-delta').className     = 'metric-delta';

  document.getElementById('a-orders').textContent          = d.orders;
  document.getElementById('a-orders-delta').textContent    = `+${d.orders_delta} vs previous`;
  document.getElementById('a-orders-delta').className      = 'metric-delta neutral';

  document.getElementById('a-avg').textContent             = Utils.formatCurrency(d.avg);
  document.getElementById('a-avg-delta').textContent       = `+${d.avg_delta}% average`;
  document.getElementById('a-avg-delta').className         = 'metric-delta neutral';

  document.getElementById('a-customers').textContent       = d.customers;
  document.getElementById('a-customers-delta').textContent = `+${d.customers_delta} new`;
  document.getElementById('a-customers-delta').className   = 'metric-delta';
}

/* ── Render bar chart ─────────────────────────────────────── */
function renderBars(containerId, data, color) {
  const max = Math.max(...data.map(d => d.val !== undefined ? d.val : d.count), 1);
  document.getElementById(containerId).innerHTML = data.map(d => {
    const val     = d.val !== undefined ? d.val : d.count;
    const display = d.val !== undefined ? Utils.formatCurrency(val) : val;
    const pct     = Math.round(val / max * 100);
    return `
      <div class="bar-row">
        <div class="bar-label">${d.label}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="bar-val">${display}</div>
      </div>`;
  }).join('');
}

/* ── Render status bars ──────────────────────────────────── */
function renderStatusBars(counts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const bars  = [
    { label: 'Pending',     key: 'pending',   color: 'var(--amber-400)' },
    { label: 'In progress', key: 'progress',  color: 'var(--blue-400)'  },
    { label: 'Ready',       key: 'ready',     color: 'var(--green-400)' },
    { label: 'Delivered',   key: 'delivered', color: 'var(--gray-400)'  },
  ];
  document.getElementById('status-bars').innerHTML = bars.map(b => `
    <div class="bar-row">
      <div class="bar-label">${b.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round((counts[b.key] || 0) / total * 100)}%;background:${b.color}"></div></div>
      <div class="bar-val">${counts[b.key] || 0}</div>
    </div>`).join('');
}

/* ── Render top customers ────────────────────────────────── */
function renderTopCustomers(customers) {
  const colors = ['avatar-purple', 'avatar-teal', 'avatar-amber'];
  document.getElementById('top-customers-list').innerHTML = customers.map((c, i) => `
    <div class="tc-row">
      ${Utils.avatarHtml(c.name, colors[i % colors.length], 28)}
      <div style="flex:1;font-size:13px;font-weight:500">${c.name}</div>
      <div style="font-family:var(--font-mono);font-size:13px;font-weight:500">${Utils.formatCurrency(c.total)}</div>
    </div>`).join('');
}

/* ── Render popular garments ─────────────────────────────── */
function renderGarments(garments) {
  const el = document.getElementById('garment-bars');
  if (!garments.length) {
    el.innerHTML = '<div style="font-size:13px;color:var(--text-muted);padding:8px 0">No orders yet — garment data will appear here once you start adding orders.</div>';
    return;
  }
  renderBars('garment-bars', garments.map(g => ({ label: g.garment, count: g.count })), 'var(--teal-400)');

  // Add revenue sub-label under each bar
  const rows = el.querySelectorAll('.bar-row');
  garments.forEach((g, i) => {
    if (!rows[i]) return;
    const sub = document.createElement('div');
    sub.style.cssText = 'font-size:11px;color:var(--text-muted);margin:-6px 0 8px 90px';
    sub.textContent = `${Utils.formatCurrency(g.revenue)} revenue`;
    rows[i].insertAdjacentElement('afterend', sub);
  });
}

/* ── Render all ──────────────────────────────────────────── */
async function renderAll() {
  try {
    const [dashSummary, revenue, analyticsSummary, topCRaw, garments] = await Promise.all([
      API.dashboard.getSummary(),
      API.analytics.getRevenue(currentPeriod),
      API.analytics.getSummary(currentPeriod),
      API.analytics.getTopCustomers(),
      API.analytics.getPopularGarments(),
    ]);

    const totalOrders = Object.values(analyticsSummary.status_breakdown || {}).reduce((a, b) => a + b, 0);
    renderMetrics({
      revenue:         dashSummary.total_revenue,
      revenue_delta:   0,
      orders:          totalOrders,
      orders_delta:    0,
      avg:             totalOrders > 0 ? dashSummary.total_revenue / totalOrders : 0,
      avg_delta:       0,
      customers:       dashSummary.customers_count,
      customers_delta: 0,
    });

    document.getElementById('revenue-bar-label').textContent = 'Revenue by month (last 12 months)';
    renderBars('revenue-bars', revenue.map(r => ({ label: r.month, val: r.amount })), 'var(--purple-400)');
    renderStatusBars(analyticsSummary.status_breakdown || {});
    renderTopCustomers(topCRaw.map(c => ({ name: c.name, total: c.total_spent })));
    renderGarments(garments);

  } catch (err) {
    Utils.toast('Failed to load analytics: ' + err.message, 'error');
  }
}

/* ── Period tabs ─────────────────────────────────────────── */
document.getElementById('period-tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.period-tab');
  if (!tab) return;
  document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  currentPeriod = tab.dataset.period;
  renderAll();
});

/* ── Init ────────────────────────────────────────────────── */
renderAll();
