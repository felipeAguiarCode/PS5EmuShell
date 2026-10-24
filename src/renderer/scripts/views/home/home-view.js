import { runCommand, registerCommands } from '../../core/commands.js';
import {
  escapeHtml,
  forceReflow,
  makeDebounced,
  queryAll,
  queryOne,
  restartAnimation,
} from '../../core/dom.js';
import { formatDuration, formatTimeAgo } from '../../core/format.js';
import {
  findEmulatorForGame,
  findGame,
  findGameStats,
  findSystem,
  isMotionEnabled,
} from '../../core/selectors.js';
import { getState } from '../../core/store.js';
import {
  focusElement,
  getFocusedElement,
  rememberNavElement,
} from '../../navigation/spatial-navigation.js';
import { ICONS } from '../../ui/icons.js';
import { renderImageTag } from '../../ui/images.js';
import { playSound } from '../../ui/sound.js';
import {
  ALL_FILTER,
  DEFAULT_TILE_SIZE_PX,
  DIMMED_TILE_OPACITY,
  FOCUSED_TILE_SCALE,
  TILE_GAP_PX,
  UNFOCUSED_TILE_SCALE,
  buildHomeChips,
  buildHomeItems,
  calculateCycledValue,
  calculateTileOffset,
  calculateVisibleRange,
  findItemIndex,
  resolveActiveFilter,
} from './home-row.js';

const HERO_DELAY_MS = 70;
const RESIZE_DEBOUNCE_MS = 100;
const MIN_WHEEL_DELTA = 4;
const FILTER_ANIMATION_MS = 320;
const FILTER_ANIMATION_EASING = 'cubic-bezier(.2,.85,.25,1)';
const DEFAULT_TILE_COLOR = '#444';
const DEFAULT_HERO_COLOR = '#555';
const MIN_LABEL_WIDTH_PX = 240;

const elements = {};
const tiles = new Map();
const selectedKeyByFilter = {};
let filter = ALL_FILTER;
let items = [];
let selectedIndex = 0;
let heroTimer = null;

const getCurrentItem = () => items[selectedIndex];

const resolveItemGame = (item) => findGame(getState(), item.key) || item.game;

const rebuildItems = () => {
  const { games, stats } = getState();
  items = buildHomeItems({ games, filter, gameStats: stats.games });
};

const renderEmpty = () => {
  const { config } = getState();
  queryOne('.empty-dirs').innerHTML = config.systems
    .filter((system) => system.enabled !== false)
    .flatMap((system) => system.romDirs.map((dir) => `<code>${escapeHtml(dir)}</code>`))
    .join('');
};

const renderChip = (chip) =>
  `<button class="chip focusable${chip.id === filter ? ' active' : ''}" data-group="chips" data-filter="${escapeHtml(chip.id)}">` +
  `${escapeHtml(chip.shortName)}<span class="count">${chip.count}</span></button>`;

const renderChips = () => {
  const { games, config } = getState();
  queryOne('#chips').innerHTML = buildHomeChips({ games, systems: config.systems })
    .map(renderChip)
    .join('');
  rememberNavElement('chips', queryOne('#chips .chip.active'));
};

const renderTileContent = (game, system) =>
  `${renderImageTag(game.cover, game.title)}<div class="ph"><span class="sys">${escapeHtml(system ? system.shortName : '')}</span>${escapeHtml(game.title)}</div>`;

const createTile = (item, index) => {
  const tile = document.createElement('div');
  tile.className = 'tile no-anim';
  tile.dataset.key = item.key;
  if (item.kind === 'library') {
    tile.classList.add('lib-tile');
    tile.innerHTML = `<div class="lib-icon">${ICONS.grid}</div>`;
  } else {
    const game = resolveItemGame(item);
    const system = findSystem(getState(), game.system);
    tile.style.setProperty('--c', system ? system.color : DEFAULT_TILE_COLOR);
    tile.innerHTML = renderTileContent(game, system);
    if (game.cover) tile.classList.add('has-img');
  }
  tile.dataset.idx = index;
  return tile;
};

