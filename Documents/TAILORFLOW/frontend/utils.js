const Utils = (() => {

  function formatCurrency(amount) {
    const num = Number(amount) || 0;
    return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
  }

  function isOverdue(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date() && new Date(dateStr).toDateString() !== new Date().toDateString();
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const diff = new Date(dateStr) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function initials(name) {
    if (!name) return '??';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  const STATUS_MAP = {
    pending:   { label: 'Pending',     cls: 'pill-pending' },
    progress:  { label: 'In progress', cls: 'pill-progress' },
    fitting:   { label: 'Fitting',     cls: 'pill-progress' },
    ready:     { label: 'Ready',       cls: 'pill-ready' },
    delivered: { label: 'Delivered',   cls: 'pill-done' },
    overdue:   { label: 'Overdue',     cls: 'pill-overdue' },
  };

  function statusPill(status) {
    const s = STATUS_MAP[status] || { label: status, cls: 'pill-done' };
    return `<span class="pill ${s.cls}">${s.label}</span>`;
  }

  function avatarHtml(name, colorClass = 'avatar-purple', size = 34) {
    return `<div class="avatar ${colorClass}" style="width:${size}px;height:${size}px;font-size:${Math.round(size*0.35)}px">${initials(name)}</div>`;
  }

  let toastContainer;
  function toast(message, type = 'default', duration = 3000) {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    toastContainer.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, duration);
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  }

  function initModalClose() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('open');
      });
    });
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) modal.classList.remove('open');
      });
    });
  }

  function setLoading(btnEl, loading) {
    if (loading) {
      btnEl.dataset.origText = btnEl.innerHTML;
      btnEl.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;border-top-color:#fff"></div>';
      btnEl.disabled = true;
    } else {
      btnEl.innerHTML = btnEl.dataset.origText || btnEl.innerHTML;
      btnEl.disabled = false;
    }
  }

  return { formatCurrency, formatDate, formatDateShort, isOverdue, daysUntil, initials, statusPill, avatarHtml, toast, openModal, closeModal, initModalClose, setLoading };
})();
