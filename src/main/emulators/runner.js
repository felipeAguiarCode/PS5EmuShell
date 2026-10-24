import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  PC_GAME_EMPTY_POLLS_TO_FINISH,
  PC_GAME_WATCH_MS,
  WINDOWS_EMULATOR,
} from '../constants/library.js';
import { MESSAGES } from '../constants/messages.js';
import { findSystemById, getBaseDir, resolveConfigPath } from '../core/config-store.js';
import { appendLauncherLog } from '../core/launcher-log.js';
import { listProcessesInFolder } from '../system/processes.js';
import { buildEmulatorArguments } from './command-line.js';

const ELEVATION_ERROR_PATTERN = /EACCES|740|elevation/i;

let currentSession = null;

export const pickEmulator = (system, emulatorOverride) =>
  system.emulators.find((emulator) => emulator.id === emulatorOverride) ??
  system.emulators.find((emulator) => emulator.id === system.defaultEmulator) ??
  system.emulators[0] ??
  null;

const formatExitLog = ({ label, code, durationMs, error }) =>
  `EXIT ${label} code=${code} ${Math.round(durationMs / 1000)}s${error ? ` error=${error}` : ''}`;

const resolveRealDirectory = (dir) => {
  try {
    return fs.realpathSync.native(dir);
  } catch {
    return dir;
  }
};

const listNewFolderProcessIds = (folder, initialProcessIds) =>
  listProcessesInFolder(folder)
    .map((processInfo) => processInfo.pid)
    .filter((processId) => !initialProcessIds.has(processId));

const spawnExecutable = (exePath, args, cwd) => {
  try {
    return spawn(exePath, args, { cwd, stdio: 'ignore', windowsHide: false });
  } catch {
    return null;
  }
};

const startPcGame = ({ game, onExit, openWithShell }) => {
  const exePath = resolveConfigPath(game.path);
  if (!exePath || !fs.existsSync(exePath))
    return { ok: false, error: MESSAGES.executableNotFound(exePath) };
  const gameDir = resolveRealDirectory(path.dirname(exePath));
  appendLauncherLog(`START PC: "${exePath}"`);
  const initialProcessIds = new Set(
    listProcessesInFolder(gameDir).map((processInfo) => processInfo.pid),
  );
  const startedAt = Date.now();
  let isFinished = false;
  let isChildAlive = true;
  let emptyPolls = 0;
  let watchTimer = null;

  const finish = (code, error) => {
    if (isFinished) return;
    isFinished = true;
    clearInterval(watchTimer);
    currentSession = null;
    const durationMs = Date.now() - startedAt;
    appendLauncherLog(formatExitLog({ label: `PC "${game.title}"`, code, durationMs, error }));
    onExit({ game, emulator: WINDOWS_EMULATOR.id, code, duration: durationMs, error });
  };

  const child = spawnExecutable(exePath, [], gameDir);
  currentSession = {
    child,
    emulator: WINDOWS_EMULATOR,
    isPcGame: true,
    gameDir,
    initialProcessIds,
    processIds: [],
  };

  if (child) {
    child.on('error', (error) => {
      if (ELEVATION_ERROR_PATTERN.test(`${error.code} ${error.message}`)) {
        appendLauncherLog(`PC elevated via shell: ${error.message}`);
        isChildAlive = false;
        openWithShell(exePath);
        return;
      }
      finish(-1, error.message);
    });
    child.on('exit', () => {
      isChildAlive = false;
    });
  } else {
    isChildAlive = false;
    openWithShell(exePath);
  }

  watchTimer = setInterval(() => {
    if (isChildAlive) return;
    const remainingProcessIds = listNewFolderProcessIds(gameDir, initialProcessIds);
    currentSession.processIds = remainingProcessIds;
    emptyPolls = remainingProcessIds.length ? 0 : emptyPolls + 1;
    if (emptyPolls >= PC_GAME_EMPTY_POLLS_TO_FINISH) finish(0, null);
  }, PC_GAME_WATCH_MS);

  return { ok: true, emulator: WINDOWS_EMULATOR.id, emulatorName: WINDOWS_EMULATOR.name };
};

const validateEmulatorLaunch = (game, emulatorOverride) => {
  const system = findSystemById(game.system);
  if (!system) return { error: MESSAGES.systemNotConfigured(game.system) };
  const emulator = pickEmulator(system, emulatorOverride);
  if (!emulator) return { error: MESSAGES.noEmulatorForSystem(system.name) };
  const exePath = resolveConfigPath(emulator.exe);
  if (!exePath || !fs.existsSync(exePath))
    return { error: MESSAGES.executableNotFound(emulator.exe) };
  const romPath = resolveConfigPath(game.path);
  if (!fs.existsSync(romPath)) return { error: MESSAGES.romNotFound(game.path) };
  return { emulator, exePath, romPath };
};

const startEmulatorGame = ({ game, emulatorOverride, onExit }) => {
  const launch = validateEmulatorLaunch(game, emulatorOverride);
  if (launch.error) return { ok: false, error: launch.error };
  const { emulator, exePath, romPath } = launch;
  const args = buildEmulatorArguments(emulator.args, {
    rom: romPath,
    romDir: path.dirname(romPath),
    romName: game.base,
    baseDir: getBaseDir(),
    exeDir: path.dirname(exePath),
  });
  appendLauncherLog(
    `START ${emulator.name}: "${exePath}" ${args.map((arg) => JSON.stringify(arg)).join(' ')}`,
  );

  let child;
  try {
    child = spawn(exePath, args, {
      cwd: path.dirname(exePath),
      stdio: 'ignore',
      windowsHide: false,
    });
  } catch (error) {
    return { ok: false, error: error.message };
  }
  const startedAt = Date.now();
  currentSession = { child, emulator, isPcGame: false };
  let isFinished = false;
  const finish = (code, error) => {
    if (isFinished) return;
    isFinished = true;
    currentSession = null;
    const durationMs = Date.now() - startedAt;
    appendLauncherLog(formatExitLog({ label: emulator.name, code, durationMs, error }));
    onExit({ game, emulator: emulator.id, code, duration: durationMs, error });
  };
  child.on('error', (error) => finish(-1, error.message));
  child.on('exit', (code) => finish(code, null));
  return { ok: true, emulator: emulator.id, emulatorName: emulator.name };
};

export const startGame = ({ game, emulatorOverride, onExit, openWithShell }) => {
  if (currentSession) return { ok: false, error: MESSAGES.gameAlreadyRunning };
  if (game.native) return startPcGame({ game, onExit, openWithShell });
  return startEmulatorGame({ game, emulatorOverride, onExit });
};

export const killGame = () => {
  if (!currentSession) return false;
  const processIds = new Set(currentSession.child?.pid ? [currentSession.child.pid] : []);
  if (currentSession.isPcGame) {
    for (const processId of listNewFolderProcessIds(
      currentSession.gameDir,
      currentSession.initialProcessIds,
    )) {
      processIds.add(processId);
    }
  }
  appendLauncherLog(`KILL ${currentSession.emulator.name} pids=${[...processIds].join(',')}`);
  for (const processId of processIds) {
    execFile('taskkill', ['/PID', String(processId), '/T', '/F'], () => {});
  }
  return true;
};

export const isGameRunning = () => Boolean(currentSession);

export const findRunningProcessId = () =>
  currentSession ? (currentSession.child?.pid ?? currentSession.processIds?.[0] ?? null) : null;