const readTileSize = () =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tile')) ||
  DEFAULT_TILE_SIZE_PX;

const updateRowLabel = ({ item, tileSize, selectedSize }) => {
  const { label, row } = elements;
  if (item) {
    const state = getState();
    const game = item.kind === 'game' ? resolveItemGame(item) : null;
    const system = game ? findSystem(state, game.system) : null;
    queryOne('.rl-badge', label).textContent = system ? system.shortName : '';
    queryOne('.rl-title', label).textContent = game ? game.title : 'Biblioteca de jogos';
    queryOne('.rl-extra', label).innerHTML = game
      ? findGameStats(state, game.id).favorite
        ? `<span class="rl-fav">${ICONS.starFill}</span>`
        : ''
      : `<span class="rl-count">${state.games.length} jogos</span>`;
    label.style.maxWidth = `${Math.max(MIN_LABEL_WIDTH_PX, (row.clientWidth || innerWidth) - selectedSize - 40)}px`;
    label.style.transform = `translate(${selectedSize + 22}px, ${tileSize + 18}px)`;
  }
  label.classList.toggle('show', Boolean(item));
};

const removeStaleTiles = ({ from, to }) => {
  for (const [key, tile] of tiles) {
    const index = Number(tile.dataset.idx);
    if (index < from || index > to || !items[index] || items[index].key !== key) {
      tile.remove();
      tiles.delete(key);
    }
  }
};

const layoutRow = (isInstant) => {
  const tileSize = readTileSize();
  const stride = tileSize + TILE_GAP_PX;
  const scale = getFocusedElement() === elements.row ? FOCUSED_TILE_SCALE : UNFOCUSED_TILE_SCALE;
  const selectedSize = tileSize * scale;
  updateRowLabel({ item: getCurrentItem(), tileSize, selectedSize });
  const range = calculateVisibleRange({
    selectedIndex,
    itemCount: items.length,
    rowWidth: elements.row.clientWidth || innerWidth,
    stride,
  });
  removeStaleTiles(range);
  const freshTiles = [];
  for (let index = range.from; index <= range.to; index += 1) {
    const item = items[index];
    let tile = tiles.get(item.key);
    if (!tile) {
      tile = createTile(item, index);
      elements.track.appendChild(tile);
      tiles.set(item.key, tile);
      freshTiles.push(tile);
    }
    const isSelected = index === selectedIndex;
    const offset = calculateTileOffset({ index, selectedIndex, stride, selectedSize, tileSize });
    tile.dataset.idx = index;
    tile.style.transform = `translate3d(${offset}px,0,0) scale(${isSelected ? scale : 1})`;
    tile.style.opacity = index < selectedIndex ? DIMMED_TILE_OPACITY : 1;
    tile.style.setProperty('--s', isSelected ? scale : 1);
    tile.classList.toggle('sel', isSelected);
    if (isInstant) tile.classList.add('no-anim');
  }
  forceReflow(elements.track);
  requestAnimationFrame(() => {
    for (const tile of freshTiles) tile.classList.remove('no-anim');
    if (isInstant) for (const tile of tiles.values()) tile.classList.remove('no-anim');
  });
};

const renderLibraryHero = (hero, buttons) => {
  hero.style.setProperty('--sys', DEFAULT_HERO_COLOR);
  queryOne('.hero-meta', hero).innerHTML =
    `<span>${getState().games.length} jogos instalados</span>`;
  buttons.play.textContent = 'Abrir';
  buttons.favorite.classList.add('hidden');
  buttons.options.classList.add('hidden');
  queryOne('.hero-cards', hero).innerHTML = '';
  runCommand('setBackground', null);
};

