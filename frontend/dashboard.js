Auth.requireAuth();
Sidebar.init('dashboard.html');

/* ── Greeting ───────────────────────────────────────── */
function setGreeting() {
  const user = Auth.getUser();
  const hour = new Date().getHours();
  const time = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const firstName = user?.name?.split(' ')[0] || 'there';
  document.getElementById('greeting-name').textContent = `Good ${time}, ${firstName}`;
}


/* ── Render metrics ──────────────────────────────────── */
function renderMetrics(d) {
  document.getElementById('m-revenue').textContent       = Utils.formatCurrency(d.revenue);
  document.getElementById('m-revenue-delta').textContent = `${Utils.formatCurrency(d.revenue_this_month)} this month`;
  document.getElementById('m-revenue-delta').className   = 'metric-delta neutral';

  document.getElementById('m-orders').textContent        = d.active_orders;
  document.getElementById('m-orders-delta').textContent  = `${d.orders_due_week} due this week`;
  document.getElementById('m-orders-delta').className    = 'metric-delta neutral';

  document.getElementById('m-customers').textContent       = d.total_customers;
  document.getElementById('m-customers-delta').textContent = `${d.orders_this_month} orders this month`;
  document.getElementById('m-customers-delta').className   = 'metric-delta neutral';

  document.getElementById('m-pending').textContent       = Utils.formatCurrency(d.pending_payments);
  document.getElementById('m-pending-delta').textContent = `${d.pending_count} outstanding`;
  document.getElementById('m-pending-delta').className   = 'metric-delta down';
}

/* ── Render greeting hint ────────────────────────────── */
function renderHint(d) {
  const parts = [];
  if (d.orders_due_week > 0) parts.push(`${d.orders_due_week} order${d.orders_due_week > 1 ? 's' : ''} due this week`);
  if (d.pending_count > 0)   parts.push(`${d.pending_count} outstanding payment${d.pending_count > 1 ? 's' : ''}`);
  document.getElementById('greeting-hint').textContent =
    parts.length ? parts.join(' · ') : 'Everything looks good today.';
}

/* ── Render recent orders ────────────────────────────── */
function renderOrders(orders) {
  const tbody = document.getElementById('recent-orders-body');
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-state-title">No orders yet</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map(o => `
    <tr style="cursor:pointer" onclick="window.location.href='orders.html?id=${o.id}'">
      <td>
        <div class="td-label">${o.customer_name}</div>
        <div class="td-sub">${o.garment}</div>
      </td>
      <td style="color:var(--text-secondary);font-size:13px">${Utils.formatDateShort(o.due_date)}</td>
      <td>${Utils.statusPill(o.status)}</td>
      <td class="td-amount">${o.balance > 0 ? Utils.formatCurrency(o.balance) : '<span style="color:var(--text-muted)">Paid</span>'}</td>
    </tr>
  `).join('');
}

/* ── Render appointments ─────────────────────────────── */
function fmtApptTime(t) {
  if (!t) return '';
  const [h, m] = String(t).split(':');
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function renderAppointments(appts) {
  const el = document.getElementById('appointments-list');
  if (!appts.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-title">No upcoming fittings</div></div>`;
    return;
  }
  el.innerHTML = appts.map(a => {
    const d = new Date(a.date + 'T00:00:00');
    const day = d.getDate();
    const mon = d.toLocaleString('en', { month: 'short' }).toUpperCase();
    const timeStr = fmtApptTime(a.time);
    return `
      <div class="appt-item">
        <div class="appt-date-box">
          <div class="appt-day-num">${day}</div>
          <div class="appt-day-mon">${mon}</div>
        </div>
        <div>
          <div class="appt-info-name">${a.customer_name}</div>
          <div class="appt-info-type">${a.type || ''}${timeStr ? ' · ' + timeStr : ''}</div>
        </div>
      </div>`;
  }).join('');
}

/* ── Render status bars ──────────────────────────────── */
function renderStatusBars(counts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const bars = [
    { label: 'Pending',     key: 'pending',   color: 'var(--amber-400)' },
    { label: 'In progress', key: 'progress',  color: 'var(--blue-400)'  },
    { label: 'Ready',       key: 'ready',     color: 'var(--green-400)' },
    { label: 'Delivered',   key: 'delivered', color: 'var(--gray-400)'  },
  ];
  document.getElementById('status-bars').innerHTML = bars.map(b => `
    <div class="bar-row">
      <div class="bar-label">${b.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round((counts[b.key] || 0)/total*100)}%;background:${b.color}"></div></div>
      <div class="bar-val">${counts[b.key] || 0}</div>
    </div>`).join('');
}

/* ── Render top customers ────────────────────────────── */
function renderTopCustomers(customers) {
  const colors = ['avatar-purple', 'avatar-teal', 'avatar-amber'];
  document.getElementById('top-customers').innerHTML = customers.map((c, i) => `
    <div class="top-customers-row">
      ${Utils.avatarHtml(c.name, colors[i % colors.length], 28)}
      <div class="tc-name">${c.name}</div>
      <div class="tc-amount">${Utils.formatCurrency(c.total)}</div>
    </div>`).join('');
}

