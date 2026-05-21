Auth.requireAuth();
Sidebar.init('appointments.html');

let allAppts      = [];
let customersList = [];
const today = new Date().toISOString().split('T')[0];

/* ── Helpers ─────────────────────────────────────────────── */
function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour   = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

/* ── Render single item ──────────────────────────────────── */
function apptItemHtml(a, isToday = false, isPast = false) {
  const d   = new Date(a.date + 'T00:00:00');
  const day = d.getDate();
  const mon = d.toLocaleString('en', { month: 'short' }).toUpperCase();

  const dateBoxStyle = isToday
    ? 'background:var(--purple-600);border-radius:var(--radius-md);padding:4px 2px;'
    : '';
  const dayNumStyle  = isToday ? 'color:#fff;' : '';
  const dayMonStyle  = isToday ? 'color:rgba(255,255,255,0.75);' : '';
  const wrapStyle    = isPast  ? 'opacity:0.55;' : '';

  return `
    <div class="appt-item" style="${wrapStyle}position:relative;" data-id="${a.id}">
      <div class="appt-date-box" style="${dateBoxStyle}">
        <div class="appt-day-num" style="${dayNumStyle}">${day}</div>
        <div class="appt-day-mon" style="${dayMonStyle}">${mon}</div>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;">
          <div class="appt-info-name">${a.customer_name}</div>
          ${isToday ? '<span style="font-size:10px;font-weight:700;color:var(--purple-600);background:var(--purple-50);padding:1px 6px;border-radius:10px;">TODAY</span>' : ''}
        </div>
        <div class="appt-info-type">${a.type || ''}${a.time ? ' · ' + formatTime(a.time) : ''}</div>
        ${a.notes ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">${a.notes}</div>` : ''}
      </div>
      ${!isPast ? `
      <button onclick="deleteAppt('${a.id}')" title="Delete appointment"
        style="opacity:0;transition:opacity 0.15s;padding:4px 6px;border:none;background:none;cursor:pointer;color:var(--text-muted);border-radius:var(--radius-sm);"
        onmouseenter="this.style.opacity=1;this.style.color='var(--red-600)'"
        onmouseleave="this.style.opacity=0;this.style.color='var(--text-muted)'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>` : ''}
    </div>`;
}

/* ── Delete appointment ──────────────────────────────────── */
async function deleteAppt(id) {
  if (!confirm('Delete this appointment?')) return;
  try {
    await API.appointments.delete(id);
    allAppts = allAppts.filter(a => a.id !== id);
    renderAppointments();
    Utils.toast('Appointment deleted', 'success');
  } catch (err) {
    Utils.toast(err.message, 'error');
  }
}

/* ── Section label helper ────────────────────────────────── */
function sectionLabel(id, text, count) {
  const el = document.getElementById(id);
  if (el) el.textContent = count > 0 ? `${text} (${count})` : text;
}

/* ── Render lists ────────────────────────────────────────── */
function renderAppointments() {
  const todayAppts    = allAppts.filter(a => a.date === today)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const upcomingAppts = allAppts.filter(a => a.date > today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
  const pastAppts     = allAppts.filter(a => a.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));

  const todayEl    = document.getElementById('today-list');
  const upEl       = document.getElementById('upcoming-list');
  const pastEl     = document.getElementById('past-list');
  const todayWrap  = document.getElementById('today-section');

  // Today section — show/hide based on whether there are any
  if (todayWrap) todayWrap.style.display = todayAppts.length ? 'block' : 'none';
  if (todayEl) {
    todayEl.innerHTML = todayAppts.map(a => apptItemHtml(a, true, false)).join('');
  }

  sectionLabel('upcoming-label', 'Upcoming', upcomingAppts.length);
  upEl.innerHTML = upcomingAppts.length
    ? upcomingAppts.map(a => apptItemHtml(a, false, false)).join('')
    : `<div class="empty-state"><div class="empty-state-title">No upcoming appointments</div><div class="empty-state-sub">Book one using the button above</div></div>`;

  sectionLabel('past-label', 'Past', pastAppts.length);
  pastEl.innerHTML = pastAppts.length
    ? pastAppts.map(a => apptItemHtml(a, false, true)).join('')
    : `<div class="empty-state"><div class="empty-state-title">No past appointments</div></div>`;
}

/* ── Save appointment ─────────────────────────────────────── */
document.getElementById('appt-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('a-save-btn');
  Utils.setLoading(btn, true);

  try {
    const customerName = document.getElementById('a-customer').value.trim();
    if (!customerName) { Utils.toast('Please enter a customer name', 'error'); Utils.setLoading(btn, false); return; }

    // Find existing customer or auto-create so name is always saved
    let customer = customersList.find(c => c.name.toLowerCase() === customerName.toLowerCase());
    if (!customer) {
      customer = await API.customers.create({ name: customerName });
      customersList.push(customer);
    }

    // Pydantic v2 requires HH:MM:SS — pad the browser's HH:MM value
    const rawTime = document.getElementById('a-time').value;
    const timeVal = rawTime ? (rawTime.length === 5 ? rawTime + ':00' : rawTime) : null;

    const created = await API.appointments.create({
      customer_id: customer.id,
      type:        document.getElementById('a-type').value,
      date:        document.getElementById('a-date').value,
      time:        timeVal,
      note:        document.getElementById('a-notes').value.trim() || null,
    });

    allAppts.push({
      ...created,
      customer_name: created.customer_name,
      notes: created.note,
      time:  created.time ? String(created.time).substring(0, 5) : '',
    });
    renderAppointments();
    Utils.closeModal('appt-modal');
    Utils.toast('Appointment booked', 'success');
    e.target.reset();
    document.getElementById('a-date').value = today;
  } catch (err) {
    Utils.toast(err.message, 'error');
  } finally {
    Utils.setLoading(btn, false);
  }
});

/* ── Init ────────────────────────────────────────────────── */
document.getElementById('a-date').value = today;
Utils.initModalClose();

async function loadData() {
  try {
    const [appts, customers] = await Promise.all([API.appointments.list(), API.customers.list()]);
    customersList = customers;
    allAppts = appts.map(a => ({
      ...a,
      notes: a.note,
      time: a.time ? String(a.time).substring(0, 5) : '',
    }));
    renderAppointments();
  } catch (err) {
    Utils.toast('Failed to load appointments: ' + err.message, 'error');
    renderAppointments();
  }
}

loadData();

if (new URLSearchParams(window.location.search).get('new') === '1') {
  Utils.openModal('appt-modal');
}
