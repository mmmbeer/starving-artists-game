// DOM Helper Functions

/**
 * Create element with attributes
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {string|HTMLElement} content - Element content
 * @returns {HTMLElement} Created element
 */
function createElement(tag, attributes = {}, content = '') {
  const element = document.createElement(tag);
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.substring(2).toLowerCase(), value);
    } else {
      element.setAttribute(key, value);
    }
  });
  
  if (typeof content === 'string') {
    element.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    element.appendChild(content);
  }
  
  return element;
}

/**
 * Remove all child elements
 * @param {HTMLElement} element - Parent element
 */
function clearElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Get element by selector
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element (optional)
 * @returns {HTMLElement|null} Found element
 */
function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Get elements by selector
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element (optional)
 * @returns {NodeList} Found elements
 */
function $$(selector, parent = document) {
  return parent.querySelectorAll(selector);
}

/**
 * Add class to element
 * @param {HTMLElement} element - Element
 * @param {string} className - Class name
 */
function addClass(element, className) {
  if (element) element.classList.add(className);
}

/**
 * Remove class from element
 * @param {HTMLElement} element - Element
 * @param {string} className - Class name
 */
function removeClass(element, className) {
  if (element) element.classList.remove(className);
}

/**
 * Toggle class on element
 * @param {HTMLElement} element - Element
 * @param {string} className - Class name
 */
function toggleClass(element, className) {
  if (element) element.classList.toggle(className);
}

/**
 * Check if element has class
 * @param {HTMLElement} element - Element
 * @param {string} className - Class name
 * @returns {boolean} Has class
 */
function hasClass(element, className) {
  return element ? element.classList.contains(className) : false;
}

/**
 * Show element
 * @param {HTMLElement} element - Element to show
 * @param {string} display - Display type (default: 'block')
 */
function show(element, display = 'block') {
  if (element) element.style.display = display;
}

/**
 * Hide element
 * @param {HTMLElement} element - Element to hide
 */
function hide(element) {
  if (element) element.style.display = 'none';
}

/**
 * Toggle element visibility
 * @param {HTMLElement} element - Element
 * @param {string} display - Display type when shown
 */
function toggle(element, display = 'block') {
  if (!element) return;
  if (element.style.display === 'none') {
    show(element, display);
  } else {
    hide(element);
  }
}

/**
 * Set element text
 * @param {HTMLElement} element - Element
 * @param {string} text - Text content
 */
function setText(element, text) {
  if (element) element.textContent = text;
}

/**
 * Set element HTML
 * @param {HTMLElement} element - Element
 * @param {string} html - HTML content
 */
function setHTML(element, html) {
  if (element) element.innerHTML = html;
}

/**
 * Get form data as object
 * @param {HTMLFormElement} form - Form element
 * @returns {Object} Form data
 */
function getFormData(form) {
  const formData = new FormData(form);
  const data = {};
  formData.forEach((value, key) => {
    data[key] = value;
  });
  return data;
}

/**
 * Disable element
 * @param {HTMLElement} element - Element
 */
function disable(element) {
  if (element) element.disabled = true;
}

/**
 * Enable element
 * @param {HTMLElement} element - Element
 */
function enable(element) {
  if (element) element.disabled = false;
}

/**
 * Scroll to element
 * @param {HTMLElement} element - Element to scroll to
 * @param {Object} options - Scroll options
 */
function scrollTo(element, options = { behavior: 'smooth', block: 'center' }) {
  if (element) element.scrollIntoView(options);
}

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createElement,
    clearElement,
    $,
    $$,
    addClass,
    removeClass,
    toggleClass,
    hasClass,
    show,
    hide,
    toggle,
    setText,
    setHTML,
    getFormData,
    disable,
    enable,
    scrollTo
  };
}
