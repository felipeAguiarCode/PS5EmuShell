import { invokeMain } from '../../core/api.js';
import { registerCommands, runCommand } from '../../core/commands.js';
import { escapeHtml, makeDebounced, queryAll, queryOne } from '../../core/dom.js';
import { getState } from '../../core/store.js';
import { focusElement, getFocusedElement } from '../../navigation/spatial-navigation.js';
import { ICONS } from '../../ui/icons.js';
import { getTopModal, openMenu } from '../../ui/modal.js';
import { playSound } from '../../ui/sound.js';
import { showToast } from '../../ui/toast.js';
import { openKeyboard } from '../../ui/virtual-keyboard.js';
import { DATE_ICON, renderRarityPyramid, renderTrophyIcon } from './trophy-icons.js';
import {
  ACHIEVEMENT_FILTERS,
  ACHIEVEMENT_SORTS,
  COUNTED_TIERS,
  GAME_SORTS,
  TIER_NAMES,
  buildAchievementList,
  buildRomIndex,
  calculateProgressPercent,
  calculateRarityLabel,
  countGamesByConsole,
  countTrophyTiers,
  findConsoleTag,
  findCycledId,
  findPlayerCount,
  formatDateTime,
  formatPercent,
  hasRomForGame,
  isGameMastered,
  listSystemFilterIds,
  listVisibleGames,
  readTrophyRules,
  sumEarnedTiers,
} from './trophy-rules.js';

const PREFERENCE_PREFIX = 'trophies.';
const OVERVIEW_TTL_MS = 5 * 60 * 1000;
const SEARCH_DEBOUNCE_MS = 150;
const TIER_WORKER_COUNT = 2;
const LOCALE = 'pt-BR';
const NOT_CONFIGURED_ERROR = /Configurações|conta|chave/i;

let trophies = null;
let romIndexCache = { games: null, index: null };

const readPreference = (key, fallback) => {
  try {
    return localStorage.getItem(PREFERENCE_PREFIX + key) || fallback;
  } catch (error) {
    console.warn('Failed to read trophies preference', key, error);
    return fallback;
  }
};

const savePreference = (key, value) => {
  try {
    localStorage.setItem(PREFERENCE_PREFIX + key, value);
  } catch (error) {
    console.warn('Failed to save trophies preference', key, error);
  }
};

const updateTrophies = (patch) => {
  trophies = { ...trophies, ...patch };
};

const getViewElement = () => queryOne('#view-trophies');
const getBodyElement = () => queryOne('#tr-body');
const getRules = () => readTrophyRules(getState().config);
const listAllGames = () => (trophies.data && trophies.data.games) || [];
const formatNumber = (value) => value.toLocaleString(LOCALE);

const getRomIndex = () => {
  const { games } = getState();
  if (romIndexCache.games !== games) romIndexCache = { games, index: buildRomIndex(games) };
  return romIndexCache.index;
};

const hasRom = (raGame) => hasRomForGame(getRomIndex(), raGame);

const refocusTrophies = (selector) => {
  if (getState().view !== 'trophies' || getTopModal()) return;
  const body = getBodyElement();
  const element =
    (selector && queryOne(selector, getViewElement())) ||
    queryOne('.trow', body) ||
    queryOne('.ach', body) ||
    queryOne('.focusable', body);
  if (element) focusElement(element, { silent: true, instant: true });
};

const renderRaImage = (relativePath) => {
  const url = trophies.imageUrls[relativePath];
  return `<img data-ra="${escapeHtml(relativePath || '')}" ${url ? `src="${escapeHtml(url)}"` : ''} alt="" decoding="async">`;
};

const resolveImages = async (relativePaths) => {
  const missing = [
    ...new Set(relativePaths.filter((path) => path && !(path in trophies.imageUrls))),
  ];
  if (!missing.length) return;
  const resolved = await invokeMain('ra:images', missing);
  updateTrophies({ imageUrls: { ...trophies.imageUrls, ...resolved } });
  for (const image of queryAll('img[data-ra]', getViewElement())) {
    const url = trophies.imageUrls[image.dataset.ra];
    if (url && image.getAttribute('src') !== url) image.src = url;
  }
};

const renderTiers = (tiers) =>
  COUNTED_TIERS.map(
    (tier) =>
      `<span class="tr-tier">${renderTrophyIcon(tier)}<b>${tiers ? tiers[tier][0] : '–'}</b></span>`,
  ).join('');

