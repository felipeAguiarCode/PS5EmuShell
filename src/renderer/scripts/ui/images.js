import { escapeHtml } from '../core/dom.js';

export const renderImageTag = (src, alt = '') => {
  if (!src) return '';
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" decoding="async" loading="lazy">`;
};

const handleImageLoad = (event) => {
  if (event.target.tagName === 'IMG') event.target.classList.add('loaded');
};

const handleImageError = (event) => {
  if (event.target.tagName !== 'IMG') return;
  const host = event.target.closest('.has-img');
  if (host) host.classList.remove('has-img');
  event.target.remove();
};

export const installImageListeners = () => {
  document.addEventListener('load', handleImageLoad, true);
  document.addEventListener('error', handleImageError, true);
};
