import { ipcMain } from 'electron';
import { getConfig } from '../core/config-store.js';
import { findRunningProcessId } from '../emulators/runner.js';
import { previewOptimization, runOptimization } from '../system/optimize.js';
import { startPerfMonitor, stopPerfMonitor } from '../system/perf-monitor.js';

const listProtectedProcessIds = () => [findRunningProcessId()].filter(Boolean);

export const registerSystemIpc = (context) => {
  ipcMain.handle('perf:start', () => startPerfMonitor(context.sendToRenderer));
  ipcMain.handle('perf:stop', () => stopPerfMonitor());
  ipcMain.handle('optimize:preview', () =>
    previewOptimization(getConfig().optimize.killList, listProtectedProcessIds()),
  );
  ipcMain.handle('optimize:run', (_event, processNames, shouldTrim) =>
    runOptimization(processNames, { trim: shouldTrim, protectPids: listProtectedProcessIds() }),
  );
};
