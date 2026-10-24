import fs from 'node:fs/promises';
import path from 'node:path';
import { DATA_FILES } from '../constants/app.js';
import { MAX_ROM_SCAN_DEPTH, TITLE_LOCALE } from '../constants/library.js';
import { resolveDataPath } from '../core/app-paths.js';
import { getConfig, resolveConfigPath, toPortablePath } from '../core/config-store.js';
import { readJsonFileOrDefault, writeJsonFile } from '../core/json-file.js';
import { listPcLibraryEntries } from './pc-games.js';
import { readPlaylistReferences } from './playlist-references.js';
import {
  calculateGameId,
  findRegion,
  formatGameTitle,
  removeInvalidFilenameCharacters,
} from './rom-titles.js';
import { readFolderGame } from './sfo.js';

export const normalizeExtensions = (extensions) =>
  new Set(
    (extensions ?? []).map((extension) =>
      (extension.startsWith('.') ? extension : `.${extension}`).toLowerCase(),
    ),
  );

const listRomFiles = async ({ dir, extensions, gameFileNames, depth }) => {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (depth > 0) {
        files.push(
          ...(await listRomFiles({ dir: fullPath, extensions, gameFileNames, depth: depth - 1 })),
        );
      }
      continue;
    }
    const isRom =
      extensions.has(path.extname(entry.name).toLowerCase()) ||
      gameFileNames.has(entry.name.toLowerCase());
    if (isRom) files.push(fullPath);
  }
  return files;
};

const listReferencedFiles = async (files) => {
  const referencedFiles = new Set();
  for (const file of files) {
    for (const reference of await readPlaylistReferences(file)) {
      referencedFiles.add(reference.toLowerCase());
    }
  }
  return referencedFiles;
};

const buildRomEntry = async ({ system, file, gameFileNames }) => {
  const folderGame = gameFileNames.has(path.basename(file).toLowerCase())
    ? await readFolderGame(file)
    : null;
  const baseName = folderGame
    ? removeInvalidFilenameCharacters(folderGame.title)
    : path.basename(file, path.extname(file));
  const fileStats = await fs.stat(file).catch(() => null);
  const portablePath = toPortablePath(file);
  return {
    id: calculateGameId(`${system.id}|${portablePath.toLowerCase()}`),
    system: system.id,
    path: portablePath,
    file: folderGame ? folderGame.folder : path.basename(file),
    base: baseName,
    title: folderGame ? folderGame.title : formatGameTitle(baseName),
    region: findRegion(baseName),
    size: fileStats ? fileStats.size : 0,
    added: fileStats ? Math.round(fileStats.birthtimeMs || fileStats.mtimeMs) : 0,
  };
};

const listSystemGames = async (system) => {
  if (system.native) return listPcLibraryEntries();
  const extensions = normalizeExtensions(system.extensions);
  const gameFileNames = new Set((system.gameFiles ?? []).map((name) => name.toLowerCase()));
  const files = [];
  for (const romDir of system.romDirs ?? []) {
    files.push(
      ...(await listRomFiles({
        dir: resolveConfigPath(romDir),
        extensions,
        gameFileNames,
        depth: MAX_ROM_SCAN_DEPTH,
      })),
    );
  }
  const referencedFiles = await listReferencedFiles(files);
  const games = [];
  for (const file of files) {
    if (referencedFiles.has(file.toLowerCase())) continue;
    games.push(await buildRomEntry({ system, file, gameFileNames }));
  }
  return games;
};

const compareGameTitles = (firstGame, secondGame) =>
  firstGame.title.localeCompare(secondGame.title, TITLE_LOCALE, { sensitivity: 'base' });

export const scanLibrary = async (now = Date.now()) => {
  const games = [];
  for (const system of getConfig().systems) {
    if (system.enabled === false) continue;
    games.push(...(await listSystemGames(system)));
  }
  const sortedGames = [...games].sort(compareGameTitles);
  writeJsonFile(resolveDataPath(DATA_FILES.library), { scannedAt: now, games: sortedGames });
  return sortedGames;
};

export const loadCachedLibrary = () =>
  readJsonFileOrDefault(resolveDataPath(DATA_FILES.library), { games: [] }).games ?? [];
