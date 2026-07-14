/**
 * utils.js — Shared helpers: route guards, formatting, nav rendering.
 */

const Utils = (() => {
  function requireAuth() {
    const user = DB.currentUser();
    if (!user) {
      window.location.href = 'index.html';
      return null;
    }
    return user;
  }

  function requireAdmin() {
    const user = requireAuth();
    if (!user) return null;
    if (user.role !== 'admin') {
      Toast.show('Admin access required.', 'error');
      window.location.href = 'dashboard.html';
      return null;
    }
    return user;
  }

  function redirectIfLoggedIn() {
    const user = DB.currentUser();
    if (user) {
      window.location.href = user.role === 'admin' ? 'admin.html' : 'dashboard.html';
    }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatDateTime(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function riskBadgeClass(risk) {
    return {
      Low: 'badge badge--low',
      Medium: 'badge badge--medium',
      High: 'badge badge--high',
    }[risk] || 'badge';
  }

  function alertLevelClass(level) {
    return {
      Watch: 'badge badge--watch',
      Warning: 'badge badge--medium',
      Critical: 'badge badge--high',
    }[level] || 'badge';
  }

  function initials(name) {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('');
  }

  function renderNav(activePage) {
    const user = DB.currentUser();
    if (!user) return;
    const navEl = document.getElementById('app-nav');
    if (!navEl) return;

    const isAdmin = user.role === 'admin';
    const links = isAdmin
      ? [
          { href: 'admin.html', label: 'Admin Overview', key: 'admin' },
          { href: 'emergency.html', label: 'Emergency Info', key: 'emergency' },
        ]
      : [
          { href: 'dashboard.html', label: 'Dashboard', key: 'dashboard' },
          { href: 'health-check.html', label: 'Daily Check-in', key: 'health-check' },
          { href: 'history.html', label: 'History', key: 'history' },
          { href: 'emergency.html', label: 'Emergency Info', key: 'emergency' },
        ];

    navEl.innerHTML = `
      <div class="nav__brand">
        <span class="nav__pulse" aria-hidden="true">
          <svg viewBox="0 0 120 24" class="pulse-svg"><polyline points="0,12 20,12 28,2 36,22 44,12 120,12" /></svg>
        </span>
        <span>CommunityHealth<strong>AI</strong></span>
      </div>
      <nav class="nav__links">
        ${links
          .map(
            l => `<a href="${l.href}" class="${l.key === activePage ? 'nav__link nav__link--active' : 'nav__link'}">${l.label}</a>`
          )
          .join('')}
      </nav>
      <div class="nav__user">
        <span class="nav__avatar">${initials(user.name)}</span>
        <div class="nav__user-meta">
          <span class="nav__user-name">${user.name}</span>
          <span class="nav__user-role">${isAdmin ? 'Administrator' : 'Citizen'}</span>
        </div>
        <button id="logout-btn" class="btn btn--ghost btn--sm">Log out</button>
      </div>
    `;

    document.getElementById('logout-btn').addEventListener('click', () => {
      DB.clearSession();
      Toast.show('You have been logged out.', 'info');
      setTimeout(() => (window.location.href = 'index.html'), 400);
    });
  }

  function qs(selector, scope = document) {
    return scope.querySelector(selector);
  }
  function qsa(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
  }

  return {
    requireAuth,
    requireAdmin,
    redirectIfLoggedIn,
    formatDate,
    formatDateTime,
    riskBadgeClass,
    alertLevelClass,
    initials,
    renderNav,
    qs,
    qsa,
  };
})();