const renderGameHero = (hero, buttons, game) => {
  const state = getState();
  const stats = findGameStats(state, game.id);
  const system = findSystem(state, game.system);
  hero.style.setProperty('--sys', system ? system.color : DEFAULT_HERO_COLOR);
  queryOne('.hero-meta', hero).innerHTML = [
    stats.favorite ? `<span class="star">★ Favorito</span>` : '',
    game.region ? `<span>${escapeHtml(game.region)}</span>` : '',
    stats.lastPlayed || !stats.playTime
      ? `<span>${escapeHtml(formatTimeAgo(stats.lastPlayed))}</span>`
      : '',
  ].join('');
  buttons.play.textContent = 'Jogar';
  buttons.favorite.classList.remove('hidden');
  buttons.options.classList.remove('hidden');
  buttons.favorite.innerHTML = stats.favorite ? ICONS.starFill : ICONS.star;
  buttons.favorite.classList.toggle('on', Boolean(stats.favorite));
  const emulator = findEmulatorForGame(state, game);
  queryOne('.hero-cards', hero).innerHTML = [
    ['Tempo de jogo', stats.playTime > 0 ? formatDuration(stats.playTime) : 'Nunca jogado'],
    ['Última sessão', stats.lastSessionMs ? formatDuration(stats.lastSessionMs) : '—'],
    ['Sessões', stats.playCount || 0],
    ['Emulador', emulator ? emulator.name : '—'],
  ]
    .map(
      ([key, value]) =>
        `<div class="card"><div class="k">${escapeHtml(key)}</div><div class="v">${escapeHtml(value)}</div></div>`,
    )
    .join('');
  runCommand('setBackground', game);
};

const renderHero = () => {
  const item = getCurrentItem();
  const hero = queryOne('#hero');
  restartAnimation(hero, 'swap');
  const buttons = {
    play: queryOne('[data-cmd="play"]', hero),
    favorite: queryOne('[data-cmd="favorite"]', hero),
    options: queryOne('[data-cmd="options"]', hero),
  };
  if (!item) {
    runCommand('setBackground', null);
    return;
  }
  if (item.kind === 'library') {
    renderLibraryHero(hero, buttons);
    return;
  }
  renderGameHero(hero, buttons, resolveItemGame(item));
};

const updateHero = (isInstant) => {
  clearTimeout(heroTimer);
  if (isInstant) renderHero();
  else heroTimer = setTimeout(renderHero, HERO_DELAY_MS);
};

const refreshHome = (keepId) => {
  const currentItem = getCurrentItem();
  const previousKey = keepId || (currentItem && currentItem.key);
  const { games } = getState();
  filter = resolveActiveFilter(filter, games);
  rebuildItems();
  selectedIndex = findItemIndex(items, previousKey);
  renderChips();
  const isEmpty = games.length === 0;
  elements.view.classList.toggle('empty', isEmpty);
  queryOne('#home-empty').classList.toggle('hidden', !isEmpty);
  if (isEmpty) renderEmpty();
  layoutRow(true);
  updateHero(true);
};

