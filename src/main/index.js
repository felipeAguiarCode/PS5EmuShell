import path from 'node:path';
import { app } from 'electron';
import { DATA_DIR_NAME, DATA_FILES, ELECTRON_DATA_DIR } from './constants/app.js';
import {
  configureAppPaths,
  ensureDirectory,
  resolveDataPath,
  resolveRootDir,
} from './core/app-paths.js';
import { getConfig, loadConfig } from './core/config-store.js';
import { readJsonFileOrDefault, writeJsonFile } from './core/json-file.js';
import { loadStats } from './core/stats-store.js';
import { isGameRunning, killGame } from './emulators/runner.js';
import { startComboWatcher } from './input/combo-watcher.js';
import { createControllerHub } from './input/controller-hub.js';
import { registerAppIpc } from './ipc/register-app-ipc.js';
import { registerControllerIpc } from './ipc/register-controller-ipc.js';
import { registerFileIpc } from './ipc/register-file-ipc.js';
import { registerGameIpc } from './ipc/register-game-ipc.js';
import { registerLibraryIpc } from './ipc/register-library-ipc.js';
import { registerPcGamesIpc } from './ipc/register-pc-games-ipc.js';
import { registerProfileIpc } from './ipc/register-profile-ipc.js';
import { registerRetroAchievementsIpc } from './ipc/register-retroachievements-ipc.js';
import { registerSetupIpc } from './ipc/register-setup-ipc.js';
import { registerSystemIpc } from './ipc/register-system-ipc.js';
import { enqueueCoverDownloads } from './library/cover-downloads.js';
import { mapGamesWithArt } from './library/game-art.js';
import { recoverOpenSessions } from './library/playtime.js';
import { loadCachedLibrary, scanLibrary } from './library/scanner.js';
import { stopPerfMonitor } from './system/perf-monitor.js';
import { createGameOverlay } from './window/game-overlay.js';
import { makeGameShortcutToggle, unregisterAllShortcuts } from './window/keyboard-shortcuts.js';
import {
  createMainWindow,
  hideMainWindowForGame,
  isWindowAvailable,
  loadRendererPage,
  restoreMainWindow,
  sendToWindow,
} from './window/main-window.js';

const rootDir = resolveRootDir({ isPackaged: app.isPackaged, execPath: process.execPath });
configureAppPaths({
  rootDir,
  dataDir: process.env.EMU_DATA
    ? path.resolve(process.env.EMU_DATA)
    : path.join(rootDir, DATA_DIR_NAME),
});
app.setPath('userData', ensureDirectory(resolveDataPath(ELECTRON_DATA_DIR)));

const hasInstanceLock = app.requestSingleInstanceLock();
if (!hasInstanceLock) app.quit();

let mainWindow = null;
let library = [];

const getWindow = () => mainWindow;

const sendToRenderer = (channel, payload) => sendToWindow(mainWindow, channel, payload);

const restoreWindow = () => restoreMainWindow(mainWindow, getConfig().fullscreen);

const controllerHub = createControllerHub({
  loadSettings: () => readJsonFileOrDefault(resolveDataPath(DATA_FILES.controllers), {}),
  saveSettings: (settings) => writeJsonFile(resolveDataPath(DATA_FILES.controllers), settings),
});

const overlay = createGameOverlay({
  restoreWindow,
  hideWindow: () => hideMainWindowForGame(mainWindow, getConfig().hideOnLaunch),
  sendToRenderer,
  isGameRunning,
});

const setGameShortcutsEnabled = makeGameShortcutToggle({
  killGame,
  toggleOverlay: overlay.toggle,
  areShortcutsAllowed: () => getConfig().keyboardShortcuts !== false,
});

const buildCoverCallbacks = () => ({
  onUpdate: (gameId, art) => sendToRenderer('cover', { id: gameId, ...art }),
  onProgress: (progress) => sendToRenderer('covers:progress', progress),
});

const rescanLibrary = async () => {
  library = await scanLibrary();
  sendToRenderer('library', mapGamesWithArt(library));
  if (getConfig().coverDownload) enqueueCoverDownloads(library, buildCoverCallbacks());
  return library;
};

const ipcContext = {
  controllerHub,
  overlay,
  getWindow,
  getLibrary: () => library,
  rescanLibrary,
  sendToRenderer,
  restoreWindow,
  setGameShortcutsEnabled,
  buildCoverCallbacks,
  readFileIcon: (file, options) => app.getFileIcon(file, options),
};

const registerIpc = () => {
  registerAppIpc(ipcContext);
  registerProfileIpc(ipcContext);
  registerLibraryIpc(ipcContext);
  registerGameIpc(ipcContext);
  registerSetupIpc(ipcContext);
  registerControllerIpc(ipcContext);
  registerRetroAchievementsIpc(ipcContext);
  registerSystemIpc(ipcContext);
  registerFileIpc(ipcContext);
  registerPcGamesIpc(ipcContext);
};

const isWindowInteractive = () =>
  isWindowAvailable(mainWindow) && mainWindow.isVisible() && !mainWindow.isMinimized();

const startInput = () => {
  controllerHub.on('press', (button, isRepeat) => {
    if (isGameRunning() && !overlay.isOpen()) return;
    if (!isWindowInteractive()) return;
    sendToRenderer('input', { button, repeat: isRepeat });
  });
  controllerHub.on('connect', (summary) => sendToRenderer('pad', { ...summary, connected: true }));
  controllerHub.on('disconnect', (summary) =>
    sendToRenderer('pad', { ...summary, connected: false }),
  );
  controllerHub.on('change', () => sendToRenderer('pads:changed', controllerHub.listControllers()));
  controllerHub.on('active', (controllerType) => sendToRenderer('pads:active', controllerType));
  controllerHub.on('state', (state) => sendToRenderer('pads:state', state));
  startComboWatcher({
    listHeldButtonSets: controllerHub.listHeldButtonSets,
    readComboConfig: (comboKey) => getConfig()[comboKey],
    isGameRunning,
    actions: { killCombo: killGame, homeCombo: overlay.toggle },
  });
  controllerHub.start();
};

const buildDevSnapshotContext = () => {
  let simulatedDevices = [];
  return {
    pads: {
      get fake() {
        return simulatedDevices;
      },
      set fake(devices) {
        simulatedDevices = devices;
        controllerHub.setSimulatedDevices(devices);
      },
    },
  };
};

const openMainWindow = async () => {
  mainWindow = createMainWindow({
    isFullscreen: getConfig().fullscreen,
    onHidden: stopPerfMonitor,
  });
  if (process.env.EMU_SNAPSHOT) {
    const { startDevSnapshot } = await import('./dev/devsnap.js');
    startDevSnapshot(mainWindow, app, buildDevSnapshotContext());
  }
  loadRendererPage(mainWindow);
};

app.on('second-instance', restoreWindow);

app.whenReady().then(async () => {
  loadConfig();
  loadStats();
  recoverOpenSessions();
  library = loadCachedLibrary();
  registerIpc();
  startInput();
  await openMainWindow();
  rescanLibrary().catch((error) => console.error('Library rescan failed', error));
});

app.on('will-quit', () => {
  unregisterAllShortcuts();
  stopPerfMonitor();
});

app.on('window-all-closed', () => {
  controllerHub.stop();
  app.quit();
});