const renderSummary = (games) => {
  const profile = (trophies.data && trophies.data.profile) || {};
  const platinumCount = games.filter(isGameMastered).length;
  const earned = sumEarnedTiers(trophies.tiersByGame);
  const total = games.reduce((sum, game) => sum + (game.NumAwarded || 0), 0);
  return (
    `<div class="tr-level" title="Pontos no RetroAchievements"><span class="hex">${renderTrophyIcon('silver')}</span><b>${formatNumber(profile.TotalPoints || 0)}</b></div>` +
    `<div class="tr-total"><span>Total</span><b>${formatNumber(total)}</b></div>` +
    [
      ['platinum', platinumCount],
      ['gold', earned.gold],
      ['silver', earned.silver],
      ['bronze', earned.bronze],
    ]
      .map(
        ([tier, count]) =>
          `<div class="tr-sum">${renderTrophyIcon(tier, 'xl')}<b>${formatNumber(count)}</b></div>`,
      )
      .join('')
  );
};

const updateHeader = () => {
  const summary = queryOne('.tr-summary', getBodyElement());
  if (summary && trophies.data && !trophies.gameId)
    summary.innerHTML = renderSummary(listAllGames());
};

const renderChip = (attribute, label, isActive, count) =>
  `<button class="chip focusable${isActive ? ' active' : ''}" data-group="trchips" ${attribute}>${escapeHtml(label)}${count !== undefined ? `<span class="count">${count}</span>` : ''}</button>`;

const renderFilters = () => {
  const games = listAllGames();
  const counts = countGamesByConsole(games);
  const romCount = games.filter(hasRom).length;
  const sortLabel = GAME_SORTS.find((sort) => sort.id === trophies.gameSort).label;
  return (
    `<div class="tr-filterbar"><div class="tr-chips">` +
    renderChip('data-sys="all"', 'Todos', trophies.systemFilter === 'all', games.length) +
    renderChip('data-rom="1"', 'Com ROM', trophies.isRomOnly, romCount) +
    `<span class="tr-sep"></span>` +
    Object.keys(counts)
      .sort()
      .map((consoleName) =>
        renderChip(
          `data-sys="${escapeHtml(consoleName)}"`,
          findConsoleTag(consoleName),
          trophies.systemFilter === consoleName,
          counts[consoleName],
        ),
      )
      .join('') +
    `</div><div class="lib-tools">` +
    `<button class="btn-pill focusable" data-group="trtools" data-cmd="search"><span class="ico">${ICONS.search}</span>${trophies.query ? `“${escapeHtml(trophies.query)}”` : 'Buscar'}</button>` +
    `<button class="btn-pill focusable" data-group="trtools" data-cmd="sort"><span class="ico">${ICONS.sort}</span>${escapeHtml(sortLabel)}</button>` +
    `</div></div>`
  );
};

const renderGameRow = (game) => {
  const percent = calculateProgressPercent(game.NumAwarded, game.MaxPossible);
  return (
    `<button class="trow focusable" data-group="trows" data-id="${game.GameID}">` +
    `<span class="tr-icon">${renderRaImage(game.ImageIcon)}</span>` +
    `<span class="tr-info"><span class="tr-game">${escapeHtml(game.Title)}</span><span class="tr-tags"><span class="tr-tag">${escapeHtml(findConsoleTag(game.ConsoleName))}</span>${hasRom(game) ? '<span class="tr-tag rom">Installed</span>' : ''}</span></span>` +
    `<span class="tr-plat">${isGameMastered(game) ? renderTrophyIcon('platinum', 'xl') : ''}</span>` +
    `<span class="tr-pct"><b>${percent}%</b><i><s style="transform:scaleX(${percent / 100})"></s></i></span>` +
    `<span class="tr-tiers">${renderTiers(trophies.tiersByGame[game.GameID])}</span></button>`
  );
};

