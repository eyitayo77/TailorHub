Auth.requireAuth();
Sidebar.init('customers.html');

const AVATAR_COLORS = ['avatar-purple', 'avatar-teal', 'avatar-amber'];
let allCustomers      = [];
let editingCustomerId = null;

/* ── Measurement Templates ───────────────────────────────────── */
const TEMPLATES = {
  general: {
    label: 'General',
    fields: [
      { key: 'chest',   label: 'Bust / Chest',     placeholder: '38', unit: 'inches' },
      { key: 'waist',   label: 'Waist',             placeholder: '32', unit: 'inches' },
      { key: 'hips',    label: 'Hips',              placeholder: '40', unit: 'inches' },
      { key: 'height',  label: 'Height',            placeholder: '165', unit: 'cm' },
    ],
  },
  agbada: {
    label: 'Agbada / Kaftan',
    fields: [
      { key: 'chest',          label: 'Chest',           placeholder: '42', unit: 'inches' },
      { key: 'waist',          label: 'Waist',           placeholder: '36', unit: 'inches' },
      { key: 'hips',           label: 'Hips',            placeholder: '42', unit: 'inches' },
      { key: 'shoulder',       label: 'Shoulder',        placeholder: '18', unit: 'inches' },
      { key: 'sleeve',         label: 'Sleeve length',   placeholder: '26', unit: 'inches' },
      { key: 'kaftan_length',  label: 'Kaftan length',   placeholder: '54', unit: 'inches' },
      { key: 'trouser_waist',  label: 'Trouser waist',   placeholder: '34', unit: 'inches' },
      { key: 'trouser_length', label: 'Trouser length',  placeholder: '42', unit: 'inches' },
    ],
  },
  senator: {
    label: 'Senator / Babariga',
    fields: [
      { key: 'chest',          label: 'Chest',           placeholder: '42', unit: 'inches' },
      { key: 'waist',          label: 'Waist',           placeholder: '36', unit: 'inches' },
      { key: 'hips',           label: 'Hips',            placeholder: '42', unit: 'inches' },
      { key: 'shoulder',       label: 'Shoulder',        placeholder: '18', unit: 'inches' },
      { key: 'sleeve',         label: 'Sleeve length',   placeholder: '26', unit: 'inches' },
      { key: 'shirt_length',   label: 'Shirt length',    placeholder: '30', unit: 'inches' },
      { key: 'trouser_waist',  label: 'Trouser waist',   placeholder: '34', unit: 'inches' },
      { key: 'trouser_length', label: 'Trouser length',  placeholder: '42', unit: 'inches' },
    ],
  },
  suit: {
    label: 'Suit / Corporate',
    fields: [
      { key: 'chest',          label: 'Chest',           placeholder: '40', unit: 'inches' },
      { key: 'waist',          label: 'Waist',           placeholder: '34', unit: 'inches' },
      { key: 'hips',           label: 'Hips',            placeholder: '40', unit: 'inches' },
      { key: 'shoulder',       label: 'Shoulder',        placeholder: '18', unit: 'inches' },
      { key: 'sleeve',         label: 'Sleeve length',   placeholder: '25', unit: 'inches' },
      { key: 'jacket_length',  label: 'Jacket length',   placeholder: '30', unit: 'inches' },
      { key: 'trouser_waist',  label: 'Trouser waist',   placeholder: '34', unit: 'inches' },
      { key: 'trouser_length', label: 'Trouser length',  placeholder: '42', unit: 'inches' },
      { key: 'thigh',          label: 'Thigh',           placeholder: '24', unit: 'inches' },
    ],
  },
  gown: {
    label: 'Gown / Dress',
    fields: [
      { key: 'bust',          label: 'Bust',            placeholder: '36', unit: 'inches' },
      { key: 'waist',         label: 'Waist',           placeholder: '28', unit: 'inches' },
      { key: 'hips',          label: 'Hips',            placeholder: '38', unit: 'inches' },
      { key: 'shoulder',      label: 'Shoulder',        placeholder: '15', unit: 'inches' },
      { key: 'sleeve',        label: 'Sleeve length',   placeholder: '22', unit: 'inches' },
      { key: 'dress_length',  label: 'Dress length',    placeholder: '58', unit: 'inches' },
      { key: 'neckline',      label: 'Neckline',        placeholder: '14', unit: 'inches' },
    ],
  },
  'skirt-blouse': {
    label: 'Skirt & Blouse',
    fields: [
      { key: 'bust',          label: 'Bust',            placeholder: '36', unit: 'inches' },
      { key: 'waist',         label: 'Waist',           placeholder: '28', unit: 'inches' },
      { key: 'hips',          label: 'Hips',            placeholder: '38', unit: 'inches' },
      { key: 'shoulder',      label: 'Shoulder',        placeholder: '15', unit: 'inches' },
      { key: 'sleeve',        label: 'Sleeve length',   placeholder: '22', unit: 'inches' },
      { key: 'blouse_length', label: 'Blouse length',   placeholder: '22', unit: 'inches' },
      { key: 'skirt_length',  label: 'Skirt length',    placeholder: '28', unit: 'inches' },
    ],
  },
  'aso-ebi': {
    label: 'Aso-ebi / Lace',
    fields: [
      { key: 'bust',        label: 'Bust',          placeholder: '36', unit: 'inches' },
      { key: 'waist',       label: 'Waist',         placeholder: '28', unit: 'inches' },
      { key: 'hips',        label: 'Hips',          placeholder: '38', unit: 'inches' },
      { key: 'shoulder',    label: 'Shoulder',      placeholder: '15', unit: 'inches' },
      { key: 'sleeve',      label: 'Sleeve',        placeholder: '22', unit: 'inches' },
      { key: 'top_length',  label: 'Top length',    placeholder: '22', unit: 'inches' },
      { key: 'skirt_length',label: 'Skirt length',  placeholder: '42', unit: 'inches' },
    ],
  },
  children: {
    label: "Children's Wear",
    fields: [
      { key: 'chest',   label: 'Chest',           placeholder: '26', unit: 'inches' },
      { key: 'waist',   label: 'Waist',           placeholder: '22', unit: 'inches' },
      { key: 'hips',    label: 'Hips',            placeholder: '28', unit: 'inches' },
      { key: 'height',  label: 'Height',          placeholder: '110', unit: 'cm' },
      { key: 'shoulder',label: 'Shoulder',        placeholder: '11', unit: 'inches' },
      { key: 'sleeve',  label: 'Sleeve length',   placeholder: '14', unit: 'inches' },
    ],
  },
};

