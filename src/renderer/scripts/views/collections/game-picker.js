import { escapeHtml, queryOne } from '../../core/dom.js';
import { findSystem } from '../../core/selectors.js';
import { getState } from '../../core/store.js';
import { renderGlyph } from '../../ui/glyphs.js';
import { ICONS } from '../../ui/icons.js';
import { closeModal, openModal } from '../../ui/modal.js';
import { playSound } from '../../ui/sound.js';
import { sortGamesByTitle } from './collection-rules.js';

const FALLBACK_SYSTEM_COLOR = '#444';
const PICKER_HINTS = [
  ['a', 'Marcar'],
  ['start', 'Concluir'],
  ['b', 'Cancelar'],
];

const renderPickRow = (game, isSelected) => {
  const system = findSystem(getState(), game.system);
  return (
    `<button class="menu-item pick focusable${isSelected ? ' checked' : ''}" data-group="pick" data-id="${game.id}">` +
    `<span class="pick-art" style="--c:${escapeHtml(system ? system.color : FALLBACK_SYSTEM_COLOR)}">${game.cover ? `<img src="${escapeHtml(game.cover)}" alt="" loading="lazy">` : ''}</span>` +
    `<span class="pick-t">${escapeHtml(game.title)}</span><span class="r">${escapeHtml(system ? system.shortName : '')}<span class="check">${ICONS.check}</span></span></button>`
  );
};

export const pickCollectionGames = async (collection) => {
  const games = sortGamesByTitle(getState().games);
  let selectedIds = new Set(collection.games);
  const isConfirmed = await openModal({
    className: 'pick-games',
    html:
      `<h3>Adicionar jogos a “${escapeHtml(collection.name)}”</h3><div class="sub"><span class="pick-count"></span> · ${renderGlyph('a')} marcar · ${renderGlyph('start')} concluir</div>` +
      `<div class="pick-list">${games.map((game) => renderPickRow(game, selectedIds.has(game.id))).join('')}</div>` +
      `<div class="modal-buttons"><button class="btn-pill focusable" data-group="mb" data-done="1">Concluir</button></div>`,
    hints: PICKER_HINTS,
    onMount: (box) => {
      const updateCount = () => {
        queryOne('.pick-count', box).textContent = `${selectedIds.size} selecionados`;
      };
      updateCount();
      box.addEventListener('click', (event) => {
        if (event.target.closest('[data-done]')) {
          closeModal(true);
          return;
        }
        const row = event.target.closest('.pick');
        if (!row) return;
        const gameId = row.dataset.id;
        selectedIds = selectedIds.has(gameId)
          ? new Set([...selectedIds].filter((id) => id !== gameId))
          : new Set([...selectedIds, gameId]);
        row.classList.toggle('checked', selectedIds.has(gameId));
        playSound('toggle');
        updateCount();
      });
    },
    onButton: (button) => {
      if (button !== 'start') return false;
      closeModal(true);
      return true;
    },
  });
  return isConfirmed ? selectedIds : null;
};
