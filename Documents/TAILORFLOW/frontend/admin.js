Auth.requireAuth();
Sidebar.init('admin.html');

const user = Auth.getUser();
if (!user?.is_admin) {
  Utils.toast('Admin access required', 'error');
  window.location.href = 'dashboard.html';
}

let allTailors = [];

/* ── Render metrics ──────────────────────────────────── */
function renderStats(s) {
  document.getElementById('m-total').textContent      = s.total_tailors;
  document.getElementById('m-active-sub').textContent = `${s.active_tailors} active`;
  document.getElementById('m-customers').textContent  = s.total_customers;
  document.getElementById('m-orders').textContent     = s.total_orders;
  document.getElementById('m-revenue').textContent    = Utils.formatCurrency(s.total_revenue);
}

/* ── Render table ────────────────────────────────────── */
function renderTailors(list) {
  const tbody = document.getElementById('tailors-body');
  document.getElementById('tailor-count').textContent =
    `${list.length} account${list.length !== 1 ? 's' : ''}`;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-title">No accounts found</div></div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(t => {
    const statusBadge = t.is_admin
      ? `<span class="status-badge admin">Admin</span>`
      : t.is_active
        ? `<span class="status-badge active">Active</span>`
        : `<span class="status-badge inactive">Deactivated</span>`;

    const isSelf = t.id === user.id;

    const actionBtn = isSelf || t.is_admin
      ? `<span style="font-size:12px;color:var(--text-muted)">${isSelf ? 'You' : 'Admin'}</span>`
      : t.is_active
        ? `<button class="btn btn-secondary" style="font-size:12px;padding:4px 12px;color:var(--red-600);" onclick="toggleAccount('${t.id}', false)">Deactivate</button>`
        : `<button class="btn btn-secondary" style="font-size:12px;padding:4px 12px;color:var(--teal-600);" onclick="toggleAccount('${t.id}', true)">Reactivate</button>`;

    return `
      <tr style="opacity:${t.is_active ? '1' : '0.55'}">
        <td>
          <div class="td-label">${t.name}</div>
          <div class="td-sub">${t.business_name || '—'}</div>
        </td>
        <td style="font-size:13px;color:var(--text-secondary)">${t.email}</td>
        <td style="font-size:13px;color:var(--text-muted)">${Utils.formatDateShort(t.created_at)}</td>
        <td style="text-align:right;font-size:13px">${t.customers_count}</td>
        <td style="text-align:right;font-size:13px">${t.orders_count}</td>
        <td class="td-amount">${Utils.formatCurrency(t.total_revenue)}</td>
        <td>${statusBadge}</td>
        <td style="text-align:right">${actionBtn}</td>
      </tr>`;
  }).join('');
}

/* ── Toggle active state ─────────────────────────────── */
async function toggleAccount(id, activate) {
  try {
    const updated = activate
      ? await API.admin.reactivate(id)
      : await API.admin.deactivate(id);

    const idx = allTailors.findIndex(t => t.id === id);
    if (idx !== -1) allTailors[idx] = updated;
    applySearch();
    Utils.toast(activate ? 'Account reactivated' : 'Account deactivated', 'success');

    const [stats] = await Promise.all([API.admin.getStats()]);
    renderStats(stats);
  } catch (err) {
    Utils.toast(err.message, 'error');
  }
}

/* ── Search ──────────────────────────────────────────── */
function applySearch() {
  const q = document.getElementById('tailor-search').value.toLowerCase();
  const filtered = q
    ? allTailors.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.business_name || '').toLowerCase().includes(q)
      )
    : allTailors;
  renderTailors(filtered);
}

document.getElementById('tailor-search').addEventListener('input', applySearch);

/* ── Promote to admin ────────────────────────────────── */
async function promoteToAdmin() {
  const secret = document.getElementById('promote-secret').value.trim();
  if (!secret) { Utils.toast('Enter the admin secret', 'error'); return; }

  const btn = document.getElementById('promote-btn');
  Utils.setLoading(btn, true);
  try {
    await API.admin.promote(secret);
    Utils.toast('You are now an admin. Refreshing…', 'success');
    setTimeout(() => window.location.reload(), 1500);
  } catch (err) {
    Utils.toast(err.message, 'error');
  } finally {
    Utils.setLoading(btn, false);
  }
}

/* ── Init ────────────────────────────────────────────── */
async function loadAdmin() {
  if (!user?.is_admin) {
    document.getElementById('promote-box').style.display = 'flex';
  }

  try {
    const [stats, tailors] = await Promise.all([
      API.admin.getStats(),
      API.admin.listTailors(),
    ]);
    renderStats(stats);
    allTailors = tailors;
    renderTailors(tailors);
  } catch (err) {
    Utils.toast('Failed to load admin data: ' + err.message, 'error');
  }
}

loadAdmin();