/* ── Apply template — renders measurement input fields ───────── */
function applyTemplate(templateKey, existingData = {}) {
  const template = TEMPLATES[templateKey] || TEMPLATES.general;
  const container = document.getElementById('measurement-fields');

  // Group fields into pairs for 2-column layout
  const fields = template.fields;
  const rows = [];
  for (let i = 0; i < fields.length; i += 2) {
    rows.push(fields.slice(i, i + 2));
  }

  container.innerHTML = rows.map(pair => `
    <div class="form-row">
      ${pair.map(f => `
        <div class="form-group">
          <label>${f.label} <span style="font-size:11px;color:var(--text-muted);font-weight:400">(${f.unit})</span></label>
          <input type="number" id="m-${f.key}" data-field="${f.key}"
            placeholder="${f.placeholder}" min="0" step="0.5"
            value="${existingData[f.key] || ''}" />
        </div>
      `).join('')}
    </div>
  `).join('');
}

/* ── Read measurement fields into object ─────────────────────── */
function readMeasurements(templateKey) {
  const template = TEMPLATES[templateKey] || TEMPLATES.general;
  const data = { _template: templateKey };
  template.fields.forEach(f => {
    const val = document.getElementById(`m-${f.key}`)?.value;
    if (val) data[f.key] = parseFloat(val);
  });
  const notes = document.getElementById('c-notes').value.trim();
  if (notes) data.notes = notes;
  return data;
}

/* ── Measurement summary for table row ───────────────────────── */
function measurementSummary(m) {
  if (!m) return '—';
  try {
    const p = typeof m === 'string' ? JSON.parse(m) : m;
    const templateKey = p._template || 'general';
    const template    = TEMPLATES[templateKey] || TEMPLATES.general;

    // Show first 3 key measurements
    const parts = [];
    for (const f of template.fields.slice(0, 3)) {
      const val = p[f.key];
      if (val) parts.push(`${f.label}: ${val}${f.unit === 'cm' ? 'cm' : '"'}`);
    }
    if (!parts.length) return '—';
    const label = template.label;
    return `<span style="color:var(--purple-600);font-size:11px;font-weight:600;">${label}</span><br/><span style="font-size:11px">${parts.join(' · ')}</span>`;
  } catch { return '—'; }
}

function parseMeasurements(m) {
  if (!m) return {};
  try { return typeof m === 'string' ? JSON.parse(m) : m; }
  catch { return {}; }
}

/* ── Render customers table ──────────────────────────────────── */
function renderCustomers(list) {
  const tbody = document.getElementById('customers-body');
  document.getElementById('customer-count').textContent =
    `${list.length} customer${list.length !== 1 ? 's' : ''}`;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-title">No customers found</div><div class="empty-state-sub">Try a different search term</div></div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((c, i) => {
    const mSummary = measurementSummary(c.measurements);
    return `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          ${Utils.avatarHtml(c.name, AVATAR_COLORS[i % AVATAR_COLORS.length], 32)}
          <div>
            <div class="td-label">${c.name || '—'}</div>
            ${c.email ? `<div class="td-sub">${c.email}</div>` : ''}
          </div>
        </div>
      </td>
      <td style="font-size:13px;color:var(--text-secondary)">${c.phone || '—'}</td>
      <td style="font-size:12px;color:var(--text-muted);line-height:1.5">${mSummary !== '—' ? mSummary : '<span style="font-style:italic">Not recorded</span>'}</td>
      <td style="font-size:13px;color:var(--text-secondary)">${c.orders_count} order${c.orders_count !== 1 ? 's' : ''}</td>
      <td class="td-amount">${Utils.formatCurrency(c.total_spent)}</td>
      <td style="text-align:right;white-space:nowrap;">
        <button onclick="openEditModal('${c.id}')" title="Edit"
          style="padding:5px 7px;border:none;background:none;cursor:pointer;color:var(--text-muted);border-radius:var(--radius-sm);"
          onmouseenter="this.style.color='var(--purple-600)';this.style.background='var(--purple-50)'"
          onmouseleave="this.style.color='var(--text-muted)';this.style.background='none'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button onclick="deleteCustomer('${c.id}')" title="Delete"
          style="padding:5px 7px;border:none;background:none;cursor:pointer;color:var(--text-muted);border-radius:var(--radius-sm);"
          onmouseenter="this.style.color='var(--red-600)';this.style.background='var(--red-50)'"
          onmouseleave="this.style.color='var(--text-muted)';this.style.background='none'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </td>
    </tr>`;
  }).join('');
}

