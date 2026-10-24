import { invokeMain, listenToMain } from '../../core/api.js';
import { registerCommands, runCommand } from '../../core/commands.js';
import {
  cloneJson,
  escapeHtml,
  makeDebounced,
  queryAll,
  queryOne,
  restartAnimation,
} from '../../core/dom.js';
import { getState, updateState } from '../../core/store.js';
import {
  focusElement,
  getFocusedElement,
  setNavScope,
} from '../../navigation/spatial-navigation.js';
import { playSound } from '../../ui/sound.js';
import { openKeyboard } from '../../ui/virtual-keyboard.js';
import { registerPcGamesCommands } from '../pc-games/add-games.js';
import { buildAboutRows } from './pages/about.js';
import { buildAppearanceRows } from './pages/appearance.js';
import { buildControlsRows } from './pages/controls.js';
import { buildCoversRows } from './pages/covers.js';
import { buildGeneralRows } from './pages/general.js';
import { buildLibraryRows } from './pages/library.js';
import {
  buildOptimizeRows,
  handlePerfSample,
  restorePerfSample,
  syncPerfMonitor,
} from './pages/optimize.js';
import { buildRetroAchievementsRows, loadRaStatus } from './pages/retroachievements.js';
import {
  buildSetupRows,
  createFolderStructure,
  handleSetupProgress,
  installMissingEmulators,
  loadSetupStatus,
  loadVersions,
} from './pages/setup.js';
import { buildShortcutsRows } from './pages/shortcuts.js';
import { buildSystemDetailRows } from './pages/system-detail.js';
import { buildSystemsRows } from './pages/systems.js';
import { formatRangeLabel, renderSettingRow } from './setting-rows.js';
import {
  RANGE_RENDER_DELAY_MS,
  SETTINGS_PAGES,
  SETTINGS_SAVE_DEBOUNCE_MS,
} from './settings-constants.js';
import {
  buildCoverProgressText,
  calculateRangePercent,
  findNextOptionValue,
  findPageRoot,
} from './settings-helpers.js';

const PAGE_BUILDERS = {
  general: buildGeneralRows,
  appearance: buildAppearanceRows,
  systems: buildSystemsRows,
  setup: buildSetupRows,
  shortcuts: buildShortcutsRows,
  optimize: buildOptimizeRows,
  retroachievements: buildRetroAchievementsRows,
  controls: buildControlsRows,
  covers: buildCoversRows,
  library: buildLibraryRows,
  about: buildAboutRows,
};

let viewElement = null;
let contentElement = null;
let currentPage = 'general';
let rows = [];
let hasSystemChanges = false;
let pathExists = {};
let previousView = 'home';
let draftConfig = null;
let committedConfig = null;
let rangeRenderTimer = null;

const syncDraft = () => {
  const storedConfig = getState().config;
  if (storedConfig === committedConfig && draftConfig) return;
  draftConfig = cloneJson(storedConfig);
  committedConfig = storedConfig;
};

const getDraft = () => {
  syncDraft();
  return draftConfig;
};

const commitDraft = () => {
  syncDraft();
  committedConfig = cloneJson(draftConfig);
  updateState({ config: committedConfig });
};

const saveSoon = makeDebounced(
  () => invokeMain('config:save', getState().config),
  SETTINGS_SAVE_DEBOUNCE_MS,
);

const isPageVisible = (page) => getState().view === 'settings' && currentPage === page;

const findSideItem = (page) => queryOne(`#set-nav .side-item[data-page="${page}"]`);

const findRowForElement = (element) => rows[Number(element.dataset.i)];

const findFocusedRow = () => {
  const focused = getFocusedElement();
  const isInContent = Boolean(focused) && contentElement.contains(focused);
  return { focused, isInContent, row: isInContent ? findRowForElement(focused) : null };
};

const syncPerf = () =>
  syncPerfMonitor(
    getState().view === 'settings' &&
      currentPage === 'optimize' &&
      document.visibilityState === 'visible',
  );

const refreshExists = async () => {
  const paths = getDraft().systems.flatMap((system) => [
    ...system.romDirs,
    ...system.emulators.map((emulator) => emulator.exe),
  ]);
  const results = await Promise.all(paths.map((path) => invokeMain('path:exists', path)));
  pathExists = Object.fromEntries(paths.map((path, index) => [path, results[index]]));
};

