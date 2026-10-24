import { escapeHtml } from '../../core/dom.js';
import { renderGlyph } from '../../ui/glyphs.js';
import { ICONS } from '../../ui/icons.js';
import { calculateRangePercent } from './settings-helpers.js';

const formatRangeValue = (row, value) => (row.format ? row.format(value) : value);

const renderRowLead = (row) => {
  if (row.leadHtml) return row.leadHtml;
  if (row.glyph) return renderGlyph(row.glyph);
  if (row.icon)
    return `<span class="ico" style="width:22px;height:22px;flex:none">${row.icon}</span>`;
  if (row.swatch && row.type !== 'select') {
    return `<span class="swatch" style="--c:${escapeHtml(row.swatch)}"></span>`;
  }
  return '';
};

const renderSelectValue = (row) => {
  const currentValue = row.get();
  const current = row.options.find((option) => option.v === currentValue) || {
    l: String(currentValue ?? '—'),
  };
  const shown = row.swatch
    ? `<span class="swatch" style="--c:${escapeHtml(current.v)}"></span>`
    : current.html || `<span>${escapeHtml(current.l)}</span>`;
  return `<div class="select-val"><span class="chev">${ICONS.chevL}</span>${shown}<span class="chev">${ICONS.chevR}</span></div>`;
};

const renderRangeValue = (row) => {
  const value = row.get();
  const reset =
    row.def !== undefined
      ? `<span class="rng-reset${value === row.def ? ' hidden' : ''}" title="Voltar ao recomendado (${escapeHtml(formatRangeValue(row, row.def))})">${ICONS.refresh}</span>`
      : '';
  return (
    reset +
    `<span class="rng-val">${escapeHtml(formatRangeValue(row, value))}</span>` +
    `<input type="range" min="${row.min}" max="${row.max}" step="${row.step || 1}" value="${value}" tabindex="-1" style="--p:${calculateRangePercent(value, row.min, row.max)}%">`
  );
};

const renderStatusDot = (isFound, title) =>
  `<span class="status-dot${isFound ? ' ok' : ''}"${title ? ` title="${title}"` : ''}></span>`;

const renderPathValue = (row, isPathFound) => {
  const value = row.get();
  const isFound = row.noCheck ? null : isPathFound(value);
  const dot =
    isFound === null || isFound === undefined
      ? ''
      : renderStatusDot(isFound, isFound ? 'Encontrado' : 'Não encontrado');
  return `${dot}<span class="text">${escapeHtml(value || '—')}</span><span class="arrow">${ICONS.folder}</span>`;
};

const renderLinkValue = (row) => {
  const dot = row.ok === null || row.ok === undefined ? '' : renderStatusDot(row.ok);
  return `${dot}<span class="arrow">${ICONS.chevR}</span>`;
};

const VALUE_RENDERERS = {
  toggle: (row) => `<div class="toggle${row.get() ? ' on' : ''}"></div>`,
  select: renderSelectValue,
  range: renderRangeValue,
  text: (row) =>
    `<input type="text" spellcheck="false" value="${escapeHtml(row.get())}" tabindex="-1">`,
  path: renderPathValue,
  link: renderLinkValue,
};

const renderRowValue = (row, isPathFound) => {
  const renderValue = VALUE_RENDERERS[row.type];
  if (renderValue) return renderValue(row, isPathFound);
  return row.right ? `<span>${escapeHtml(row.right)}</span>` : '';
};

export const renderSettingRow = (row, index, isPathFound) => {
  if (row.type === 'title') return `<h1 class="set-title">${escapeHtml(row.label)}</h1>`;
  if (row.type === 'section') return `<div class="set-section">${escapeHtml(row.label)}</div>`;
  if (row.type === 'panel') return `<div class="set-panel">${row.html}</div>`;
  const className = ['set-row', 'focusable', row.style || ''].join(' ');
  const description = row.desc ? `<div class="d">${escapeHtml(row.desc)}</div>` : '';
  return (
    `<button class="${className}" data-group="setrow" data-i="${index}"${row.id ? ` data-id="${row.id}"` : ''}>${renderRowLead(row)}` +
    `<div class="lbl"><div class="l">${escapeHtml(row.label)}</div>${description}</div><div class="val">${renderRowValue(row, isPathFound)}</div></button>`
  );
};

export const formatRangeLabel = formatRangeValue;
