import fs from 'node:fs/promises';
import path from 'node:path';
import { ROM_DETECTION_DEPTH, ROM_DETECTION_MAX_ENTRIES } from '../constants/library.js';

const FILE_NAME_KEY_PREFIX = 'name:';
const NON_ALPHANUMERIC = /[^a-z0-9]+/g;

const normalizeExtension = (extension) =>
  (extension.startsWith('.') ? extension : `.${extension}`).toLowerCase();

export const countFolderFiles = async (dir) => {
  const counts = {};
  let visitedEntries = 0;
  const walk = async (currentDir, remainingDepth) => {
    if (visitedEntries > ROM_DETECTION_MAX_ENTRIES) return;
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      visitedEntries += 1;
      if (entry.isDirectory()) {
        if (remainingDepth > 0) await walk(path.join(currentDir, entry.name), remainingDepth - 1);
        continue;
      }
      const extension = path.extname(entry.name).toLowerCase();
      if (extension) counts[extension] = (counts[extension] || 0) + 1;
      const nameKey = FILE_NAME_KEY_PREFIX + entry.name.toLowerCase();
      counts[nameKey] = (counts[nameKey] || 0) + 1;
    }
  };
  await walk(dir, ROM_DETECTION_DEPTH);
  return counts;
};

export const calculateFolderNameHint = (system, folderText) => {
  let bestLength = 0;
  for (const term of [system.id, system.shortName, system.name]) {
    if (!term) continue;
    const termPattern = term.toLowerCase().replace(NON_ALPHANUMERIC, '[^a-z0-9]*');
    if (new RegExp(`(^|[^a-z0-9])${termPattern}($|[^a-z0-9])`).test(folderText)) {
      bestLength = Math.max(bestLength, term.length);
    }
  }
  return bestLength;
};

const compareDetectedSystems = (first, second) =>
  Number(second.files > 0) - Number(first.files > 0) ||
  second.hint - first.hint ||
  second.files - first.files;

export const rankSystemsForFolder = ({ systems, counts, folderPath, isFolderConfigured }) => {
  const normalizedFolder = path.resolve(folderPath).toLowerCase();
  const folderText = normalizedFolder.split(/[\\/]/).slice(-2).join(' ');
  return systems
    .filter((system) => !system.native)
    .map((system) => {
      const extensionMatches = (system.extensions ?? [])
        .map(normalizeExtension)
        .filter((extension) => counts[extension])
        .map((extension) => ({ ext: extension, n: counts[extension] }));
      const gameFileMatches = (system.gameFiles ?? [])
        .filter((fileName) => counts[FILE_NAME_KEY_PREFIX + fileName.toLowerCase()])
        .map((fileName) => ({
          ext: fileName,
          n: counts[FILE_NAME_KEY_PREFIX + fileName.toLowerCase()],
        }));
      const matches = [...extensionMatches, ...gameFileMatches];
      return {
        id: system.id,
        name: system.name,
        color: system.color,
        files: matches.reduce((total, match) => total + match.n, 0),
        hint: calculateFolderNameHint(system, folderText),
        exts: [...matches].sort((first, second) => second.n - first.n),
        already: isFolderConfigured(system, normalizedFolder),
      };
    })
    .sort(compareDetectedSystems);
};