const buildPageRows = (context) => {
  const [kind, argument] = currentPage.split(':');
  if (kind === 'system') return buildSystemDetailRows(context, argument);
  return PAGE_BUILDERS[kind](context);
};

const renderCrumbs = () => {
  const [kind, argument] = currentPage.split(':');
  if (kind !== 'system') return '';
  const system = getDraft().systems.find((candidate) => candidate.id === argument) || {};
  return `Sistemas e emuladores  ›  ${escapeHtml(system.name || '')}`;
};

const attachNavHandlers = () => {
  for (const element of queryAll('.set-row', contentElement)) {
    const row = findRowForElement(element);
    if (row.type === 'select' || row.type === 'toggle') {
      element.navHandler = (direction) => adjustRow(row, direction);
    }
    if (row.type === 'range') {
      element.navHandler = (direction) => slideRange(element, row, direction);
    }
  }
};

const render = () => {
  const focused = getFocusedElement();
  const focusedIndex =
    focused && focused.classList.contains('set-row') ? Number(focused.dataset.i) : null;
  rows = buildPageRows(context) || [];
  queryOne('#set-crumbs').innerHTML = renderCrumbs();
  contentElement.innerHTML = rows
    .map((row, index) => renderSettingRow(row, index, (path) => pathExists[path]))
    .join('');
  if (focusedIndex !== null && !focused.isConnected) {
    const sameRow =
      queryOne(`.set-row[data-i="${Math.min(focusedIndex, rows.length - 1)}"]`, contentElement) ||
      queryOne('.set-row', contentElement);
    if (sameRow) focusElement(sameRow, { silent: true, noScroll: true });
  }
  attachNavHandlers();
  restorePerfSample(context);
  runCommand('updateHints');
};

const changed = (isSystemsChange) => {
  commitDraft();
  if (isSystemsChange) hasSystemChanges = true;
  saveSoon();
  render();
};

const goToPage = async (page, isInstant) => {
  currentPage = page;
  const root = findPageRoot(page);
  for (const item of queryAll('#set-nav .side-item')) {
    item.classList.toggle('active', item.dataset.page === root);
  }
  contentElement.classList.remove('entering');
  if (!isInstant) restartAnimation(contentElement, 'entering');
  contentElement.scrollTop = 0;
  await refreshExists();
  if (root === 'setup') {
    await loadSetupStatus();
    loadVersions(context, false);
  }
  if (root === 'retroachievements') await loadRaStatus();
  render();
  syncPerf();
};

const focusContent = () => {
  const firstRow = queryOne('.set-row', contentElement);
  if (firstRow) focusElement(firstRow);
};

const context = {
  getDraft,
  commitDraft,
  changed,
  saveSoon,
  render,
  go: goToPage,
  focusContent,
  refreshExists,
  isPathFound: (path) => pathExists[path],
  isPageVisible,
  markSystemsDirty: () => {
    hasSystemChanges = true;
  },
  getContentElement: () => contentElement,
};

const applyRow = (row, value) => {
  row.set(value);
  commitDraft();
  if (row.after) row.after();
  changed(Boolean(row.systems));
};

const adjustRow = (row, direction) => {
  if (direction !== 'left' && direction !== 'right') return false;
  if (row.type === 'toggle') {
    const wantedValue = direction === 'right';
    if (row.get() !== wantedValue) {
      playSound('toggle');
      applyRow(row, wantedValue);
    }
    return true;
  }
  playSound('toggle');
  applyRow(row, findNextOptionValue(row.options, row.get(), direction));
  return true;
};

const setRangeValue = (element, row, value) => {
  row.set(value);
  commitDraft();
  const currentValue = row.get();
  const input = queryOne('input[type="range"]', element);
  if (input) {
    input.value = currentValue;
    input.style.setProperty('--p', `${calculateRangePercent(currentValue, row.min, row.max)}%`);
  }
  queryOne('.rng-val', element).textContent = formatRangeLabel(row, currentValue);
  const reset = queryOne('.rng-reset', element);
  if (reset) reset.classList.toggle('hidden', currentValue === row.def);
  saveSoon();
  clearTimeout(rangeRenderTimer);
  rangeRenderTimer = setTimeout(render, RANGE_RENDER_DELAY_MS);
};

