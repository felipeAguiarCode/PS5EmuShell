import fs from 'node:fs/promises';
import path from 'node:path';

const SFO_MAGIC = 0x46535000;
const SFO_HEADER_BYTES = 20;
const SFO_ENTRY_BYTES = 16;
const PS3_INSTALLED_DATA_DIR = /^usrdir$/i;
const PS3_DISC_GAME_DIR = /^ps3_game$/i;

export const parseSfoTitle = (buffer) => {
  if (buffer.length < SFO_HEADER_BYTES || buffer.readUInt32LE(0) !== SFO_MAGIC) return null;
  const keyTableOffset = buffer.readUInt32LE(8);
  const dataTableOffset = buffer.readUInt32LE(12);
  const entryCount = buffer.readUInt32LE(16);
  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = SFO_HEADER_BYTES + index * SFO_ENTRY_BYTES;
    if (entryOffset + SFO_ENTRY_BYTES > buffer.length) return null;
    const keyStart = keyTableOffset + buffer.readUInt16LE(entryOffset);
    const key = buffer.toString('latin1', keyStart, buffer.indexOf(0, keyStart));
    if (key !== 'TITLE') continue;
    const valueLength = buffer.readUInt32LE(entryOffset + 4);
    const valueStart = dataTableOffset + buffer.readUInt32LE(entryOffset + 12);
    const title = buffer
      .toString('utf8', valueStart, valueStart + valueLength)
      .replace(/\0+$/, '')
      .replace(/\s+/g, ' ')
      .trim();
    return title || null;
  }
  return null;
};

const readSfoTitle = async (file) => {
  try {
    return parseSfoTitle(await fs.readFile(file));
  } catch {
    return null;
  }
};

const findFirstSfoTitle = async (files) => {
  for (const file of files) {
    const title = await readSfoTitle(file);
    if (title) return title;
  }
  return null;
};

export const readFolderGame = async (bootFile) => {
  const bootDir = path.dirname(bootFile);
  const isInstalledLayout = PS3_INSTALLED_DATA_DIR.test(path.basename(bootDir));
  const gameDataDir = isInstalledLayout ? path.dirname(bootDir) : bootDir;
  const sfoCandidates = [path.join(bootDir, 'sce_sys', 'param.sfo')];
  if (isInstalledLayout) sfoCandidates.push(path.join(gameDataDir, 'PARAM.SFO'));
  const title = await findFirstSfoTitle(sfoCandidates);
  const gameDir = PS3_DISC_GAME_DIR.test(path.basename(gameDataDir))
    ? path.dirname(gameDataDir)
    : gameDataDir;
  return { title: title || path.basename(gameDir), folder: path.basename(gameDir) };
};