const renderEmptyState = () => {
  const { error, isLoading } = trophies;
  const isNotConfigured = error && NOT_CONFIGURED_ERROR.test(error);
  const message = isLoading
    ? 'Carregando seus troféus do RetroAchievements…'
    : error || 'Carregando…';
  const action = isNotConfigured
    ? `<button class="btn-play focusable" data-group="tr" data-cmd="settings">Configurar RetroAchievements</button>`
    : `<button class="btn-play focusable" data-group="tr" data-cmd="sync">Tentar novamente</button>`;
  return (
    `<div class="tr-empty">${renderTrophyIcon('gold', 'big')}<h1>Troféus</h1>` +
    `<p>${escapeHtml(message)}</p>` +
    (error ? `<div class="hero-actions">${action}</div>` : '<div class="spinner"></div>') +
    `</div>`
  );
};

const renderGameListBody = (games) => {
  if (games.length) return `<div class="tr-games">${games.map(renderGameRow).join('')}</div>`;
  const isFiltered = trophies.systemFilter !== 'all' || trophies.isRomOnly || trophies.query;
  if (isFiltered) {
    return `<div class="lib-empty">Nenhum jogo corresponde aos filtros.<div class="hero-actions" style="margin-top:18px"><button class="btn-pill focusable" data-group="tr" data-cmd="clear">Limpar filtros</button></div></div>`;
  }
  return `<div class="lib-empty">Nenhum jogo com conquistas ainda. Jogue algo com o RetroAchievements ativo nos emuladores.</div>`;
};

const buildBadgePath = (achievement) => `/Badge/${achievement.BadgeName}.png`;

const renderAchievementBadge = (achievement) => {
  if (achievement.platinum) {
    return `<span class="a-badge plat">${renderTrophyIcon('platinum', 'huge')}</span>`;
  }
  return `<span class="a-badge">${renderRaImage(buildBadgePath(achievement))}</span>`;
};

const renderRarityLine = (achievement, players) => {
  if (!players) return '';
  const label = calculateRarityLabel(getRules(), achievement.pct);
  return `${renderRarityPyramid(label)}<span>${label} | ${formatPercent(achievement.pct)} dos jogadores obtiveram</span>`;
};

const renderAchievementRow = (achievement, players) =>
  `<div class="ach arow focusable${achievement.earned ? ' got' : ' locked'}" data-group="ach" tabindex="-1">` +
  renderAchievementBadge(achievement) +
  `<div class="a-main"><div class="a-head"><span class="a-title">${escapeHtml(achievement.Title)}</span>` +
  (achievement.earned
    ? `<span class="a-date">${DATE_ICON}${escapeHtml(formatDateTime(achievement.earned))}</span>`
    : `<span class="a-date lockd">Não obtido</span>`) +
  `</div><div class="a-line">${renderTrophyIcon(achievement.tier, 'sm')}<span>${TIER_NAMES[achievement.tier]}${achievement.platinum ? '' : ` · ${achievement.Points} pts`}</span></div>` +
  `<div class="a-line rar">${renderRarityLine(achievement, players)}</div></div>` +
  `<div class="a-desc">${escapeHtml(achievement.Description || '')}</div></div>`;

const renderAchievementCard = (achievement) =>
  `<div class="ach acard focusable${achievement.earned ? ' got' : ' locked'}" data-group="ach" tabindex="-1">` +
  `<div class="ac-art">${renderAchievementBadge(achievement)}</div>` +
  `<div class="ac-tier">${renderTrophyIcon(achievement.tier, 'sm')}${TIER_NAMES[achievement.tier]}</div>` +
  `<div class="ac-title">${escapeHtml(achievement.Title)}</div><div class="ac-desc">${escapeHtml(achievement.Description || '')}</div></div>`;