/* ── Search ──────────────────────────────────────────────────── */
document.getElementById('customer-search').addEventListener('input', function () {
  const q = this.value.toLowerCase();
  const filtered = allCustomers.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.phone || '').includes(q) ||
    (c.email || '').toLowerCase().includes(q)
  );
  renderCustomers(filtered);
});

/* ── Open add modal ──────────────────────────────────────────── */
function openAddModal() {
  editingCustomerId = null;
  document.getElementById('customer-modal-title').textContent = 'Add customer';
  document.getElementById('c-save-btn').textContent           = 'Save customer';
  document.getElementById('c-delete-btn').style.display       = 'none';
  document.getElementById('customer-form').reset();
  document.getElementById('c-template').value = 'general';
  applyTemplate('general');
  Utils.openModal('customer-modal');
}

/* ── Open edit modal ─────────────────────────────────────────── */
function openEditModal(id) {
  const c = allCustomers.find(x => x.id === id);
  if (!c) return;
  editingCustomerId = id;

  document.getElementById('customer-modal-title').textContent = 'Edit customer';
  document.getElementById('c-save-btn').textContent           = 'Save changes';
  document.getElementById('c-delete-btn').style.display       = 'inline-flex';

  document.getElementById('c-name').value  = c.name  || '';
  document.getElementById('c-phone').value = c.phone || '';
  document.getElementById('c-email').value = c.email || '';

  // Load measurements with correct template
  const m           = parseMeasurements(c.measurements);
  const templateKey = m._template || 'general';
  document.getElementById('c-template').value = templateKey;
  applyTemplate(templateKey, m);
  document.getElementById('c-notes').value = m.notes || '';

  Utils.openModal('customer-modal');
}

/* ── Delete customer ─────────────────────────────────────────── */
async function deleteCustomer(id) {
  const targetId = id || editingCustomerId;
  if (!targetId) return;
  const c    = allCustomers.find(x => x.id === targetId);
  const name = c ? c.name : 'this customer';
  if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
  try {
    await API.customers.delete(targetId);
    allCustomers = allCustomers.filter(x => x.id !== targetId);
    renderCustomers(allCustomers);
    Utils.closeModal('customer-modal');
    Utils.toast(`${name} deleted`, 'success');
  } catch (err) {
    Utils.toast(err.message, 'error');
  }
}

/* ── Save (create or update) ─────────────────────────────────── */
document.getElementById('customer-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn         = document.getElementById('c-save-btn');
  const templateKey = document.getElementById('c-template').value;
  Utils.setLoading(btn, true);

  try {
    const measurementData = readMeasurements(templateKey);
    const payload = {
      name:         document.getElementById('c-name').value.trim(),
      phone:        document.getElementById('c-phone').value.trim() || null,
      email:        document.getElementById('c-email').value.trim() || null,
      measurements: JSON.stringify(measurementData),
    };

    if (editingCustomerId) {
      const updated = await API.customers.update(editingCustomerId, payload);
      const idx     = allCustomers.findIndex(x => x.id === editingCustomerId);
      if (idx !== -1) allCustomers[idx] = { ...allCustomers[idx], ...updated };
      renderCustomers(allCustomers);
      Utils.closeModal('customer-modal');
      Utils.toast('Customer updated', 'success');
    } else {
      const newCustomer = await API.customers.create(payload);
      allCustomers.unshift(newCustomer);
      renderCustomers(allCustomers);
      Utils.closeModal('customer-modal');
      Utils.toast(`${newCustomer.name} added`, 'success');
      e.target.reset();
    }
  } catch (err) {
    Utils.toast(err.message, 'error');
  } finally {
    Utils.setLoading(btn, false);
  }
});

/* ── Wire up Add button ──────────────────────────────────────── */
document.getElementById('add-customer-btn').onclick = openAddModal;

/* ── Init ────────────────────────────────────────────────────── */
Utils.initModalClose();
applyTemplate('general'); // render default fields on load

async function loadCustomers() {
  try {
    allCustomers = await API.customers.list();
    renderCustomers(allCustomers);
  } catch (err) {
    Utils.toast('Failed to load customers: ' + err.message, 'error');
    renderCustomers([]);
  }
}

loadCustomers();

if (new URLSearchParams(window.location.search).get('new') === '1') {
  openAddModal();
}
