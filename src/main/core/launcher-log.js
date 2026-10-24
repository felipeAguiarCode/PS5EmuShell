import fs from 'node:fs';
import { DATA_FILES } from '../constants/app.js';
import { ensureDirectory, getDataDir, resolveDataPath } from './app-paths.js';

export const appendLauncherLog = (line, now = new Date()) => {
  try {
    ensureDirectory(getDataDir());
    fs.appendFileSync(resolveDataPath(DATA_FILES.launcherLog), `[${now.toISOString()}] ${line}\n`);
  } catch (error) {
    console.error('Failed to write launcher log', error);
  }
};
