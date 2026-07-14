/**
 * toast.js — Lightweight toast notification system.
 * Usage: Toast.show('Report submitted', 'success' | 'warning' | 'error')
 */

const Toast = (() => {
  function ensureContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  const ICONS = {
    success: '✓',
    warning: '!',
    error: '✕',
    info: 'i',
  };

  function show(message, type = 'info', duration = 4200) {
    const container = ensureContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon">${ICONS[type] || ICONS.info}</span>
      <span class="toast__msg">${message}</span>
      <button class="toast__close" aria-label="Dismiss">&times;</button>
    `;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('toast--visible'));

    const remove = () => {
      toast.classList.remove('toast--visible');
      setTimeout(() => toast.remove(), 220);
    };

    toast.querySelector('.toast__close').addEventListener('click', remove);
    setTimeout(remove, duration);
  }

  return { show };
})();
