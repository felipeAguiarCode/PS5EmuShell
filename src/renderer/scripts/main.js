import { invokeMain } from './core/api.js';
import { registerCommands, runCommand } from './core/commands.js';
import { escapeHtml } from './core/dom.js';
import { buildGamesById } from './core/selectors.js';
import { getState, updateState } from './core/store.js';
import { handleButton } from './input/button-router.js';
import { startGamepadFallback } from './input/gamepad-fallback.js';
import { bindKeyboardInput } from './input/keyboard-input.js';
import { bindMainEvents } from './input/main-events.js';
import { bindMouseInput } from './input/mouse-input.js';
import { initFocusRing } from './ui/focus-ring.js';
import { installImageListeners } from './ui/images.js';
import { initParticles } from './ui/particles.js';
import { initCollectionsView } from './views/collections/collections-view.js';
import { initPadTest } from './views/controllers/pad-test.js';
import { initFileBrowser } from './views/file-browser/file-browser.js';
import { openGameInfo } from './views/game/game-info.js';
import { openGameOptions, toggleFavorite } from './views/game/game-options.js';
import { launchGame } from './views/game/game-session.js';
import { initHomeView } from './views/home/home-view.js';
import { initLibraryView } from './views/library/library-view.js';
import { initSettingsView } from './views/settings/settings-view.js';
import { applyAppearance, applyProfile, setPadType } from './views/shell/appearance.js';
import { setBackground } from './views/shell/background.js';
import { dismissWelcome, runBootSequence } from './views/shell/boot.js';
import { rescanLibrary, setGames } from './views/shell/library-data.js';
import { openPowerMenu, quitApp } from './views/shell/power-menu.js';
import { setView, updateHints } from './views/shell/view-switcher.js';
import { bindTopbar, initTopbar, startTopbarTimers } from './views/topbar/topbar.js';
import { initTrophiesView } from './views/trophies/trophies-view.js';

const registerShellCommands = () =>
  registerCommands({
    setView,
    updateHints,
    rescanLibrary,
    setGames,
    setBackground,
    applyProfile,
    applyAppearance,
    setPadType,
    quitApp,
    launchGame,
    toggleFavorite,
    openGameOptions,
    openGameInfo,
    openPowerMenu,
  });

const findInitialPadType = (pads) => {
  const firstPad = [...pads.slots, ...pads.unassigned].find(
    (pad) => pad.connected !== false && pad.type,
  );
  return firstPad ? firstPad.type : null;
};

const storeInitialData = (data) => {
  const games = data.library || [];
  updateState({
    config: data.config,
    stats: data.stats || { games: {} },
    xinput: data.xinput,
    pads: data.pads,
    padType: findInitialPadType(data.pads),
    paths: data.paths,
    version: data.version,
    defaultSystems: data.defaultSystems,
    defaultOptimize: data.defaultOptimize,
    games,
    gamesById: buildGamesById(games),
  });
};

const exposeDebugHooks = () => {
  window.shellDebug = { store: { getState }, commands: { run: runCommand } };
};

const startApp = async () => {
  installImageListeners();
  initParticles();
  registerShellCommands();
  initPadTest();
  initFileBrowser();
  const data = await invokeMain('app:init');
  storeInitialData(data);
  if (data.debug) exposeDebugHooks();
  initTopbar();
  applyProfile();
  initFocusRing();
  applyAppearance();
  initHomeView();
  initLibraryView();
  await initCollectionsView();
  initTrophiesView();
  initSettingsView();
  bindTopbar({ onDismissWelcome: dismissWelcome });
  bindMainEvents(handleButton);
  bindMouseInput();
  bindKeyboardInput(handleButton);
  if (!getState().xinput.available) startGamepadFallback(handleButton);
  startTopbarTimers();
  runCommand('refreshHome');
  runCommand('refreshLibrary');
  setView('home', true);
  runBootSequence();
};

startApp().catch((error) => {
  document.body.innerHTML = `<pre style="color:#f88;padding:40px;white-space:pre-wrap">Erro ao iniciar: ${escapeHtml(error.stack || error.message)}</pre>`;
});