const slideRange = (element, row, direction) => {
  if (direction !== 'left' && direction !== 'right') return false;
  const step = row.step || 1;
  const delta = direction === 'right' ? step : -step;
  setRangeValue(element, row, Math.min(row.max, Math.max(row.min, row.get() + delta)));
  playSound('toggle');
  return true;
};

const resetRange = (element, row) => {
  if (row.def === undefined || row.get() === row.def) return;
  setRangeValue(element, row, row.def);
  playSound('back');
};

const editRowText = async (row) => {
  const value = await openKeyboard({ title: row.label, value: row.get() || '' });
  if (value === null) return;
  if (row.type === 'path') {
    row.set(value);
    await refreshExists();
    changed(Boolean(row.systems));
    return;
  }
  applyRow(row, value);
};

const pickRowPath = async (row) => {
  playSound('select');
  const pickedPath = await invokeMain('dialog:pick', {
    kind: row.kind,
    title: row.label,
    defaultPath: row.get(),
    relativeTo: row.relativeTo,
  });
  if (!pickedPath) return;
  row.set(pickedPath);
  await refreshExists();
  changed(Boolean(row.systems));
};

const ROW_CLICK_HANDLERS = {
  toggle: (row) => {
    playSound('toggle');
    applyRow(row, !row.get());
  },
  range: (row, event, element) => {
    if (event.target.closest('.rng-reset')) resetRange(element, row);
  },
  select: (row) => adjustRow(row, 'right'),
  text: async (row, event) => {
    if (event.target.tagName === 'INPUT') return;
    await editRowText(row);
  },
  path: (row) => pickRowPath(row),
  link: async (row) => {
    playSound('select');
    await goToPage(row.go);
    focusContent();
  },
  button: async (row) => {
    playSound('select');
    await row.run();
  },
};

const handleRowClick = async (event) => {
  const element = event.target.closest('.set-row');
  if (!element) return;
  const row = findRowForElement(element);
  if (!row) return;
  if (getFocusedElement() !== element) focusElement(element, { silent: true, noScroll: true });
  const handleClick = ROW_CLICK_HANDLERS[row.type];
  if (handleClick) await handleClick(row, event, element);
};

const handleRowChange = (event) => {
  const input = event.target.closest('input');
  const element = event.target.closest('.set-row');
  if (!input || !element) return;
  const row = findRowForElement(element);
  if (row.type === 'range') {
    setRangeValue(element, row, Number(input.value));
    return;
  }
  applyRow(row, input.value);
};

const handleRangeInput = (event) => {
  const element = event.target.closest('.set-row');
  if (!element || event.target.type !== 'range') return;
  setRangeValue(element, findRowForElement(element), Number(event.target.value));
};

const openSettings = async (page = 'general') => {
  if (getState().view === 'settings') return;
  previousView = getState().view;
  hasSystemChanges = false;
  runCommand('setView', 'settings');
  await goToPage(page, true);
  setNavScope(viewElement, findSideItem(page) || queryOne('#set-nav .side-item'));
};

const closeSettings = async () => {
  runCommand('setView', previousView);
  syncPerf();
  if (!hasSystemChanges) return;
  hasSystemChanges = false;
  await runCommand('rescanLibrary');
};

const focusSystemsListItem = async (systemId) => {
  await goToPage('systems');
  const index = rows.findIndex((row) => row.go === `system:${systemId}`);
  const element = queryOne(`.set-row[data-i="${index}"]`, contentElement);
  if (element) focusElement(element, { silent: true });
};

const handleBackButton = (isInContent) => {
  playSound('back');
  if (isInContent && currentPage.startsWith('system:')) {
    focusSystemsListItem(currentPage.split(':')[1]);
  } else if (isInContent) {
    focusElement(findSideItem(findPageRoot(currentPage)), { silent: true });
  } else {
    closeSettings();
  }
  return true;
};

