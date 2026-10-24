import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const buildVersionedFileUrl = (file) => {
  try {
    const fileStats = fs.statSync(file);
    return `${pathToFileURL(file).href}?v=${Math.round(fileStats.mtimeMs)}`;
  } catch {
    return null;
  }
};

export const findVersionedFileUrl = (file) =>
  file && fs.existsSync(file) ? buildVersionedFileUrl(file) : null;
