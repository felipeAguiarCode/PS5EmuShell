import { MODAL_CLOSE_MS } from '../constants/ui.js';
import { escapeHtml, queryOne } from '../core/dom.js';
import {
  focusElement,
  getFocusedElement,
  getLastFocus,
  getNavScope,
  recoverFocus,
  replaceNavScope,
  restoreLastFocus,
  setNavScope,
} from '../navigation/spatial-navigation.js';
import { readHintsHtml, restoreHintsHtml, setHints } from './hints.js';
import { playSound } from './sound.js';

const DEFAULT_HINTS = [
  ['a', 'Selecionar'],
  ['b', 'Voltar'],
];

const modalStack = [];

const getModalLayer = () => queryOne('#modal-layer');

export const getTopModal = () => modalStack[modalStack.length - 1];

export const isModalOpen = () => modalStack.length > 0;

export const openModal = ({ html, className = '', onButton, onKey, hints, initial, onMount }) => {
  const layer = getModalLayer();
  layer.classList.remove('hidden', 'closing');
  const box = document.createElement('div');
  box.className = `modal ${className}`;
  box.innerHTML = html;
  layer.querySelectorAll('.modal').forEach((modal) => {
    modal.style.display = 'none';
  });
  layer.appendChild(box);
  return new Promise((resolve) => {
    const entry = {
      box,
      resolve,
      onButton,
      onKey,
      previousScope: getNavScope(),
      previousFocus: getFocusedElement(),
      previousLastFocus: getLastFocus(),
      previousHints: readHintsHtml(),
    };
    modalStack.push(entry);
    setHints(hints || DEFAULT_HINTS);
    if (onMount) onMount(box, entry);
    setNavScope(box, initial ? queryOne(initial, box) : null);
    playSound('open');
  });
};

export const closeModal = (value = null) => {
  const entry = modalStack.pop();
  if (!entry) return;
  const layer = getModalLayer();
  entry.box.remove();
  restoreHintsHtml(entry.previousHints);
  if (modalStack.length) {
    getTopModal().box.style.display = '';
  } else {
    layer.classList.add('closing');
    setTimeout(() => {
      if (!modalStack.length) layer.classList.add('hidden');
    }, MODAL_CLOSE_MS);
  }
  replaceNavScope(entry.previousScope);
  if (entry.previousFocus && entry.previousFocus.isConnected) {
    focusElement(entry.previousFocus, { silent: true, noScroll: true });
  } else {
    restoreLastFocus(entry.previousLastFocus);
    const recovered = recoverFocus();
    if (recovered) focusElement(recovered, { silent: true, noScroll: true });
  }
  entry.resolve(value);
};

export const handleModalButton = (button) => {
  const top = getTopModal();
  if (!top) return false;
  if (top.onButton && top.onButton(button)) return true;
  if (button === 'b') {
    playSound('back');
    closeModal(null);
    return true;
  }
  return false;
};

export const handleModalKey = (event) => {
  const top = getTopModal();
  return Boolean(top && top.onKey && top.onKey(event));
};

const renderMenuItemRight = (item) => {
  if (item.right !== null && item.right !== undefined) {
    return `<span class="r">${item.checked ? '✓ ' : ''}${escapeHtml(item.right)}</span>`;
  }
  return item.checked ? '<span class="r">✓</span>' : '';
};

const renderMenuItem = (item, index) =>
  `<button class="menu-item focusable${item.checked ? ' checked' : ''}" data-group="menu" data-i="${index}">` +
  `<span class="ico">${item.icon || ''}</span><span>${escapeHtml(item.label)}</span>` +
  `${renderMenuItemRight(item)}</button>`;

export const openMenu = ({ title, sub, items }) => {
  const checkedIndex = items.findIndex((item) => item.checked);
  return openModal({
    html:
      `<h3>${escapeHtml(title)}</h3>${sub ? `<div class="sub">${escapeHtml(sub)}</div>` : ''}` +
      items.map(renderMenuItem).join(''),
    initial: checkedIndex >= 0 ? `[data-i="${checkedIndex}"]` : null,
    onMount: (box) =>
      box.addEventListener('click', (event) => {
        const button = event.target.closest('.menu-item');
        if (!button) return;
        playSound('select');
        const item = items[Number(button.dataset.i)];
        closeModal(item.value !== undefined ? item.value : Number(button.dataset.i));
      }),
  });
};

export const openConfirm = (title, sub, { ok = 'Confirmar', cancel = 'Cancelar' } = {}) =>
  openModal({
    html: `<h3>${escapeHtml(title)}</h3><div class="sub">${escapeHtml(sub || '')}</div><div class="modal-buttons">
        <button class="btn-pill focusable" data-group="mb" data-v="0">${escapeHtml(cancel)}</button>
        <button class="btn-pill focusable" data-group="mb" data-v="1">${escapeHtml(ok)}</button></div>`,
    initial: '[data-v="1"]',
    onMount: (box) =>
      box.addEventListener('click', (event) => {
        const button = event.target.closest('[data-v]');
        if (!button) return;
        playSound('select');
        closeModal(button.dataset.v === '1');
      }),
  });
