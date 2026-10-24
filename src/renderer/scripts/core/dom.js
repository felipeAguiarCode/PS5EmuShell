const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const queryOne = (selector, root = document) => root.querySelector(selector);

export const queryAll = (selector, root = document) => [...root.querySelectorAll(selector)];

export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const makeDebounced = (callback, ms) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), ms);
  };
};

export const cloneJson = (value) => JSON.parse(JSON.stringify(value));

export const restartAnimation = (element, className) => {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
};

export const forceReflow = (element) => void element.offsetWidth;
