import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import {
  FILE_BROWSER_EXE_PATTERN,
  FILE_BROWSER_HIDDEN_NAMES,
  FILE_BROWSER_IMAGE_PATTERN,
  TITLE_LOCALE,
} from '../constants/library.js';
import { MESSAGES } from '../constants/messages.js';
import { getBaseDir, resolveConfigPath } from '../core/config-store.js';
import { countFolderFiles, rankSystemsForFolder } from './system-detection.js';

const FIRST_DRIVE_CODE = 67;
const LAST_DRIVE_CODE = 90;
const STEAM_LIBRARY_PATH = /"path"\s+"([^"]+)"/g;
const ACCESS_DENIED_CODES = new Set(['EPERM', 'EACCES']);
const fileNameCollator = new Intl.Collator(TITLE_LOCALE, { numeric: true, sensitivity: 'base' });

const isDirectory = (candidatePath) => {
  try {
    return fs.statSync(candidatePath).isDirectory();
  } catch {
    return false;
  }
};

const listSteamLibraries = (steamRoot) => {
  try {
    const libraryFolders = fs.readFileSync(
      path.join(steamRoot, 'steamapps', 'libraryfolders.vdf'),
      'utf8',
    );
    return [...libraryFolders.matchAll(STEAM_LIBRARY_PATH)].map((match) =>
      path.join(match[1].replace(/\\\\/g, '\\'), 'steamapps', 'common'),
    );
  } catch {
    return [];
  }
};

const listDrives = () => {
  const drives = [];
  for (let code = FIRST_DRIVE_CODE; code <= LAST_DRIVE_CODE; code += 1) {
    const drive = `${String.fromCharCode(code)}:\\`;
    if (isDirectory(drive)) drives.push(drive);
  }
  return isDirectory('A:\\') ? ['A:\\', ...drives] : drives;
};

const buildGameLibraryPlaces = ({ programFiles, programFilesX86, drives }) => [
  ['Steam', path.join(programFilesX86, 'Steam', 'steamapps', 'common')],
  ['Steam', path.join(programFiles, 'Steam', 'steamapps', 'common')],
  ...[programFilesX86, programFiles].flatMap((root) =>
    listSteamLibraries(path.join(root, 'Steam')).map((library) => ['Steam', library]),
  ),
  ['Epic Games', path.join(programFiles, 'Epic Games')],
  ['GOG', path.join(programFilesX86, 'GOG Galaxy', 'Games')],
  ...drives.flatMap((drive) => [
    ['Steam', path.join(drive, 'SteamLibrary', 'steamapps', 'common')],
    ['Epic Games', path.join(drive, 'Epic Games')],
    ['GOG', path.join(drive, 'GOG Games')],
    ['Xbox', path.join(drive, 'XboxGames')],
    [MESSAGES.placeGames, path.join(drive, 'Games')],
    [MESSAGES.placeGames, path.join(drive, 'Jogos')],
  ]),
];

const readUserFolder = (readAppPath, key) => {
  try {
    return readAppPath(key);
  } catch {
    return null;
  }
};

export const listFilePlaces = ({ readAppPath, environment = process.env }) => {
  const places = [];
  const addPlace = (kind, label, placePath) => {
    const isDuplicate = places.some(
      (place) => place.path.toLowerCase() === placePath?.toLowerCase(),
    );
    if (placePath && isDirectory(placePath) && !isDuplicate)
      places.push({ kind, label, path: placePath });
  };
  for (const [label, key] of [
    [MESSAGES.placeDesktop, 'desktop'],
    [MESSAGES.placeDownloads, 'downloads'],
    [MESSAGES.placePictures, 'pictures'],
    [MESSAGES.placeDocuments, 'documents'],
  ]) {
    addPlace('user', label, readUserFolder(readAppPath, key));
  }
  addPlace('base', MESSAGES.placeBaseDir, getBaseDir());
  addPlace('base', MESSAGES.placeRoms, path.join(getBaseDir(), 'roms'));
  const drives = listDrives();
  const programFiles = environment.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = environment['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  for (const [label, libraryPath] of buildGameLibraryPlaces({
    programFiles,
    programFilesX86,
    drives,
  })) {
    addPlace('games', MESSAGES.placeGameLibrary(label, libraryPath.slice(0, 2)), libraryPath);
  }
  addPlace('system', MESSAGES.placeProgramFiles, programFiles);
  addPlace('system', MESSAGES.placeProgramFilesX86, programFilesX86);
  for (const drive of drives) addPlace('drive', MESSAGES.placeDrive(drive.slice(0, 2)), drive);
  return places;
};

const findParentDir = (dir) => {
  const parentDir = path.dirname(dir);
  return parentDir === dir ? null : parentDir;
};

const isListedFile = (fileName, mode) =>
  (mode === 'exe' && FILE_BROWSER_EXE_PATTERN.test(fileName)) ||
  (mode === 'image' && FILE_BROWSER_IMAGE_PATTERN.test(fileName));

const readFileSizeOrZero = (file) => {
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
};

const compareBrowserEntries = (first, second) => {
  if (first.type === second.type) return fileNameCollator.compare(first.name, second.name);
  return first.type === 'dir' ? -1 : 1;
};

export const listFolderEntries = async (dir, mode = 'exe') => {
  const fullPath = path.resolve(dir);
  let dirEntries;
  try {
    dirEntries = await fsPromises.readdir(fullPath, { withFileTypes: true });
  } catch (error) {
    return {
      dir: fullPath,
      parent: findParentDir(fullPath),
      error: ACCESS_DENIED_CODES.has(error.code)
        ? MESSAGES.folderPermissionDenied
        : MESSAGES.folderUnavailable,
      entries: [],
    };
  }
  const entries = [];
  for (const entry of dirEntries) {
    if (FILE_BROWSER_HIDDEN_NAMES.test(entry.name)) continue;
    const isFolder =
      entry.isDirectory() ||
      (entry.isSymbolicLink() && isDirectory(path.join(fullPath, entry.name)));
    if (isFolder) {
      entries.push({ name: entry.name, type: 'dir' });
      continue;
    }
    if (isListedFile(entry.name, mode)) {
      entries.push({
        name: entry.name,
        type: mode === 'image' ? 'img' : 'exe',
        size: readFileSizeOrZero(path.join(fullPath, entry.name)),
      });
    }
  }
  return {
    dir: fullPath,
    parent: findParentDir(fullPath),
    entries: entries.sort(compareBrowserEntries),
  };
};

const isFolderConfiguredForSystem = (system, normalizedFolder) =>
  (system.romDirs ?? []).some(
    (romDir) => resolveConfigPath(romDir).toLowerCase() === normalizedFolder,
  );

export const detectFolderSystems = async (dir, systems) =>
  rankSystemsForFolder({
    systems,
    counts: await countFolderFiles(dir),
    folderPath: dir,
    isFolderConfigured: isFolderConfiguredForSystem,
  });
