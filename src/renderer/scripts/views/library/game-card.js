import { escapeHtml } from '../../core/dom.js';
import { formatDuration } from '../../core/format.js';
import { findGameStats, findSystem } from '../../core/selectors.js';
import { getState } from '../../core/store.js';
import { ICONS } from '../../ui/icons.js';
import { renderImageTag } from '../../ui/images.js';

const DEFAULT_CARD_COLOR = '#444';

const renderCardSubtitle = (game, system, stats) =>
  `${escapeHtml(system ? system.shortName : game.system)}` +
  `${game.region ? ` · ${escapeHtml(game.region)}` : ''}` +
  `${stats.playTime > 0 ? ` · ${escapeHtml(formatDuration(stats.playTime))}` : ''}`;

export const renderGameCard = (game) => {
  const state = getState();
  const system = findSystem(state, game.system);
  const stats = findGameStats(state, game.id);
  return (
    `<button class="gcard focusable${game.cover ? ' has-img' : ''}" data-group="grid" data-id="${game.id}">` +
    `<div class="art" style="--c:${escapeHtml(system ? system.color : DEFAULT_CARD_COLOR)}">${renderImageTag(game.cover, game.title)}<div class="ph">${escapeHtml(game.title)}</div>` +
    `${stats.favorite ? `<span class="fav">${ICONS.starFill}</span>` : ''}</div>` +
    `<div class="t">${escapeHtml(game.title)}</div><div class="s">${renderCardSubtitle(game, system, stats)}</div></button>`
  );
};
