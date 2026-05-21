Auth.requireAuth();
Sidebar.init('payments.html');

let allPayments   = [];
let allOrders     = [];
let pendingDelete = null;

const AVATAR_COLORS = ['avatar-purple', 'avatar-teal', 'avatar-amber'];

const TYPE_META = {
  deposit: { label: 'Deposit',      cls: 'badge-deposit' },
  full:    { label: 'Full payment', cls: 'badge-full' },
  balance: { label: 'Balance',      cls: 'badge-balance' },
};

const METHOD_ICONS = {
  Transfer: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
  Cash:     `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/></svg>`,
  POS:      `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/></svg>`,
};

/* ── Helpers ─────────────────────────────────────────────── */
function filteredPayments() {
  const q      = (document.getElementById('pay-search')?.value || '').toLowerCase();
  const type   = document.getElementById('filter-type')?.value  || '';
  const method = document.getElementById('filter-method')?.value || '';

  return allPayments.filter(p => {
    const matchQ = !q || p.customer_name.toLowerCase().includes(q) || p.garment.toLowerCase().includes(q) || (p.note || '').toLowerCase().includes(q);
    const matchT = !type   || p.type   === type;
    const matchM = !method || p.method === method;
    return matchQ && matchT && matchM;
  });
}

/* ── Summary cards ───────────────────────────────────────── */
function renderSummary() {
  const now       = new Date();
  const thisMonth = allPayments.filter(p => {
    const d = new Date(p.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const total      = allPayments.reduce((s, p) => s + p.amount, 0);
  const monthTotal = thisMonth.reduce((s, p) => s + p.amount, 0);
  const fullCount  = allPayments.filter(p => p.type === 'full').length;
  const fullTotal  = allPayments.filter(p => p.type === 'full').reduce((s, p) => s + p.amount, 0);

  // Outstanding = orders with balance remaining
  const outstanding = allOrders.filter(o => {
    const paid = allPayments.filter(p => p.order_id === o.id).reduce((s, p) => s + p.amount, 0);
    return paid < (o.total_price || 0);
  });
  const outstandingTotal = outstanding.reduce((s, o) => {
    const paid = allPayments.filter(p => p.order_id === o.id).reduce((sp, p) => sp + p.amount, 0);
    return s + ((o.total_price || 0) - paid);
  }, 0);

  document.getElementById('p-total').textContent         = Utils.formatCurrency(total);
  document.getElementById('p-count').textContent         = `${allPayments.length} payment${allPayments.length !== 1 ? 's' : ''} total`;
  document.getElementById('p-pending').textContent       = Utils.formatCurrency(outstandingTotal);
  document.getElementById('p-pending-count').textContent = `${outstanding.length} order${outstanding.length !== 1 ? 's' : ''} still outstanding`;
  document.getElementById('p-month').textContent         = Utils.formatCurrency(monthTotal);
  document.getElementById('p-month-count').textContent   = `${thisMonth.length} payment${thisMonth.length !== 1 ? 's' : ''} this month`;
  document.getElementById('p-full').textContent          = Utils.formatCurrency(fullTotal);
  document.getElementById('p-full-sub').textContent      = `${fullCount} order${fullCount !== 1 ? 's' : ''} fully paid`;
}

/* ── Trend chart (last 6 months) ─────────────────────────── */
function renderTrend() {
  const now    = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString('en-NG', { month: 'short' }),
      month: d.getMonth(),
      year:  d.getFullYear(),
      total: 0,
    });
  }

  allPayments.forEach(p => {
    const d = new Date(p.date);
    const slot = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
    if (slot) slot.total += p.amount;
  });

  const max = Math.max(...months.map(m => m.total), 1);
  const chart = document.getElementById('trend-chart');
  chart.innerHTML = months.map(m => {
    const pct = Math.round((m.total / max) * 100);
    return `
      <div class="bar-row">
        <div class="trend-month">${m.label}</div>
        <div class="bar-track" style="flex:1">
          <div class="bar-fill" style="width:${pct}%;background:var(--purple-600)"></div>
        </div>
        <div class="trend-bar-label">${m.total ? Utils.formatCurrency(m.total) : '—'}</div>
      </div>`;
  }).join('');
}

/* ── Method breakdown ────────────────────────────────────── */
function renderMethodBreakdown() {
  const methods = {};
  allPayments.forEach(p => {
    if (!methods[p.method]) methods[p.method] = { count: 0, total: 0 };
    methods[p.method].count++;
    methods[p.method].total += p.amount;
  });

  const grandTotal = allPayments.reduce((s, p) => s + p.amount, 0) || 1;
  const sorted = Object.entries(methods).sort((a, b) => b[1].total - a[1].total);

  const COLORS = { Transfer: 'var(--purple-600)', Cash: 'var(--teal-400)', POS: 'var(--amber-400)' };

  document.getElementById('method-breakdown').innerHTML = sorted.length ? sorted.map(([method, data]) => {
    const pct = Math.round((data.total / grandTotal) * 100);
    return `
      <div class="bar-row">
        <div class="bar-label" style="display:flex;align-items:center;gap:5px;">
          <span style="color:${COLORS[method] || 'var(--text-muted)'}">${METHOD_ICONS[method] || ''}</span>
          ${method}
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${COLORS[method] || 'var(--gray-400)'}"></div>
        </div>
        <div class="bar-val">${pct}%</div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin:-6px 0 10px 76px">${data.count} payment${data.count !== 1 ? 's' : ''} · ${Utils.formatCurrency(data.total)}</div>`;
  }).join('') : '<div style="font-size:13px;color:var(--text-muted);padding:8px 0">No payments yet</div>';
}

