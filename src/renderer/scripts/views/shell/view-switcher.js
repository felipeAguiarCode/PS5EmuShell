import { runCommand } from '../../core/commands.js';
import { queryAll, queryOne, restartAnimation } from '../../core/dom.js';
import { getState, updateState } from '../../core/store.js';
import {
  getFocusedElement,
  getNavMemory,
  isElementVisible,
  replaceNavScope,
  setNavScope,
} from '../../navigation/spatial-navigation.js';
import { setHints } from '../../ui/hints.js';
import { isModalOpen } from '../../ui/modal.js';

const VIEW_CLASSES = [
  'view-home',
  'view-library',
  'view-collections',
  'view-trophies',
  'view-settings',
];
const CONTENT_VIEWS = ['home', 'library', 'collections', 'trophies'];
const TAB_HINT = ['lt+rt', 'Abas'];

const findReturnFocusGroup = (viewName) => {
  if (viewName === 'home') return 'row';
  if (viewName === 'library') return 'grid';
  if (viewName === 'collections') return runCommand('getOpenCollectionId') ? 'cgames' : 'cgrid';
  return runCommand('getTrophiesGameId') ? 'ach' : 'trows';
};

const returnFromSettings = (viewName) => {
  const appElement = queryOne('#app');
  replaceNavScope(appElement);
  const remembered = getNavMemory(findReturnFocusGroup(viewName));
  const isRememberedConnected = Boolean(remembered && remembered.isConnected);
  if (viewName === 'trophies' && !isRememberedConnected) runCommand('showTrophies');
  setNavScope(
    appElement,
    isRememberedConnected && isElementVisible(remembered) ? remembered : null,
  );
};

const enterContentView = (viewName) => {
  const appElement = queryOne('#app');
  if (viewName === 'collections') {
    replaceNavScope(appElement);
    runCommand('renderCollections');
    return;
  }
  if (viewName === 'trophies') {
    replaceNavScope(appElement);
    runCommand('showTrophies');
    return;
  }
  if (viewName === 'home') {
    setNavScope(
      appElement,
      getState().games.length ? runCommand('getHomeRow') : queryOne('#home-empty .btn-play'),
    );
    runCommand('layoutHome', true);
    runCommand('updateHomeHero', true);
    return;
  }
  setNavScope(
    appElement,
    queryOne('.gcard', runCommand('getLibraryGrid')) || queryOne('#lib-filters .side-item.active'),
  );
};

export const setView = (viewName, isInstant) => {
  const previousView = getState().view;
  updateState({ view: viewName });
  document.body.classList.remove(...VIEW_CLASSES);
  document.body.classList.add(`view-${viewName}`);
  queryOne('#view-settings').classList.toggle('hidden', viewName !== 'settings');
  if (viewName !== 'settings') {
    for (const contentView of CONTENT_VIEWS) {
      queryOne(`#view-${contentView}`).classList.toggle('hidden', contentView !== viewName);
    }
    queryAll('.tab').forEach((tab) =>
      tab.classList.toggle('active', tab.dataset.view === viewName),
    );
    if (!isInstant && previousView !== 'settings') {
      restartAnimation(queryOne(`#view-${viewName}`), 'entering');
    }
    if (previousView === 'settings') returnFromSettings(viewName);
    else enterContentView(viewName);
  }
  updateHints();
};

const isFocusOnHomeGame = (focused) => {
  const currentItem = runCommand('getCurrentHomeItem');
  return (
    (focused === runCommand('getHomeRow') || (focused && focused.dataset.group === 'actions')) &&
    currentItem &&
    currentItem.kind === 'game'
  );
};

export const updateHints = () => {
  if (isModalOpen()) return;
  const { view } = getState();
  if (view === 'settings') {
    setHints(runCommand('listSettingsHints'));
    return;
  }
  if (view === 'collections') {
    setHints([...runCommand('listCollectionsHints'), TAB_HINT]);
    return;
  }
  if (view === 'trophies') {
    setHints([...runCommand('listTrophiesHints'), TAB_HINT]);
    return;
  }
  const focused = getFocusedElement();
  const isOnGame =
    (view === 'home' && isFocusOnHomeGame(focused)) ||
    Boolean(focused && focused.classList.contains('gcard'));
  const gameHints = isOnGame
    ? [
        ['a', 'Jogar'],
        ['y', 'Opções'],
        ['x', 'Favoritar'],
      ]
    : [['a', 'Selecionar']];
  const backHints = view === 'library' ? [['b', 'Voltar']] : [];
  setHints([...gameHints, ['lb+rb', 'Sistema'], TAB_HINT, ...backHints]);
};
