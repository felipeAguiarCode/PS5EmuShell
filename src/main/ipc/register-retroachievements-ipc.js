import { ipcMain } from 'electron';
import {
  applyRaToAllEmulators,
  buildRaStatus,
  createRaLogin,
  deleteRaLogin,
  fetchRaImages,
  loadRaGame,
  loadRaOverview,
  updateRaAccount,
} from '../retroachievements/index.js';

const makeResultHandler =
  (runAction) =>
  async (...args) => {
    try {
      return { ok: true, ...(await runAction(...args)) };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  };

export const registerRetroAchievementsIpc = () => {
  ipcMain.handle('ra:status', () => buildRaStatus());
  ipcMain.handle(
    'ra:login',
    makeResultHandler((_event, username, password, apiKey, hardcore) =>
      createRaLogin({ username, password, apiKey, hardcore }),
    ),
  );
  ipcMain.handle(
    'ra:apply',
    makeResultHandler(() => ({ results: applyRaToAllEmulators() })),
  );
  ipcMain.handle(
    'ra:logout',
    makeResultHandler(() => ({ results: deleteRaLogin() })),
  );
  ipcMain.handle(
    'ra:update',
    makeResultHandler((_event, patch) => ({ results: updateRaAccount(patch) })),
  );
  ipcMain.handle(
    'ra:overview',
    makeResultHandler((_event, isForced) => loadRaOverview(isForced)),
  );
  ipcMain.handle(
    'ra:game',
    makeResultHandler((_event, gameId, isForced) => loadRaGame(gameId, isForced)),
  );
  ipcMain.handle('ra:images', (_event, relativePaths) => fetchRaImages(relativePaths));
};