/* ── Payments table ──────────────────────────────────────── */
function renderPayments() {
  const list   = filteredPayments();
  const tbody  = document.getElementById('payments-body');
  const label  = document.getElementById('pay-count-label');
  label.textContent = `${list.length} of ${allPayments.length} payment${allPayments.length !== 1 ? 's' : ''}`;

  if (!list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <div class="empty-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--purple-600)" stroke-width="1.8" stroke-linecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
            <div class="empty-state-title">${allPayments.length ? 'No payments match your filters' : 'No payments recorded yet'}</div>
            <div class="empty-state-sub">${allPayments.length ? 'Try adjusting your search or filter criteria' : 'Record your first payment to get started'}</div>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = list.map((p, i) => {
    const meta   = TYPE_META[p.type] || { label: p.type, cls: '' };
    const avatar = Utils.avatarHtml(p.customer_name, AVATAR_COLORS[i % AVATAR_COLORS.length], 32);
    const icon   = METHOD_ICONS[p.method] || '';
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            ${avatar}
            <div class="td-label">${p.customer_name}</div>
          </div>
        </td>
        <td style="font-size:13px;color:var(--text-secondary)">${p.garment}</td>
        <td><span class="type-badge ${meta.cls}">${meta.label}</span></td>
        <td><span class="method-chip">${icon} ${p.method}</span></td>
        <td style="font-size:13px;color:var(--text-secondary);white-space:nowrap">${Utils.formatDate(p.date)}</td>
        <td style="font-size:12px;color:var(--text-muted);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.note || '—'}</td>
        <td class="td-amount">${Utils.formatCurrency(p.amount)}</td>
        <td style="width:40px;">
          <button class="row-action-btn" title="Delete" onclick="openDeleteModal('${p.id}', '${p.customer_name.replace(/'/g,"\\'")}', '${p.garment.replace(/'/g,"\\'")}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </td>
      </tr>`;
  }).join('');
}

/* ── Populate order dropdown in modal ────────────────────── */
function populateOrderDropdown() {
  const select = document.getElementById('pay-order');
  if (!select) return;
  if (!allOrders.length) {
    select.innerHTML = '<option value="">No orders found — add an order first</option>';
    return;
  }
  select.innerHTML = '<option value="">Select an order…</option>' +
    allOrders.map(o => `<option value="${o.id}">${o.customer_name || 'Unknown'} — ${o.garment}</option>`).join('');
}

/* ── Delete flow ─────────────────────────────────────────── */
function openDeleteModal(id, name, garment) {
  pendingDelete = id;
  document.getElementById('delete-modal-name').textContent = `${name} — ${garment}`;
  Utils.openModal('delete-modal');
}

document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
  if (!pendingDelete) return;
  try {
    await API.payments.delete(pendingDelete);
    allPayments = allPayments.filter(p => p.id !== pendingDelete);
    pendingDelete = null;
    Utils.closeModal('delete-modal');
    renderAll();
    Utils.toast('Payment deleted', 'default');
  } catch (err) {
    Utils.toast(err.message || 'Failed to delete payment', 'error');
  }
});

/* ── Search / filter ─────────────────────────────────────── */
['pay-search', 'filter-type', 'filter-method'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', renderPayments);
  document.getElementById(id)?.addEventListener('change', renderPayments);
});

/* ── Save payment ────────────────────────────────────────── */
document.getElementById('payment-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const errorEl = document.getElementById('pay-form-error');
  const orderId = document.getElementById('pay-order').value;
  const amount  = Number(document.getElementById('pay-amount').value);

  if (!orderId) {
    errorEl.textContent = 'Please select an order.';
    errorEl.style.display = 'block';
    return;
  }
  if (!amount || amount <= 0) {
    errorEl.textContent = 'Please enter a valid amount.';
    errorEl.style.display = 'block';
    return;
  }
  errorEl.style.display = 'none';

  const btn = document.getElementById('pay-save-btn');
  Utils.setLoading(btn, true);

  try {
    const newPayment = await API.payments.recordPayment(orderId, {
      amount,
      type:   document.getElementById('pay-type').value,
      method: document.getElementById('pay-method').value,
      date:   document.getElementById('pay-date').value || new Date().toISOString().split('T')[0],
      note:   document.getElementById('pay-note').value.trim() || null,
    });

    allPayments.unshift(newPayment);
    renderAll();
    Utils.closeModal('payment-modal');
    Utils.toast(`Payment of ${Utils.formatCurrency(newPayment.amount)} recorded`, 'success');
    e.target.reset();
    document.getElementById('pay-date').value = new Date().toISOString().split('T')[0];
  } catch (err) {
    errorEl.textContent = err.message || 'Failed to record payment.';
    errorEl.style.display = 'block';
  } finally {
    Utils.setLoading(btn, false);
  }
});

/* ── Render all ──────────────────────────────────────────── */
function renderAll() {
  renderSummary();
  renderTrend();
  renderMethodBreakdown();
  renderPayments();
}

/* ── Load data from API ──────────────────────────────────── */
async function loadData() {
  try {
    const [payments, orders] = await Promise.all([
      API.payments.list(),
      API.orders.list(),
    ]);
    allPayments = payments;
    allOrders   = orders;
    populateOrderDropdown();
    renderAll();
  } catch (err) {
    Utils.toast('Failed to load payments', 'error');
  }
}

/* ── Init ────────────────────────────────────────────────── */
document.getElementById('pay-date').value = new Date().toISOString().split('T')[0];
Utils.initModalClose();

// Repopulate order dropdown every time modal opens
document.querySelector('[onclick*="payment-modal"]')?.addEventListener('click', populateOrderDropdown);

loadData();

if (new URLSearchParams(window.location.search).get('new') === '1') {
  Utils.openModal('payment-modal');
}
