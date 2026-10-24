import fs from 'node:fs/promises';
import path from 'node:path';

const REGEX_SPECIAL_CHARACTERS = /[.*+?^${}()|[\]\\]/g;

export const makeExactFileNamePattern = (fileName) =>
  new RegExp(`^${fileName.replace(REGEX_SPECIAL_CHARACTERS, '\\$&')}$`, 'i');

export const findFileByPattern = async (dir, pattern) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const matchingFile = entries.find((entry) => entry.isFile() && pattern.test(entry.name));
  if (matchingFile) return path.join(dir, matchingFile.name);
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const nestedFile = await findFileByPattern(path.join(dir, entry.name), pattern);
    if (nestedFile) return nestedFile;
  }
  return null;
};