const renderDetail = () => {
  const { game, mode } = trophies;
  const body = getBodyElement();
  const summary = listAllGames().find((candidate) => candidate.GameID === trophies.gameId) || {};
  if (!game) {
    body.innerHTML = `<div class="tr-empty"><div class="spinner"></div><p>Carregando troféus de ${escapeHtml(summary.Title || 'jogo')}…</p></div>`;
    return;
  }
  const rules = getRules();
  const { list, total, got, mastered } = buildAchievementList({
    rules,
    game,
    sort: trophies.achievementSort,
    filter: trophies.achievementFilter,
  });
  const percent = calculateProgressPercent(got, total);
  const tiers = countTrophyTiers(rules, game);
  const players = findPlayerCount(game);
  const filterLabel = ACHIEVEMENT_FILTERS.find(
    (filter) => filter.id === trophies.achievementFilter,
  ).label;
  const sortLabel = ACHIEVEMENT_SORTS.find((sort) => sort.id === trophies.achievementSort).label;
  body.innerHTML =
    `<div class="td-top">` +
    `<span class="td-icon">${renderRaImage(game.ImageIcon)}</span><h1 class="td-title">${escapeHtml(game.Title)}</h1>` +
    `<div class="td-stats">${renderTrophyIcon('platinum', 'xl' + (mastered ? '' : ' dim'))}` +
    `<div class="td-stat"><span>Progresso</span><b>${percent}%</b><i><s style="transform:scaleX(${percent / 100})"></s></i></div>` +
    `<div class="td-stat"><span>Obtidos</span><b>${got}/${total}</b></div>` +
    COUNTED_TIERS.map(
      (tier) =>
        `<div class="td-tier">${renderTrophyIcon(tier, 'lg')}<b>${tiers[tier][0]}</b></div>`,
    ).join('') +
    `</div></div>` +
    `<div class="td-bar"><button class="td-filter focusable" data-group="tdtools" data-cmd="filter">${escapeHtml(filterLabel)}: ${list.length}</button>` +
    `<div class="td-tools"><button class="td-sort focusable" data-group="tdtools" data-cmd="sort">Ordenar por: ${escapeHtml(sortLabel)}</button>` +
    `<button class="td-mode focusable" data-group="tdtools" data-cmd="mode" title="Lista / Grade">${mode === 'grid' ? ICONS.library : ICONS.grid}</button></div></div>` +
    (list.length
      ? `<div class="td-${mode}">${list
          .map((achievement) =>
            mode === 'grid'
              ? renderAchievementCard(achievement, players)
              : renderAchievementRow(achievement, players),
          )
          .join('')}</div>`
      : `<div class="lib-empty">Nenhum troféu neste filtro.</div>`);
  resolveImages([
    game.ImageIcon,
    ...list.filter((achievement) => !achievement.platinum).map(buildBadgePath),
  ]);
  refocusTrophies('.ach');
};

const renderTrophies = () => {
  if (trophies.gameId) {
    renderDetail();
    return;
  }
  const body = getBodyElement();
  if (!trophies.data) {
    body.innerHTML = renderEmptyState();
    refocusTrophies();
    return;
  }
  const allGames = listAllGames();
  const games = listVisibleGames({
    games: allGames,
    systemFilter: trophies.systemFilter,
    isRomOnly: trophies.isRomOnly,
    query: trophies.query,
    sort: trophies.gameSort,
    hasRom,
  });
  body.innerHTML =
    `<div class="tr-top"><h1 class="tr-h1">Troféus</h1><div class="tr-summary">${renderSummary(allGames)}</div></div>` +
    renderFilters() +
    `<div class="tr-bar"><span>${games.length} de ${allGames.length} ${allGames.length === 1 ? 'jogo' : 'jogos'}${trophies.data.stale ? ' · <em>offline (dados em cache)</em>' : ''}</span></div>` +
    renderGameListBody(games);
  resolveImages(games.map((game) => game.ImageIcon));
  refocusTrophies(trophies.lastFocusId ? `.trow[data-id="${trophies.lastFocusId}"]` : null);
};

const loadTiers = async () => {
  const pendingGames = listAllGames().filter((game) => !trophies.tiersByGame[game.GameID]);
  let nextIndex = 0;
  const runWorker = async () => {
    while (nextIndex < pendingGames.length) {
      const game = pendingGames[nextIndex];
      nextIndex += 1;
      const result = await invokeMain('ra:game', game.GameID, false);
      if (!result.ok) continue;
      const tiers = countTrophyTiers(getRules(), result);
      updateTrophies({ tiersByGame: { ...trophies.tiersByGame, [game.GameID]: tiers } });
      const cell = queryOne(`.trow[data-id="${game.GameID}"] .tr-tiers`, getBodyElement());
      if (cell) cell.innerHTML = renderTiers(tiers);
      updateHeader();
    }
  };
  await Promise.all(Array.from({ length: TIER_WORKER_COUNT }, runWorker));
};

