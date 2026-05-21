Auth.requireAuth();
Sidebar.init('orders.html');

let allOrders     = [];
let customersList = [];
let activeFilter  = 'all';
let activeOrderId = null;

/* ── Render ──────────────────────────────────────────────── */
function renderOrders(list) {
  const tbody = document.getElementById('orders-body');
  document.getElementById('order-count').textContent =
    `${list.length} order${list.length !== 1 ? 's' : ''}`;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-title">No orders found</div><div class="empty-state-sub">Try a different filter or search</div></div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(o => {
    const overdue    = Utils.isOverdue(o.due_date) && o.status !== 'delivered';
    const completed  = o.status === 'delivered' && o.balance <= 0;
    const tickHtml   = completed
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal-600)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" fill="var(--teal-50)"/><polyline points="9 12 11 14 15 10"/></svg>`
      : '';
    return `
    <tr style="cursor:pointer;opacity:${completed ? '0.72' : '1'}" onclick="openOrderDetail('${o.id}')">
      <td class="td-label">${o.customer_name}</td>
      <td style="font-size:13px;color:var(--text-secondary)">${o.garment}</td>
      <td style="font-size:13px;color:${overdue ? 'var(--red-600)' : 'var(--text-secondary)'}">
        ${Utils.formatDateShort(o.due_date)}${overdue ? ' ⚠' : ''}
      </td>
      <td>${Utils.statusPill(o.status)}</td>
      <td class="td-amount">${Utils.formatCurrency(o.total)}</td>
      <td class="td-amount">${o.balance > 0 ? Utils.formatCurrency(o.balance) : '<span style="color:var(--text-muted)">Paid</span>'}</td>
      <td style="width:32px;text-align:center">${tickHtml}</td>
    </tr>`;
  }).join('');
}

/* ── Filter + search ─────────────────────────────────────── */
function applyFilters() {
  const q = document.getElementById('order-search').value.toLowerCase();
  let list = allOrders;
  if (activeFilter !== 'all') list = list.filter(o => o.status === activeFilter);
  if (q) list = list.filter(o =>
    o.customer_name.toLowerCase().includes(q) ||
    o.garment.toLowerCase().includes(q)
  );
  renderOrders(list);
}

document.getElementById('filter-tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.filter-tab');
  if (!tab) return;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  activeFilter = tab.dataset.filter;
  applyFilters();
});

document.getElementById('order-search').addEventListener('input', applyFilters);

/* ── Save order ──────────────────────────────────────────── */
document.getElementById('order-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('o-save-btn');
  Utils.setLoading(btn, true);

  try {
    const customerName = document.getElementById('o-customer').value.trim();
    if (!customerName) { Utils.toast('Please enter a customer name', 'error'); Utils.setLoading(btn, false); return; }

    // Find existing customer or auto-create them so the name is always saved
    let customer = customersList.find(c => c.name.toLowerCase() === customerName.toLowerCase());
    if (!customer) {
      customer = await API.customers.create({ name: customerName });
      customersList.push(customer);
    }

    const total   = Number(document.getElementById('o-total').value)   || 0;
    const deposit = Number(document.getElementById('o-deposit').value) || 0;

    const created = await API.orders.create({
      customer_id: customer.id,
      garment:     document.getElementById('o-garment').value.trim(),
      total_price: total,
      due_date:    document.getElementById('o-due').value || null,
      status:      document.getElementById('o-status').value,
      notes:       document.getElementById('o-notes').value.trim() || null,
    });

    if (deposit > 0) {
      await API.payments.recordPayment(created.id, { amount: deposit, type: 'deposit', method: 'Transfer' });
    }

    const refreshed = await API.orders.get(created.id);
    allOrders.unshift({ ...refreshed, total: refreshed.total_price, balance: refreshed.balance_due });
    applyFilters();
    showReadyBanner(allOrders);
    Utils.closeModal('order-modal');
    Utils.toast('Order created', 'success');
    e.target.reset();
  } catch (err) {
    Utils.toast(err.message, 'error');
  } finally {
    Utils.setLoading(btn, false);
  }
});

/* ── Init ────────────────────────────────────────────────── */
Utils.initModalClose();

function showReadyBanner(orders) {
  const ready = orders.filter(o => o.status === 'ready');
  const banner = document.getElementById('ready-banner');
  if (ready.length > 0) {
    document.getElementById('ready-banner-text').textContent =
      `${ready.length} order${ready.length > 1 ? 's are' : ' is'} ready for pickup — waiting on customer collection.`;
    banner.style.display = 'flex';
    Sidebar.setBadge('orders.html', ready.length);
  } else {
    banner.style.display = 'none';
    Sidebar.setBadge('orders.html', 0);
  }
}

function filterToReady() {
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-filter="ready"]').classList.add('active');
  activeFilter = 'ready';
  applyFilters();
}

/* ── Order detail modal ──────────────────────────────────── */
function openOrderDetail(id) {
  const o = allOrders.find(x => x.id === id);
  if (!o) return;
  activeOrderId = id;

  document.getElementById('od-title').textContent    = o.customer_name;
  document.getElementById('od-subtitle').textContent = o.garment;
  document.getElementById('od-total').textContent    = Utils.formatCurrency(o.total);
  document.getElementById('od-balance').textContent  = o.balance > 0 ? Utils.formatCurrency(o.balance) : 'Paid ✓';
  document.getElementById('od-due').textContent      = Utils.formatDateShort(o.due_date);
  document.getElementById('od-status').value         = o.status;

  const notesWrap = document.getElementById('od-notes-wrap');
  if (o.notes) {
    document.getElementById('od-notes').textContent = o.notes;
    notesWrap.style.display = 'block';
  } else {
    notesWrap.style.display = 'none';
  }

  Utils.openModal('order-detail-modal');
}

async function saveOrderStatus() {
  if (!activeOrderId) return;
  const btn    = document.getElementById('od-save-btn');
  const status = document.getElementById('od-status').value;
  Utils.setLoading(btn, true);
  try {
    await API.orders.updateStatus(activeOrderId, status);
    // Update local array
    const o = allOrders.find(x => x.id === activeOrderId);
    if (o) o.status = status;
    applyFilters();
    showReadyBanner(allOrders);
    Utils.closeModal('order-detail-modal');
    Utils.toast('Status updated', 'success');
  } catch (err) {
    Utils.toast(err.message, 'error');
  } finally {
    Utils.setLoading(btn, false);
  }
}

async function loadData() {
  try {
    const [orders, customers] = await Promise.all([API.orders.list(), API.customers.list()]);
    customersList = customers;
    allOrders = orders.map(o => ({ ...o, total: o.total_price, balance: o.balance_due }));
    applyFilters();
    showReadyBanner(allOrders);
  } catch (err) {
    Utils.toast('Failed to load orders: ' + err.message, 'error');
    renderOrders([]);
  }
}

loadData();

if (new URLSearchParams(window.location.search).get('new') === '1') {
  Utils.openModal('order-modal');
}
