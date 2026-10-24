import { app, ipcMain } from 'electron';
import { getDataDir, getRootDir } from '../core/app-paths.js';
import {
  buildCurrentDefaultConfig,
  getBaseDir,
  getConfig,
  saveConfig,
} from '../core/config-store.js';
import { getStats, updateGameStats } from '../core/stats-store.js';
import { mapGamesWithArt } from '../library/game-art.js';
import { readBatteryStatus } from '../system/battery.js';
import { isWindowAvailable } from '../window/main-window.js';

export const registerAppIpc = (context) => {
  ipcMain.handle('app:init', () => {
    const defaultConfig = buildCurrentDefaultConfig();
    return {
      config: getConfig(),
      stats: getStats(),
      library: mapGamesWithArt(context.getLibrary()),
      xinput: {
        available: context.controllerHub.isAvailable(),
        error: context.controllerHub.getXInputError(),
        count: context.controllerHub.getConnectedCount(),
      },
      pads: context.controllerHub.listControllers(),
      paths: { root: getRootDir(), data: getDataDir(), base: getBaseDir() },
      defaultSystems: defaultConfig.systems,
      defaultOptimize: defaultConfig.optimize,
      version: app.getVersion(),
      debug: Boolean(process.env.EMU_SNAPSHOT),
    };
  });

  ipcMain.handle('config:get', () => getConfig());

  ipcMain.handle('config:save', (_event, nextConfig) => {
    const wasFullscreen = getConfig().fullscreen;
    saveConfig(nextConfig);
    const window = context.getWindow();
    if (isWindowAvailable(window) && nextConfig.fullscreen !== wasFullscreen) {
      window.setFullScreen(Boolean(nextConfig.fullscreen));
    }
    return true;
  });

  ipcMain.handle('stats:update', (_event, gameId, patch) => updateGameStats(gameId, patch));

  ipcMain.handle('battery:get', () => readBatteryStatus());

  ipcMain.handle('window:fullscreen', () => {
    const window = context.getWindow();
    if (!isWindowAvailable(window)) return false;
    window.setFullScreen(!window.isFullScreen());
    return window.isFullScreen();
  });

  ipcMain.handle('app:quit', () => app.quit());
};