const loadOverview = async (isForced) => {
  if (trophies.isLoading) return;
  updateTrophies({ isLoading: true });
  if (isForced) {
    showToast('Sincronizando troféus…', 'RetroAchievements', {
      kind: 'raSync',
      ms: 2000,
      sound: false,
    });
  }
  const result = await invokeMain('ra:overview', isForced);
  updateTrophies({ isLoading: false });
  if (!result.ok) {
    updateTrophies({ error: result.error });
    if (isForced)
      showToast('Não foi possível sincronizar', result.error, { kind: 'raError', ms: 6000 });
  } else {
    updateTrophies({ error: null, data: result });
  }
  if (getState().view === 'trophies' && !trophies.gameId) renderTrophies();
  if (trophies.data) loadTiers();
};

const showTrophies = async () => {
  const rulesSignature = JSON.stringify(getRules());
  if (trophies.rulesSignature && trophies.rulesSignature !== rulesSignature) {
    updateTrophies({ tiersByGame: {} });
    if (trophies.data) loadTiers();
  }
  updateTrophies({ rulesSignature });
  if (trophies.gameId) {
    renderDetail();
    return;
  }
  renderTrophies();
  if (!trophies.data || Date.now() - (trophies.data.cachedAt || 0) > OVERVIEW_TTL_MS) {
    await loadOverview(false);
  }
};

const setFilters = (patch) => {
  updateTrophies(patch);
  savePreference('sys', trophies.systemFilter);
  savePreference('romOnly', trophies.isRomOnly ? '1' : '0');
  savePreference('gameSort', trophies.gameSort);
  const focused = getFocusedElement();
  const focusedKey = focused && (focused.dataset.sys || focused.dataset.rom || focused.dataset.cmd);
  renderTrophies();
  if (!focusedKey) return;
  const element = queryOne(
    `[data-sys="${focusedKey}"], [data-rom="${focusedKey}"], [data-cmd="${focusedKey}"]`,
    getBodyElement(),
  );
  if (element) focusElement(element, { silent: true, noScroll: true });
};

const cycleSystemFilter = (delta) => {
  const ids = listSystemFilterIds(listAllGames());
  playSound('move');
  setFilters({ systemFilter: findCycledId(ids, trophies.systemFilter, delta) });
};

const openSearch = async () => {
  const previousQuery = trophies.query;
  const result = await openKeyboard({
    title: 'Buscar jogos com troféus',
    value: trophies.query,
    onChange: makeDebounced((text) => {
      updateTrophies({ query: text });
      renderTrophies();
    }, SEARCH_DEBOUNCE_MS),
  });
  updateTrophies({ query: result === null ? previousQuery : result.trim() });
  renderTrophies();
};

const openGameTrophies = async (gameId) => {
  updateTrophies({ lastFocusId: gameId, gameId, achievementFilter: 'all', game: null });
  renderDetail();
  const result = await invokeMain('ra:game', gameId, false);
  if (trophies.gameId !== gameId) return;
  if (!result.ok) {
    showToast('Não foi possível carregar o jogo', result.error, { kind: 'raError' });
    closeGameTrophies();
    return;
  }
  updateTrophies({
    game: result,
    tiersByGame: { ...trophies.tiersByGame, [gameId]: countTrophyTiers(getRules(), result) },
  });
  renderDetail();
};

const closeGameTrophies = () => {
  updateTrophies({ gameId: null, game: null });
  playSound('back');
  renderTrophies();
};

const cycleAchievementFilter = (delta) => {
  const ids = ACHIEVEMENT_FILTERS.map((filter) => filter.id);
  updateTrophies({ achievementFilter: findCycledId(ids, trophies.achievementFilter, delta) });
  playSound('move');
  renderDetail();
};

const toggleDisplayMode = () => {
  updateTrophies({ mode: trophies.mode === 'grid' ? 'list' : 'grid' });
  savePreference('mode', trophies.mode);
  playSound('toggle');
  renderDetail();
};

const buildSortItems = (sorts, selectedId) =>
  sorts.map((sort) => ({
    label: sort.label,
    value: sort.id,
    checked: sort.id === selectedId,
    icon: ICONS.sort,
  }));

const chooseSort = async () => {
  if (trophies.gameId) {
    const value = await openMenu({
      title: 'Ordenar troféus por',
      items: buildSortItems(ACHIEVEMENT_SORTS, trophies.achievementSort),
    });
    if (!value) return;
    updateTrophies({ achievementSort: value });
    savePreference('sort', value);
    renderDetail();
    return;
  }
  const value = await openMenu({
    title: 'Ordenar jogos por',
    items: buildSortItems(GAME_SORTS, trophies.gameSort),
  });
  if (!value) return;
  setFilters({ gameSort: value });
};

