// UI Helper Functions

/**
 * Show a toast notification
 * @param {string} title - Toast title
 * @param {string} message - Toast message
 * @param {string} type - Toast type: 'success', 'danger', 'warning', 'info'
 * @param {number} duration - Auto-hide duration in ms (0 = no auto-hide)
 */
function showToast(title, message, type = 'info', duration = 5000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toastId = 'toast-' + Date.now();
  const bgClass = `bg-${type}`;
  
  const toastHTML = `
    <div class="toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true" id="${toastId}">
      <div class="d-flex">
        <div class="toast-body">
          <strong>${title}</strong><br>
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', toastHTML);
  
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, {
    autohide: duration > 0,
    delay: duration
  });
  
  toast.show();
  
  // Remove from DOM after hidden
  toastElement.addEventListener('hidden.bs.toast', () => {
    toastElement.remove();
  });
}

/**
 * Show loading spinner in button
 * @param {HTMLElement} button - Button element
 * @param {boolean} loading - Show or hide loading
 */
function setButtonLoading(button, loading) {
  const text = button.querySelector('.btn-text');
  const spinner = button.querySelector('.spinner-border');
  
  if (loading) {
    button.disabled = true;
    if (text) text.dataset.originalText = text.textContent;
    if (spinner) spinner.classList.remove('d-none');
  } else {
    button.disabled = false;
    if (text && text.dataset.originalText) {
      text.textContent = text.dataset.originalText;
    }
    if (spinner) spinner.classList.add('d-none');
  }
}

/**
 * Format time remaining
 * @param {number} seconds - Seconds remaining
 * @returns {string} Formatted time
 */
function formatTimeRemaining(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Safely parse JSON
 * @param {string} json - JSON string
 * @param {*} defaultValue - Default value if parse fails
 * @returns {*} Parsed object or default value
 */
function safeJSONParse(json, defaultValue = null) {
  try {
    return JSON.parse(json);
  } catch (e) {
    console.error('JSON parse error:', e);
    return defaultValue;
  }
}

/**
 * Get paint color CSS
 * @param {string} color - Paint color name
 * @returns {string} CSS color value
 */
function getPaintColor(color) {
  const colors = {
    red: 'var(--paint-red)',
    orange: 'var(--paint-orange)',
    yellow: 'var(--paint-yellow)',
    green: 'var(--paint-green)',
    blue: 'var(--paint-blue)',
    purple: 'var(--paint-purple)',
    black: 'var(--paint-black)',
    wild: 'var(--paint-wild)'
  };
  return colors[color] || colors.black;
}

/**
 * Pluralize word
 * @param {number} count - Count
 * @param {string} singular - Singular form
 * @param {string} plural - Plural form (optional)
 * @returns {string} Pluralized string
 */
function pluralize(count, singular, plural = null) {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural || singular + 's'}`;
}

/**
 * Animate element
 * @param {HTMLElement} element - Element to animate
 * @param {string} animation - Animation class
 */
function animate(element, animation) {
  element.classList.add('animate__animated', animation);
  element.addEventListener('animationend', () => {
    element.classList.remove('animate__animated', animation);
  }, { once: true });
}

/**
 * Show confirmation dialog
 * @param {string} message - Confirmation message
 * @returns {boolean} User confirmed
 */
function confirmAction(message) {
  return confirm(message);
}

function createDefaultModalIcon(type) {
  if (type === 'buy') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6h14l-1.4 7.2a2 2 0 0 1-2 1.6H9.3L8.8 17H19v2H8a2 2 0 0 1-1.9-1.4L3.3 6.5H1V4h3.8l.7 2z"></path><circle cx="10" cy="21" r="1.5"></circle><circle cx="17" cy="21" r="1.5"></circle></svg>';
  }

  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7A1 1 0 0 0 5.7 7.1l4.9 4.9-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z"></path></svg>';
}

function createModalActionButton(action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `app-modal-action-btn ${action.variant === 'primary' ? 'primary' : 'secondary'}`;
  button.disabled = !!action.disabled;
  if (action.testId) {
    button.setAttribute('data-testid', action.testId);
  }
  button.innerHTML = `
    <span class="app-modal-action-icon">${action.icon || createDefaultModalIcon(action.iconType)}</span>
    <span>${action.label}</span>
  `;
  button.addEventListener('click', () => {
    if (typeof action.onClick === 'function') {
      action.onClick();
    }
  });
  return button;
}

function openAppModal(config) {
  const overlay = document.createElement('div');
  overlay.className = 'app-modal-overlay';
  overlay.setAttribute('role', 'presentation');
  if (config.testId) {
    overlay.setAttribute('data-testid', config.testId);
  }

  const dialog = document.createElement('section');
  dialog.className = 'app-modal-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  if (config.title) {
    dialog.setAttribute('aria-label', config.title);
  }
  if (config.maxWidth) {
    dialog.style.setProperty('--app-modal-max-width', config.maxWidth);
  }

  const header = document.createElement('header');
  header.className = 'app-modal-header';

  const title = document.createElement('h2');
  title.className = 'app-modal-title';
  title.textContent = config.title || '';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'app-modal-close';
  closeBtn.setAttribute('aria-label', 'Close modal');
  closeBtn.innerHTML = '<img src="/assets/close.svg" alt="" />';

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'app-modal-body';

  const footer = document.createElement('footer');
  footer.className = 'app-modal-footer';

  dialog.appendChild(header);
  dialog.appendChild(body);
  dialog.appendChild(footer);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  document.body.classList.add('app-modal-open');

  const modalApi = {
    isOpen: true,
    setTitle(nextTitle) {
      title.textContent = nextTitle || '';
      if (nextTitle) {
        dialog.setAttribute('aria-label', nextTitle);
      }
    },
    setBodyContent(content) {
      body.innerHTML = '';
      if (typeof content === 'string') {
        body.innerHTML = content;
      } else if (content instanceof Node) {
        body.appendChild(content);
      }
    },
    setActions(actions = []) {
      footer.innerHTML = '';
      actions.forEach(action => {
        footer.appendChild(createModalActionButton(action));
      });
    },
    close(reason = 'close') {
      if (!modalApi.isOpen) return;
      modalApi.isOpen = false;
      document.removeEventListener('keydown', handleEscape);
      overlay.removeEventListener('click', handleOverlayClick);
      closeBtn.removeEventListener('click', handleCloseClick);
      overlay.remove();
      document.body.classList.remove('app-modal-open');
      if (typeof config.onClose === 'function') {
        config.onClose(reason);
      }
    },
    getBodyElement() {
      return body;
    }
  };

  function handleEscape(event) {
    if (event.key === 'Escape' && config.closeOnEscape !== false) {
      modalApi.close('escape');
    }
  }

  function handleOverlayClick(event) {
    if (event.target === overlay && config.closeOnBackdrop !== false) {
      modalApi.close('backdrop');
    }
  }

  function handleCloseClick() {
    modalApi.close('close');
  }

  document.addEventListener('keydown', handleEscape);
  overlay.addEventListener('click', handleOverlayClick);
  closeBtn.addEventListener('click', handleCloseClick);

  modalApi.setBodyContent(config.bodyContent || '');
  modalApi.setActions(config.actions || []);

  return modalApi;
}

window.openAppModal = openAppModal;

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showToast,
    setButtonLoading,
    formatTimeRemaining,
    debounce,
    throttle,
    safeJSONParse,
    getPaintColor,
    pluralize,
    animate,
    confirmAction,
    openAppModal
  };
}
