import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  AVATARS_DIR_PARTS,
  CUSTOM_AVATAR_BASENAME,
  CUSTOM_AVATAR_PREFIX,
  IMAGE_FILE_PATTERN,
} from '../constants/app.js';
import {
  ensureDirectory,
  getDataDir,
  resolveDataPath,
  resolveRootPath,
} from '../core/app-paths.js';
import { findVersionedFileUrl } from '../core/file-url.js';

const resolveAvatarsDir = () => resolveRootPath(...AVATARS_DIR_PARTS);

const listAvatarFileNames = (avatarsDir) => {
  if (!fs.existsSync(avatarsDir)) return [];
  return fs
    .readdirSync(avatarsDir)
    .filter((fileName) => IMAGE_FILE_PATTERN.test(fileName))
    .sort();
};

export const listAvatars = () => {
  const avatarsDir = resolveAvatarsDir();
  return {
    base: pathToFileURL(avatarsDir + path.sep).href,
    items: listAvatarFileNames(avatarsDir),
  };
};

export const findAvatarUrl = (avatar) => {
  if (!avatar) return null;
  const avatarFile = avatar.startsWith(CUSTOM_AVATAR_PREFIX)
    ? resolveDataPath(avatar.slice(CUSTOM_AVATAR_PREFIX.length))
    : path.join(resolveAvatarsDir(), avatar);
  return findVersionedFileUrl(avatarFile);
};

export const saveCustomAvatar = (sourceFile) => {
  const extension = path.extname(sourceFile).toLowerCase();
  const dataDir = ensureDirectory(getDataDir());
  for (const fileName of fs.readdirSync(dataDir)) {
    if (fileName.startsWith(`${CUSTOM_AVATAR_BASENAME}.`)) {
      fs.rmSync(resolveDataPath(fileName), { force: true });
    }
  }
  fs.copyFileSync(sourceFile, resolveDataPath(CUSTOM_AVATAR_BASENAME + extension));
  return `${CUSTOM_AVATAR_PREFIX}${CUSTOM_AVATAR_BASENAME}${extension}`;
};
