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
    confirmAction
  };
}