const refreshCurrentGame = async () => {
  const result = await invokeMain('ra:game', trophies.gameId, true);
  if (!result.ok) return;
  updateTrophies({ game: result });
  renderDetail();
};

const TOOL_ACTIONS = {
  sync: () => loadOverview(true),
  settings: () => runCommand('openSettings', 'retroachievements'),
  sort: chooseSort,
  mode: toggleDisplayMode,
  filter: () => cycleAchievementFilter(1),
};

const handleClick = (event) => {
  const target = event.target.closest('[data-cmd], [data-sys], [data-rom], .trow');
  if (!target) return;
  playSound('select');
  if (target.classList.contains('trow')) {
    openGameTrophies(Number(target.dataset.id));
    return;
  }
  if (target.dataset.sys) {
    setFilters({ systemFilter: target.dataset.sys });
    return;
  }
  if (target.dataset.rom) {
    setFilters({ isRomOnly: !trophies.isRomOnly });
    return;
  }
  const command = target.dataset.cmd;
  if (command === 'search') {
    openSearch();
    return;
  }
  if (command === 'clear') {
    setFilters({ systemFilter: 'all', isRomOnly: false, query: '' });
    return;
  }
  TOOL_ACTIONS[command]?.();
};

const handleListButton = (button) => {
  if (button === 'b' && trophies.query) {
    playSound('back');
    setFilters({ query: '' });
    return true;
  }
  if (button === 'lb' || button === 'rb') {
    cycleSystemFilter(button === 'rb' ? 1 : -1);
    return true;
  }
  if (button === 'y') {
    playSound('toggle');
    setFilters({ isRomOnly: !trophies.isRomOnly });
    return true;
  }
  if (button === 'back') {
    openSearch();
    return true;
  }
  return false;
};

const handleDetailButton = (button) => {
  if (button === 'y') {
    toggleDisplayMode();
    return true;
  }
  if (button === 'lb' || button === 'rb') {
    cycleAchievementFilter(button === 'rb' ? 1 : -1);
    return true;
  }
  return false;
};

const handleTrophiesButton = (button) => {
  if (button === 'b' && trophies.gameId) {
    closeGameTrophies();
    return true;
  }
  if (!trophies.gameId && trophies.data && handleListButton(button)) return true;
  if (button === 'start') {
    chooseSort();
    return true;
  }
  if (button === 'x') {
    if (trophies.gameId) refreshCurrentGame();
    else loadOverview(true);
    return true;
  }
  if (trophies.gameId && trophies.game) return handleDetailButton(button);
  return false;
};

const listTrophiesHints = () => {
  if (trophies.gameId) {
    return [
      ['y', trophies.mode === 'grid' ? 'Lista' : 'Grade'],
      ['lb+rb', 'Filtro'],
      ['start', 'Ordenar'],
      ['b', 'Voltar'],
    ];
  }
  return [
    ['a', 'Ver troféus'],
    ['lb+rb', 'Sistema'],
    ['y', trophies.isRomOnly ? 'Todos os jogos' : 'Só com ROM'],
    ['back', 'Buscar'],
    ['start', 'Ordenar'],
    ['b', trophies.query ? 'Limpar busca' : 'Voltar'],
  ];
};

export const initTrophiesView = () => {
  trophies = {
    data: null,
    error: null,
    gameId: null,
    game: null,
    gameSort: readPreference('gameSort', 'recent'),
    systemFilter: readPreference('sys', 'all'),
    isRomOnly: readPreference('romOnly', '0') === '1',
    query: '',
    achievementSort: readPreference('sort', 'rarity'),
    mode: readPreference('mode', 'list'),
    achievementFilter: 'all',
    imageUrls: {},
    tiersByGame: {},
    isLoading: false,
    rulesSignature: null,
    lastFocusId: null,
  };
  registerCommands({
    showTrophies,
    getTrophiesGameId: () => trophies.gameId,
    handleTrophiesButton,
    listTrophiesHints,
  });
  const body = getBodyElement();
  body.addEventListener('click', handleClick);
  body.addEventListener('navfocus', () => runCommand('updateHints'));
};