const setFilter = (nextFilter) => {
  if (nextFilter === filter) return;
  const currentItem = getCurrentItem();
  selectedKeyByFilter[filter] = currentItem && currentItem.key;
  filter = nextFilter;
  queryAll('#chips .chip').forEach((chip) =>
    chip.classList.toggle('active', chip.dataset.filter === nextFilter),
  );
  rememberNavElement('chips', queryOne('#chips .chip.active'));
  for (const tile of tiles.values()) tile.remove();
  tiles.clear();
  rebuildItems();
  selectedIndex = findItemIndex(items, selectedKeyByFilter[nextFilter]);
  if (isMotionEnabled(getState().config)) {
    elements.track.animate(
      [
        { opacity: 0.2, transform: 'translateX(24px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: FILTER_ANIMATION_MS, easing: FILTER_ANIMATION_EASING },
    );
  }
  layoutRow(true);
  updateHero(true);
};

const cycleFilter = (step) => {
  const filters = queryAll('#chips .chip').map((chip) => chip.dataset.filter);
  if (filters.length < 2) return;
  setFilter(calculateCycledValue(filters, filter, step));
  playSound('move');
};

const selectItem = (index) => {
  if (!items.length) return;
  if (index < 0 || index >= items.length) {
    playSound('edge');
    return;
  }
  if (index === selectedIndex) return;
  selectedIndex = index;
  playSound('move');
  layoutRow();
  updateHero();
  runCommand('updateHints');
};

const activateItem = () => {
  const item = getCurrentItem();
  if (!item) return;
  playSound('select');
  if (item.kind === 'library') runCommand('setView', 'library');
  else runCommand('launchGame', resolveItemGame(item), tiles.get(item.key));
};

const updateArt = (gameId) => {
  const tile = tiles.get(gameId);
  const state = getState();
  const game = findGame(state, gameId);
  if (!tile || !game) return;
  tile.innerHTML = renderTileContent(game, findSystem(state, game.system));
  tile.classList.toggle('has-img', Boolean(game.cover));
  const item = getCurrentItem();
  if (item && item.key === gameId) runCommand('setBackground', game);
};

const selectHomeGame = (gameId) => {
  setFilter('pc');
  const index = items.findIndex((item) => item.key === gameId);
  if (index >= 0) selectItem(index);
  focusElement(elements.row, { silent: true });
};

const handleHeroAction = (command) => {
  const item = getCurrentItem();
  if (command === 'rescan') return runCommand('rescanLibrary');
  if (command === 'settings') return runCommand('openSettings');
  if (!item) return undefined;
  if (command === 'play') return activateItem();
  if (item.kind !== 'game') return undefined;
  if (command === 'favorite') return runCommand('toggleFavorite', resolveItemGame(item));
  if (command === 'options') return runCommand('openGameOptions', resolveItemGame(item));
  return undefined;
};

const bindRow = () => {
  const { row } = elements;
  row.navHandler = (direction) => {
    if (direction !== 'left' && direction !== 'right') return false;
    selectItem(selectedIndex + (direction === 'right' ? 1 : -1));
    return true;
  };
  row.addEventListener('navfocus', () => {
    layoutRow();
    runCommand('updateHints');
  });
  row.addEventListener('navblur', () => requestAnimationFrame(() => layoutRow()));
  row.addEventListener('click', (event) => {
    const tile = event.target.closest('.tile');
    if (tile && tile.dataset.idx !== undefined && Number(tile.dataset.idx) !== selectedIndex) {
      focusElement(row, { silent: true, noScroll: true });
      selectItem(Number(tile.dataset.idx));
      return;
    }
    activateItem();
  });
  row.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      if (Math.abs(event.deltaY) + Math.abs(event.deltaX) < MIN_WHEEL_DELTA) return;
      selectItem(selectedIndex + ((event.deltaY || event.deltaX) > 0 ? 1 : -1));
    },
    { passive: false },
  );
};

const bindChips = () => {
  const chips = queryOne('#chips');
  chips.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    setFilter(chip.dataset.filter);
    focusElement(elements.row);
  });
  chips.addEventListener('navfocus', (event) => {
    const chip = event.target.closest('.chip');
    if (chip) setFilter(chip.dataset.filter);
  });
};

export const initHomeView = () => {
  elements.view = queryOne('#view-home');
  elements.row = queryOne('#row');
  elements.track = queryOne('#row-track');
  elements.label = queryOne('#row-label');
  bindRow();
  bindChips();
  queryAll('.hero-actions [data-cmd]', elements.view).forEach((button) =>
    button.addEventListener('click', () => handleHeroAction(button.dataset.cmd)),
  );
  queryOne('[data-cmd="favorite"]', elements.view).innerHTML = ICONS.star;
  queryOne('[data-cmd="options"]', elements.view).innerHTML = ICONS.dots;
  window.addEventListener(
    'resize',
    makeDebounced(() => layoutRow(true), RESIZE_DEBOUNCE_MS),
  );
  registerCommands({
    refreshHome,
    layoutHome: layoutRow,
    updateHomeHero: updateHero,
    updateHomeArt: updateArt,
    cycleHomeFilter: cycleFilter,
    getHomeRow: () => elements.row,
    getCurrentHomeItem: () => {
      const item = getCurrentItem();
      return item && item.kind === 'game' ? { ...item, game: resolveItemGame(item) } : item;
    },
    getHomeTile: (gameId) => tiles.get(gameId),
    selectHomeGame,
  });
};
