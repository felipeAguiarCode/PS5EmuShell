import { registerCommands, runCommand } from '../../core/commands.js';
import { escapeHtml, makeDebounced, queryAll, queryOne } from '../../core/dom.js';
import { findGame } from '../../core/selectors.js';
import { getState } from '../../core/store.js';
import {
  focusElement,
  getFocusedElement,
  rememberNavElement,
} from '../../navigation/spatial-navigation.js';
import { findConsoleIcon } from '../../ui/console-icons.js';
import { ICONS } from '../../ui/icons.js';
import { openMenu } from '../../ui/modal.js';
import { playSound } from '../../ui/sound.js';
import { openKeyboard } from '../../ui/virtual-keyboard.js';
import { renderGameCard } from './game-card.js';
import {
  DEFAULT_LIBRARY_FILTER,
  DEFAULT_LIBRARY_SORT,
  LIBRARY_SORTS,
  countLibraryGames,
  filterLibraryGames,
  findSortLabel,
  formatGameCount,
} from './library-filters.js';

const SEARCH_DEBOUNCE_MS = 120;

let grid = null;
let filter = DEFAULT_LIBRARY_FILTER;
let sort = DEFAULT_LIBRARY_SORT;
let query = '';

const listVisibleGames = () => {
  const { games, stats } = getState();
  return filterLibraryGames({ games, gameStats: stats.games, filter, sort, query });
};

const buildSideItems = () => {
  const { games, stats, config } = getState();
  const counts = countLibraryGames({ games, gameStats: stats.games });
  return [
    { id: 'all', label: 'Todos os jogos', icon: ICONS.grid, count: games.length },
    { id: 'fav', label: 'Favoritos', icon: ICONS.star, count: counts.favorites },
    { id: 'recent', label: 'Jogados', icon: ICONS.history, count: counts.recent },
    ...config.systems
      .filter((system) => system.enabled !== false)
      .map((system) => ({
        id: system.id,
        label: system.name,
        icon: findConsoleIcon(system.id),
        isConsole: true,
        count: counts.bySystem[system.id] || 0,
      })),
  ];
};

const renderSideItem = (item) =>
  `<button class="side-item focusable${item.id === filter ? ' active' : ''}" data-group="libnav" data-filter="${escapeHtml(item.id)}">` +
  `<span class="ico${item.isConsole ? ' console' : ''}">${item.icon}</span>` +
  `<span>${escapeHtml(item.label)}</span><span class="n">${item.count}</span></button>`;

const renderSide = () => {
  const items = buildSideItems();
  queryOne('#lib-filters').innerHTML = items.map(renderSideItem).join('');
  rememberNavElement('libnav', queryOne('#lib-filters .side-item.active'));
  const currentItem = items.find((item) => item.id === filter);
  queryOne('#lib-heading').textContent = query
    ? `Busca: “${query}”`
    : currentItem
      ? currentItem.label
      : '';
  queryOne('#lib-sort').innerHTML =
    `<span class="ico">${ICONS.sort}</span>${escapeHtml(findSortLabel(sort))}`;
  queryOne('#lib-search').innerHTML =
    `<span class="ico">${ICONS.search}</span>${query ? 'Editar busca' : 'Buscar'}`;
};

const renderGrid = () => {
  const focused = getFocusedElement();
  const focusedId = focused && focused.classList.contains('gcard') ? focused.dataset.id : null;
  const games = listVisibleGames();
  queryOne('#lib-count').textContent = formatGameCount(games.length);
  if (!games.length) {
    grid.innerHTML = `<div class="lib-empty">${query ? 'Nenhum jogo corresponde à busca.' : 'Nenhum jogo aqui ainda.'}</div>`;
    return;
  }
  grid.innerHTML = games.map(renderGameCard).join('');
  grid.scrollTop = 0;
  if (focusedId) {
    const sameCard = queryOne(`.gcard[data-id="${focusedId}"]`, grid);
    if (sameCard) focusElement(sameCard, { silent: true, instant: true });
  }
};

const refreshLibrary = () => {
  renderSide();
  renderGrid();
};

const updateArt = (gameId) => {
  const card = queryOne(`.gcard[data-id="${gameId}"]`, grid);
  const game = findGame(getState(), gameId);
  if (!card || !game) return;
  const isFocused = card.classList.contains('focused');
  const container = document.createElement('div');
  container.innerHTML = renderGameCard(game);
  const freshCard = container.firstChild;
  card.replaceWith(freshCard);
  if (isFocused) focusElement(freshCard, { silent: true, noScroll: true });
};

const cycleFilter = (step) => {
  const filters = queryAll('#lib-filters .side-item').map((item) => item.dataset.filter);
  filter = filters[(filters.indexOf(filter) + step + filters.length) % filters.length];
  playSound('move');
  refreshLibrary();
};

const chooseSort = async () => {
  const selectedSort = await openMenu({
    title: 'Ordenar por',
    items: LIBRARY_SORTS.map((option) => ({
      label: option.label,
      value: option.id,
      checked: option.id === sort,
      icon: ICONS.sort,
    })),
  });
  if (!selectedSort) return;
  sort = selectedSort;
  refreshLibrary();
};

const openSearch = async () => {
  if (getState().view !== 'library') runCommand('setView', 'library');
  const previousQuery = query;
  const result = await openKeyboard({
    title: 'Buscar jogos',
    value: query,
    onChange: makeDebounced((text) => {
      query = text;
      refreshLibrary();
    }, SEARCH_DEBOUNCE_MS),
  });
  query = result === null ? previousQuery : result;
  refreshLibrary();
  const firstCard = queryOne('.gcard', grid);
  if (result !== null && firstCard) focusElement(firstCard, { silent: true });
};

const handleButton = (button) => {
  if (button === 'lb' || button === 'rb') {
    cycleFilter(button === 'rb' ? 1 : -1);
    return true;
  }
  if (button === 'b' && query) {
    query = '';
    playSound('back');
    refreshLibrary();
    return true;
  }
  return false;
};

const selectFilter = (nextFilter) => {
  filter = nextFilter;
  refreshLibrary();
};

const bindEvents = () => {
  const filters = queryOne('#lib-filters');
  filters.addEventListener('navfocus', (event) => {
    const item = event.target.closest('.side-item');
    if (item && item.dataset.filter !== filter) selectFilter(item.dataset.filter);
  });
  filters.addEventListener('click', (event) => {
    const item = event.target.closest('.side-item');
    if (!item) return;
    selectFilter(item.dataset.filter);
    const firstCard = queryOne('.gcard', grid);
    if (firstCard) focusElement(firstCard);
  });
  grid.addEventListener('click', (event) => {
    const card = event.target.closest('.gcard');
    if (!card) return;
    const game = findGame(getState(), card.dataset.id);
    if (!game) return;
    playSound('select');
    runCommand('launchGame', game, queryOne('.art', card));
  });
  grid.addEventListener('navfocus', (event) => {
    const card = event.target.closest('.gcard');
    if (card) runCommand('setBackground', findGame(getState(), card.dataset.id));
  });
  queryOne('#lib-sort').addEventListener('click', chooseSort);
  queryOne('#lib-search').addEventListener('click', openSearch);
};

export const initLibraryView = () => {
  grid = queryOne('#lib-grid');
  bindEvents();
  registerCommands({
    refreshLibrary,
    renderLibrarySide: renderSide,
    updateLibraryArt: updateArt,
    openLibrarySearch: openSearch,
    handleLibraryButton: handleButton,
    getLibraryGrid: () => grid,
  });
};
