import { ipcMain, shell } from 'electron';
import { HIDE_AFTER_LAUNCH_MS } from '../constants/app.js';
import { MESSAGES } from '../constants/messages.js';
import { getConfig } from '../core/config-store.js';
import { findGameStats, updateGameStats } from '../core/stats-store.js';
import { isGameRunning, killGame, startGame } from '../emulators/runner.js';
import { finishPlaySession, startPlaySession } from '../library/playtime.js';
import { stopPerfMonitor } from '../system/perf-monitor.js';
import { hideMainWindowForGame } from '../window/main-window.js';

const handleGameExit = (context, gameId) => (exitInfo) => {
  const stats = finishPlaySession(gameId, exitInfo.duration);
  context.overlay.reset();
  context.setGameShortcutsEnabled(false);
  context.restoreWindow();
  context.sendToRenderer('game:state', {
    running: false,
    id: gameId,
    code: exitInfo.code,
    duration: exitInfo.duration,
    error: exitInfo.error,
    stats,
  });
};

const launchGame = (context, gameId) => {
  const game = context.getLibrary().find((candidate) => candidate.id === gameId);
  if (!game) return { ok: false, error: MESSAGES.gameNotFound };
  const launchResult = startGame({
    game,
    emulatorOverride: findGameStats(gameId).emulator,
    onExit: handleGameExit(context, gameId),
    openWithShell: (file) => shell.openPath(file),
  });
  if (!launchResult.ok) return launchResult;
  stopPerfMonitor();
  context.setGameShortcutsEnabled(true);
  updateGameStats(gameId, {
    lastPlayed: Date.now(),
    playCount: (findGameStats(gameId).playCount || 0) + 1,
  });
  startPlaySession(gameId);
  const stats = findGameStats(gameId);
  context.sendToRenderer('game:state', { running: true, id: gameId, stats });
  setTimeout(() => {
    if (isGameRunning()) hideMainWindowForGame(context.getWindow(), getConfig().hideOnLaunch);
  }, HIDE_AFTER_LAUNCH_MS);
  return { ...launchResult, stats };
};

export const registerGameIpc = (context) => {
  ipcMain.handle('game:launch', (_event, gameId) => launchGame(context, gameId));
  ipcMain.handle('game:kill', () => killGame());
  ipcMain.handle('game:resume', () => context.overlay.resume());
  ipcMain.handle('game:overlay', () => context.overlay.show());
};
