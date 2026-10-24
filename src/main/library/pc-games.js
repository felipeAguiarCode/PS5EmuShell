import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { COVER_IMAGE_EXTENSIONS, DATA_FILES } from '../constants/app.js';
import {
  PC_GAME_BINARY_DIRS,
  PC_GAME_GENERIC_NAMES,
  PC_GAME_INFO_TIMEOUT_MS,
  PC_SYSTEM_ID,
} from '../constants/library.js';
import { MESSAGES } from '../constants/messages.js';
import { resolveDataPath } from '../core/app-paths.js';
import { resolveConfigPath, toPortablePath } from '../core/config-store.js';
import { readJsonFileOrDefault, writeJsonFile } from '../core/json-file.js';
import { saveExeIcon } from './exe-icon.js';
import { calculateGameId } from './rom-titles.js';

const ICON_EXTENSIONS = ['.png', '.ico'];
const MIN_SUGGESTED_TITLE_LENGTH = 2;
const PRODUCT_INFO_SCRIPT =
  '$v=(Get-Item -LiteralPath $env:PD_EXE).VersionInfo; [Console]::OutputEncoding=[Text.Encoding]::UTF8; @($v.ProductName,$v.FileDescription) -join "`n"';

const resolveIconDir = () => resolveDataPath('cache', 'icons');

export const listPcGames = () => {
  const pcGames = readJsonFileOrDefault(resolveDataPath(DATA_FILES.pcGames), []);
  return Array.isArray(pcGames) ? pcGames : [];
};

const savePcGames = (pcGames) => writeJsonFile(resolveDataPath(DATA_FILES.pcGames), pcGames);

const calculatePcGameId = (exePath) =>
  calculateGameId(`pc|${resolveConfigPath(exePath).toLowerCase()}`);

const readFileSizeOrZero = (file) => {
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
};

export const mapPcGameToLibraryEntry = (pcGame, { fullPath, sizeBytes }) => ({
  id: pcGame.id,
  system: PC_SYSTEM_ID,
  native: true,
  path: pcGame.exe,
  file: path.basename(fullPath),
  base: path.basename(fullPath, path.extname(fullPath)),
  title: pcGame.title,
  region: '',
  size: sizeBytes,
  added: pcGame.added || 0,
});

export const listPcLibraryEntries = () =>
  listPcGames().map((pcGame) => {
    const fullPath = resolveConfigPath(pcGame.exe);
    return mapPcGameToLibraryEntry(pcGame, { fullPath, sizeBytes: readFileSizeOrZero(fullPath) });
  });

export const buildFallbackTitle = (exePath) => {
  const folderName = path.basename(path.dirname(exePath));
  const baseName = path.basename(exePath, path.extname(exePath));
  return PC_GAME_BINARY_DIRS.test(folderName) ? baseName : folderName || baseName;
};

export const pickSuggestedTitle = (candidates) =>
  candidates.find(
    (candidate) =>
      candidate &&
      candidate.length > MIN_SUGGESTED_TITLE_LENGTH &&
      !PC_GAME_GENERIC_NAMES.test(candidate),
  ) ?? null;

const readProductNames = (exePath) =>
  new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', PRODUCT_INFO_SCRIPT],
      {
        env: { ...process.env, PD_EXE: exePath },
        timeout: PC_GAME_INFO_TIMEOUT_MS,
        windowsHide: true,
      },
      (error, output) =>
        resolve(
          error
            ? []
            : String(output)
                .split(/\r?\n/)
                .map((line) => line.trim()),
        ),
    );
  });

export const readPcGameInfo = async (exe) => {
  const exePath = resolveConfigPath(exe);
  const productNames = await readProductNames(exePath);
  return {
    exe: exePath,
    suggestedTitle: pickSuggestedTitle(productNames.slice(0, 2)) ?? buildFallbackTitle(exePath),
    exists: fs.existsSync(exePath),
  };
};

export const savePcGameIcon = async (gameId, exe, readFileIcon) => {
  try {
    return await saveExeIcon({
      exePath: resolveConfigPath(exe),
      iconDir: resolveIconDir(),
      iconId: gameId,
      readFileIcon,
    });
  } catch {
    return null;
  }
};

export const createPcGame = async (exe, title, readFileIcon, now = Date.now()) => {
  const exePath = resolveConfigPath(exe);
  if (!fs.existsSync(exePath)) return { ok: false, error: MESSAGES.pcExecutableNotFound };
  const pcGames = listPcGames();
  const gameId = calculatePcGameId(exePath);
  const existingGame = pcGames.find((pcGame) => pcGame.id === gameId);
  const nextGames = existingGame
    ? pcGames.map((pcGame) => (pcGame.id === gameId ? { ...pcGame, title } : pcGame))
    : [...pcGames, { id: gameId, title, exe: toPortablePath(exePath), added: now }];
  savePcGames(nextGames);
  const icon = await savePcGameIcon(gameId, exePath, readFileIcon);
  return { ok: true, id: gameId, existed: Boolean(existingGame), icon };
};

export const updatePcGame = (gameId, patch) => {
  const pcGames = listPcGames();
  const pcGame = pcGames.find((candidate) => candidate.id === gameId);
  if (!pcGame) return null;
  const updatedGame = {
    ...pcGame,
    ...(patch.title ? { title: patch.title } : {}),
    ...(patch.exe ? { exe: toPortablePath(resolveConfigPath(patch.exe)) } : {}),
  };
  savePcGames(pcGames.map((candidate) => (candidate.id === gameId ? updatedGame : candidate)));
  return updatedGame;
};

export const deletePcGame = (gameId) => {
  savePcGames(listPcGames().filter((pcGame) => pcGame.id !== gameId));
  const generatedFiles = [
    ...ICON_EXTENSIONS.map((extension) => path.join(resolveIconDir(), gameId + extension)),
    resolveDataPath('cache', 'covers', PC_SYSTEM_ID, `${gameId}.png`),
    ...COVER_IMAGE_EXTENSIONS.map((extension) =>
      resolveDataPath('backgrounds', PC_SYSTEM_ID, gameId + extension),
    ),
  ];
  for (const file of generatedFiles) fs.rmSync(file, { force: true });
};

export const findPcGameIconFile = (gameId) =>
  ICON_EXTENSIONS.map((extension) => path.join(resolveIconDir(), gameId + extension)).find((file) =>
    fs.existsSync(file),
  ) ?? null;
