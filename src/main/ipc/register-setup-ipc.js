import { ipcMain } from 'electron';
import { MESSAGES } from '../constants/messages.js';
import { getBaseDir } from '../core/config-store.js';
import { listEmulatorStatus } from '../emulators/emulator-status.js';
import {
  addCatalogSystem,
  createFolderStructure,
  listCatalogStatus,
  listExpectedDirs,
} from '../emulators/folder-structure.js';
import { installEmulator } from '../emulators/install.js';
import { isGameRunning } from '../emulators/runner.js';
import { syncEmulators } from '../emulators/sync.js';
import { buildVersionReport } from '../emulators/versions.js';
import { applyRaToEmulator, loadRaAccount } from '../retroachievements/index.js';

const isRaConnected = () => Boolean(loadRaAccount()?.token);

const applyRaToEmulatorSafely = (emulatorId) => {
  try {
    return applyRaToEmulator(emulatorId);
  } catch (error) {
    console.error('Failed to apply RetroAchievements login', emulatorId, error);
    return undefined;
  }
};

export const registerSetupIpc = (context) => {
  ipcMain.handle('setup:status', () => ({
    dirs: listExpectedDirs(),
    emulators: listEmulatorStatus(),
    catalog: listCatalogStatus(),
    base: getBaseDir(),
  }));

  ipcMain.handle('setup:addSystem', (_event, systemId) => addCatalogSystem(systemId));

  ipcMain.handle('setup:versions', async (_event, isForced) => {
    try {
      return { ok: true, items: await buildVersionReport(isForced) };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('setup:sync', async () => {
    const reports = await syncEmulators();
    if (isRaConnected() && !isGameRunning()) {
      for (const report of reports.filter((candidate) => candidate.status === 'found')) {
        applyRaToEmulatorSafely(report.id);
      }
    }
    return reports;
  });

  ipcMain.handle('setup:createDirs', () => createFolderStructure());

  ipcMain.handle('setup:install', async (_event, systemId, emulatorId) => {
    if (isGameRunning()) return { ok: false, error: MESSAGES.closeGameBeforeInstall };
    try {
      const result = await installEmulator(systemId, emulatorId, (progress) =>
        context.sendToRenderer('setup:progress', { id: emulatorId, ...progress }),
      );
      if (result.ok && isRaConnected()) {
        const raResults = applyRaToEmulatorSafely(emulatorId);
        return raResults ? { ...result, ra: raResults } : result;
      }
      return result;
    } catch (error) {
      context.sendToRenderer('setup:progress', {
        id: emulatorId,
        phase: 'error',
        error: error.message,
      });
      return { ok: false, error: error.message };
    }
  });
};
