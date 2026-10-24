import { escapeHtml, queryOne } from '../core/dom.js';
import { renderGlyph } from './glyphs.js';

const getHintsElement = () => queryOne('#hints');

export const setHints = (hints) => {
  getHintsElement().innerHTML = hints
    .map(
      ([button, label]) =>
        `<div class="hint">${renderGlyph(button)}<span>${escapeHtml(label)}</span></div>`,
    )
    .join('');
};

export const readHintsHtml = () => getHintsElement().innerHTML;

export const restoreHintsHtml = (html) => {
  getHintsElement().innerHTML = html;
};