/* ── Render attention items ──────────────────────────── */
const ATTENTION_CFG = {
  overdue:  { bg: 'var(--red-50)',    color: 'var(--red-600)',    label: 'Overdue',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>` },
  ready:    { bg: 'var(--amber-50)',  color: 'var(--amber-700)',  label: 'Awaiting pickup',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M21 10V20a1 1 0 01-1 1H4a1 1 0 01-1-1V10"/><polyline points="3 7 12 2 21 7"/><line x1="12" y1="2" x2="12" y2="22"/></svg>` },
  due_soon: { bg: 'var(--blue-50)',   color: 'var(--blue-600)',   label: 'Due soon',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>` },
  unpaid:   { bg: 'var(--purple-50)', color: 'var(--purple-700)', label: 'Unpaid balance',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>` },
};

function renderAttention(items) {
  const el          = document.getElementById('attention-list');
  const headerBadge = document.getElementById('attention-count');
  if (headerBadge) {
    headerBadge.textContent   = items.length || '';
    headerBadge.style.display = items.length ? 'inline' : 'none';
  }

  if (!items.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">All good!</div>
        <div class="empty-state-sub">Nothing needs your attention right now</div>
      </div>`;
    return;
  }

  el.innerHTML = items.map(item => {
    const cfg = ATTENTION_CFG[item.type] || ATTENTION_CFG.overdue;
    return `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:var(--radius-md);background:${cfg.bg};margin-bottom:8px;">
        <svg style="width:14px;height:14px;flex-shrink:0;margin-top:2px;stroke:${cfg.color}" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round">${cfg.icon.replace(/<svg[^>]*>/,'').replace('</svg>','')}</svg>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
            <span style="font-size:11px;font-weight:600;color:${cfg.color};text-transform:uppercase;letter-spacing:0.05em">${cfg.label}</span>
          </div>
          <div style="font-size:13px;font-weight:500;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.customer_name} · ${item.garment}</div>
          <div style="font-size:12px;color:${cfg.color};margin-top:1px">${item.issue}</div>
        </div>
        <a href="orders.html" style="font-size:11px;color:${cfg.color};white-space:nowrap;text-decoration:none;font-weight:500;margin-top:2px">View →</a>
      </div>`;
  }).join('');
}

/* ── Load dashboard ──────────────────────────────────── */
async function loadDashboard() {
  setGreeting();

  try {
    const [summary, allOrders, appts, topCRaw] = await Promise.all([
      API.dashboard.getSummary(),
      API.orders.list(),
      API.appointments.list(),
      API.analytics.getTopCustomers(),
    ]);

    const today       = new Date().toISOString().split('T')[0];
    const weekFromNow = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const ordersDueWeek = allOrders.filter(o =>
      o.due_date && o.due_date >= today && o.due_date <= weekFromNow && o.status !== 'delivered'
    ).length;

    const pendingCount = allOrders.filter(o => o.balance_due > 0).length;

    const statusCounts = { pending: 0, progress: 0, ready: 0, delivered: 0 };
    allOrders.forEach(o => { if (o.status in statusCounts) statusCounts[o.status]++; });

    const dashData = {
      revenue:            summary.total_revenue,
      revenue_this_month: summary.revenue_this_month,
      active_orders:      summary.active_orders,
      orders_due_week:    ordersDueWeek,
      total_customers:    summary.customers_count,
      orders_this_month:  summary.orders_this_month,
      pending_payments:   summary.pending_payments,
      pending_count:      pendingCount,
    };

    const recentOrders = allOrders.slice(0, 5).map(o => ({
      id:            o.id,
      customer_name: o.customer_name,
      garment:       o.garment,
      due_date:      o.due_date,
      status:        o.status,
      balance:       o.balance_due,
    }));

    const upcoming = appts.filter(a => String(a.date) >= today).slice(0, 3);

    const topC = topCRaw.slice(0, 3).map(c => ({ name: c.name, total: c.total_spent }));

    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const attentionItems = [];

    // 1. Overdue — past due date, not ready or delivered
    allOrders
      .filter(o => o.due_date && o.due_date < today && !['delivered', 'ready'].includes(o.status))
      .forEach(o => {
        const daysLate = Math.floor((new Date(today) - new Date(o.due_date)) / 86400000);
        attentionItems.push({ type: 'overdue', customer_name: o.customer_name, garment: o.garment,
          issue: `${daysLate} day${daysLate !== 1 ? 's' : ''} past due date` });
      });

    // 2. Ready but not yet picked up
    allOrders
      .filter(o => o.status === 'ready')
      .forEach(o => attentionItems.push({ type: 'ready', customer_name: o.customer_name, garment: o.garment,
        issue: 'Ready for collection — customer not notified?' }));

    // 3. Due today or tomorrow (active orders only)
    allOrders
      .filter(o => o.due_date && [today, tomorrow].includes(o.due_date) && !['delivered', 'ready'].includes(o.status))
      .forEach(o => attentionItems.push({ type: 'due_soon', customer_name: o.customer_name, garment: o.garment,
        issue: o.due_date === today ? 'Due today — make sure it\'s ready' : 'Due tomorrow' }));

    // 4. Delivered but balance still owed
    allOrders
      .filter(o => o.status === 'delivered' && o.balance_due > 0)
      .forEach(o => attentionItems.push({ type: 'unpaid', customer_name: o.customer_name, garment: o.garment,
        issue: `${Utils.formatCurrency(o.balance_due)} still outstanding` }));

    renderMetrics(dashData);
    renderHint(dashData);
    renderOrders(recentOrders);
    renderAppointments(upcoming);
    renderStatusBars(statusCounts);
    renderTopCustomers(topC);
    renderAttention(attentionItems);

  } catch (err) {
    Utils.toast('Failed to load dashboard: ' + err.message, 'error');
  }
}

loadDashboard();
