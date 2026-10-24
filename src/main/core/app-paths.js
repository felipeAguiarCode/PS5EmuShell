import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORTABLE_MARKER_FILE, ROOT_SEARCH_DEPTH } from '../constants/app.js';

const SOURCE_ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
);

let appPaths = null;

const findPortableRootDir = (startDir) => {
  let currentDir = startDir;
  for (let depth = 0; depth < ROOT_SEARCH_DEPTH; depth += 1) {
    if (fs.existsSync(path.join(currentDir, PORTABLE_MARKER_FILE))) return currentDir;
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) return null;
    currentDir = parentDir;
  }
  return null;
};

export const resolveRootDir = ({ isPackaged, execPath }) => {
  if (!isPackaged) return SOURCE_ROOT_DIR;
  const executableDir = path.dirname(execPath);
  return findPortableRootDir(executableDir) ?? executableDir;
};

export const configureAppPaths = ({ rootDir, dataDir }) => {
  appPaths = { rootDir, dataDir };
  return appPaths;
};

export const getRootDir = () => appPaths.rootDir;

export const getDataDir = () => appPaths.dataDir;

export const resolveDataPath = (...parts) => path.join(appPaths.dataDir, ...parts);

export const resolveRootPath = (...parts) => path.join(appPaths.rootDir, ...parts);

export const ensureDirectory = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};