const cyclePage = (step) => {
  const index = SETTINGS_PAGES.findIndex((page) => page.id === findPageRoot(currentPage));
  const nextPage = SETTINGS_PAGES[(index + step + SETTINGS_PAGES.length) % SETTINGS_PAGES.length];
  playSound('move');
  goToPage(nextPage.id).then(() => focusElement(findSideItem(nextPage.id), { silent: true }));
  return true;
};

const handleSettingsButton = (button) => {
  const { focused, isInContent, row } = findFocusedRow();
  if (button === 'b') return handleBackButton(isInContent);
  if (button === 'y' && row && row.type === 'range' && row.def !== undefined) {
    resetRange(focused, row);
    return true;
  }
  if (button === 'y' && row && row.remove) {
    row.remove();
    playSound('back');
    changed(Boolean(row.systems));
    return true;
  }
  if (button === 'x' && row && row.xRun) {
    playSound('select');
    row.xRun();
    return true;
  }
  if (button === 'x' && row && row.type === 'path') {
    editRowText(row);
    return true;
  }
  if (button === 'lb' || button === 'rb') return cyclePage(button === 'rb' ? 1 : -1);
  if (button === 'start') {
    playSound('back');
    closeSettings();
    return true;
  }
  return false;
};

const ROW_HINTS = {
  range: [
    ['lr', 'Ajustar'],
    ['y', 'Recomendado'],
  ],
  select: [['a', 'Alterar']],
  toggle: [['a', 'Alterar']],
  text: [['a', 'Editar']],
  path: [
    ['a', 'Procurar'],
    ['x', 'Editar texto'],
  ],
};

const listSettingsHints = () => {
  const { row } = findFocusedRow();
  const rowHints = (row && ROW_HINTS[row.type]) || [['a', 'Selecionar']];
  const extraHints = [
    ...(row && row.xRun ? [['x', row.xLabel]] : []),
    ...(row && row.remove ? [['y', row.removeLabel || 'Remover']] : []),
  ];
  return [...rowHints, ...extraHints, ['lb+rb', 'Categoria'], ['b', 'Voltar']];
};

const updateSettingsCoverProgress = () => {
  const value = queryOne('.set-row[data-id="cover-progress"] .val', contentElement);
  if (!value) return;
  value.innerHTML = `<span>${buildCoverProgressText(getState().coverProgress)}</span>`;
};

const renderSideNavigation = () => {
  const navigation = queryOne('#set-nav');
  navigation.innerHTML = SETTINGS_PAGES.map(
    (page) =>
      `<button class="side-item focusable" data-group="setnav" data-page="${page.id}"><span class="ico">${page.icon}</span><span>${escapeHtml(page.label)}</span></button>`,
  ).join('');
  navigation.addEventListener('navfocus', (event) => {
    const item = event.target.closest('.side-item');
    if (item && findPageRoot(currentPage) !== item.dataset.page) goToPage(item.dataset.page);
  });
  navigation.addEventListener('click', (event) => {
    const item = event.target.closest('.side-item');
    if (!item) return;
    if (findPageRoot(currentPage) !== item.dataset.page) goToPage(item.dataset.page);
    focusContent();
  });
};

const bindContentEvents = () => {
  contentElement.addEventListener('click', handleRowClick);
  contentElement.addEventListener('change', handleRowChange);
  contentElement.addEventListener('input', handleRangeInput);
  contentElement.addEventListener('keydown', (event) => {
    if (event.target.tagName === 'INPUT' && (event.key === 'Enter' || event.key === 'Escape')) {
      event.target.blur();
    }
  });
};

export const initSettingsView = () => {
  viewElement = queryOne('#view-settings');
  contentElement = queryOne('#set-content');
  renderSideNavigation();
  bindContentEvents();
  viewElement.addEventListener('navfocus', () => runCommand('updateHints'));
  listenToMain('setup:progress', (progress) => handleSetupProgress(context, progress));
  listenToMain('perf', (sample) => handlePerfSample(context, sample));
  window.addEventListener('focus', syncPerf);
  registerPcGamesCommands();
  registerCommands({
    openSettings,
    closeSettings,
    renderSettings: render,
    listSettingsHints,
    updateSettingsCoverProgress,
    getSettingsPage: () => currentPage,
    handleSettingsButton,
    createFolderStructure: () => createFolderStructure(context),
    installMissingEmulators: () => installMissingEmulators(context),
  });
};
