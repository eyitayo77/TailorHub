const Sidebar = (() => {
  const NAV_ITEMS = [
    { href: 'dashboard.html',  label: 'Dashboard',  icon: 'grid' },
    { href: 'orders.html',     label: 'Orders',     icon: 'clipboard' },
    { href: 'customers.html',  label: 'Customers',  icon: 'users' },
    { href: 'payments.html',   label: 'Payments',   icon: 'credit-card' },
    { href: 'analytics.html',  label: 'Analytics',  icon: 'bar-chart' },
  ];

  const ICONS = {
    grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    clipboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>`,
    users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
    'credit-card': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>`,
    'bar-chart': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
    more: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>`,
  };

  function render(activePage) {
    const current = window.location.pathname.split('/').pop() || 'index.html';
    const active  = activePage || current;
    const user    = Auth.getUser();

    const items = user?.is_admin
      ? [...NAV_ITEMS, { href: 'admin.html', label: 'Admin', icon: 'shield' }]
      : NAV_ITEMS;

    const navHtml = items.map(item => {
      const isActive = item.href === active ? 'active' : '';
      return `<a href="${item.href}" class="nav-item ${isActive}" data-nav-href="${item.href}">${ICONS[item.icon]}<span>${item.label}</span></a>`;
    }).join('');

    return `
      <aside class="sidebar">
        <div class="sidebar-logo">
          <div class="logo-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span>Tailor <span>Hub</span></span>
        </div>

        <div class="sidebar-section-label">Main</div>
        ${navHtml}

        <div class="sidebar-spacer"></div>

        <a href="profile.html" class="sidebar-user" id="sidebar-user-btn">
          <div class="avatar avatar-purple" id="sidebar-avatar">AO</div>
          <div>
            <div class="sidebar-user-name" id="sidebar-user-name">Loading…</div>
            <div class="sidebar-user-role" id="sidebar-user-role">Tailor</div>
          </div>
        </a>
        <button class="sidebar-signout" id="sidebar-signout-btn">
          <span class="sidebar-signout-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span>
          Sign out
        </button>
      </aside>`;
  }

  function init(activePage) {
    const target = document.getElementById('sidebar-root');
    if (target) target.innerHTML = render(activePage);

    Auth.populateSidebarUser();

    const signoutBtn = document.getElementById('sidebar-signout-btn');
    if (signoutBtn) {
      signoutBtn.addEventListener('click', () => {
        if (confirm('Sign out of Tailor Hub?')) Auth.logout();
      });
    }

    _renderMobileNav(activePage);
  }

  function _renderMobileNav(activePage) {
    if (document.getElementById('mobile-bottom-nav')) return;

    const current = activePage || window.location.pathname.split('/').pop() || 'index.html';
    const user    = Auth.getUser();

    // Always show these 4 core items in the bar
    const coreItems = NAV_ITEMS.slice(0, 4); // Dashboard, Orders, Customers, Payments

    // Overflow items go into the "More" sheet
    const overflowItems = [NAV_ITEMS[4]]; // Analytics
    if (user?.is_admin) overflowItems.push({ href: 'admin.html', label: 'Admin', icon: 'shield' });

    const overflowHrefs = overflowItems.map(i => i.href).concat(['profile.html']);
    const moreActive    = overflowHrefs.includes(current) ? 'active' : '';

    const navHtml = coreItems.map(item => {
      const isActive = item.href === current ? 'active' : '';
      return `<a href="${item.href}" class="mob-nav-item ${isActive}" data-nav-href="${item.href}">
        ${ICONS[item.icon]}<span>${item.label}</span>
      </a>`;
    }).join('') + `
      <button class="mob-nav-item ${moreActive}" id="mob-more-btn">
        ${ICONS.more}<span>More</span>
      </button>`;

    const nav = document.createElement('nav');
    nav.id = 'mobile-bottom-nav';
    nav.className = 'mobile-bottom-nav';
    nav.innerHTML = navHtml;
    document.body.appendChild(nav);

    // Build sheet rows for overflow nav items
    const sheetNavHtml = overflowItems.map(item => {
      const isActive = item.href === current ? 'mob-sheet-item--active' : '';
      return `<a href="${item.href}" class="mob-sheet-item ${isActive}">
        <span class="mob-sheet-icon">${ICONS[item.icon]}</span><span>${item.label}</span>
      </a>`;
    }).join('');

    const profileActive = current === 'profile.html' ? 'mob-sheet-item--active' : '';

    const sheet = document.createElement('div');
    sheet.id = 'mob-more-sheet';
    sheet.innerHTML = `
      <div class="mob-sheet-overlay" id="mob-sheet-overlay"></div>
      <div class="mob-sheet-panel">
        <div class="mob-sheet-handle"></div>
        ${sheetNavHtml}
        <a href="profile.html" class="mob-sheet-item ${profileActive}">
          <span class="mob-sheet-icon">${ICONS.user}</span><span>My profile</span>
        </a>
        <div class="mob-sheet-divider"></div>
        <button class="mob-sheet-item mob-sheet-signout" id="mob-signout-btn">
          <span class="mob-sheet-icon">${ICONS.logout}</span><span>Sign out</span>
        </button>
      </div>`;
    document.body.appendChild(sheet);

    document.getElementById('mob-more-btn').addEventListener('click', () => {
      sheet.classList.add('open');
    });
    document.getElementById('mob-sheet-overlay').addEventListener('click', () => {
      sheet.classList.remove('open');
    });
    document.getElementById('mob-signout-btn').addEventListener('click', () => {
      sheet.classList.remove('open');
      if (confirm('Sign out of Tailor Hub?')) Auth.logout();
    });
  }

  function setBadge(href, count) {
    const link = document.querySelector(`[data-nav-href="${href}"]`);
    if (!link) return;
    const existing = link.querySelector('.nav-badge');
    if (existing) existing.remove();
    if (count > 0) {
      const badge = document.createElement('span');
      badge.className = 'nav-badge';
      badge.textContent = count;
      badge.style.cssText = 'margin-left:auto;background:var(--amber-400);color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:20px;';
      link.appendChild(badge);
    }
  }

  return { init, setBadge };
})();
