import { DIRECTION_BUTTONS } from '../constants/buttons.js';
import { runCommand } from '../core/commands.js';
import { findGame } from '../core/selectors.js';
import { getState } from '../core/store.js';
import {
  activateFocused,
  focusElement,
  getFocusedElement,
  moveFocus,
} from '../navigation/spatial-navigation.js';
import { handleModalButton, isModalOpen } from '../ui/modal.js';
import { playSound } from '../ui/sound.js';
import { cycleTab } from '../views/topbar/topbar.js';
import { dismissWelcome } from '../views/shell/boot.js';

const SECONDARY_VIEWS = ['library', 'collections', 'trophies'];
const VIEW_BUTTON_HANDLERS = {
  library: 'handleLibraryButton',
  collections: 'handleCollectionsButton',
  trophies: 'handleTrophiesButton',
};

const isDirection = (button) => DIRECTION_BUTTONS.includes(button);

export const findFocusedGame = () => {
  const focused = getFocusedElement();
  if (!focused) return null;
  const state = getState();
  if (focused.classList.contains('gcard')) return findGame(state, focused.dataset.id);
  if (
    state.view === 'home' &&
    (focused === runCommand('getHomeRow') || focused.dataset.group === 'actions')
  ) {
    const currentItem = runCommand('getCurrentHomeItem');
    return currentItem && currentItem.kind === 'game' ? currentItem.game : null;
  }
  return null;
};

const handleBackButton = () => {
  const state = getState();
  if (SECONDARY_VIEWS.includes(state.view)) {
    playSound('back');
    runCommand('setView', 'home');
    return;
  }
  const homeRow = runCommand('getHomeRow');
  if (getFocusedElement() !== homeRow && state.games.length) {
    playSound('back');
    focusElement(homeRow, { silent: true });
  }
};

const handleShellButton = (button) => {
  const { view } = getState();
  const game = findFocusedGame();
  if (button === 'a') activateFocused();
  else if (button === 'b') handleBackButton();
  else if (button === 'y' && game) runCommand('openGameOptions', game);
  else if (button === 'x' && game) runCommand('toggleFavorite', game);
  else if ((button === 'lb' || button === 'rb') && view === 'home') {
    runCommand('cycleHomeFilter', button === 'rb' ? 1 : -1);
  } else if (button === 'start') runCommand('openSettings');
  else if (button === 'back') runCommand('openLibrarySearch');
  else if (button === 'guide' && view !== 'home') runCommand('setView', 'home');
};

const handleModalInput = (button) => {
  if (handleModalButton(button)) return;
  if (isDirection(button)) moveFocus(button);
  else if (button === 'a') activateFocused();
};

export const handleButton = (button, isRepeat) => {
  const state = getState();
  if (state.isBooting) return;
  if (state.isWelcomeVisible) {
    if (button === 'a' && !isRepeat) dismissWelcome();
    return;
  }
  if ((state.isGameRunning && !state.isOverlayOpen) || state.isLaunching) return;
  if (isModalOpen()) {
    handleModalInput(button);
    return;
  }
  if (isDirection(button)) {
    moveFocus(button);
    return;
  }
  if (isRepeat) return;
  if (state.view === 'settings') {
    if (runCommand('handleSettingsButton', button)) return;
    if (button === 'a') activateFocused();
    return;
  }
  if (button === 'lt' || button === 'rt') {
    cycleTab(button === 'rt' ? 1 : -1);
    return;
  }
  const viewHandler = VIEW_BUTTON_HANDLERS[state.view];
  if (viewHandler && runCommand(viewHandler, button)) return;
  handleShellButton(button);
};
