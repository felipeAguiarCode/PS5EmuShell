import fs from 'node:fs';
import path from 'node:path';
import { DATA_FILES } from '../constants/app.js';
import { ensureDirectory, resolveDataPath } from '../core/app-paths.js';
import { resolveConfigPath } from '../core/config-store.js';
import { findVersionedFileUrl } from '../core/file-url.js';
import { readJsonFileOrDefault, writeJsonFile } from '../core/json-file.js';

const COLLECTION_COVER_EXTENSION = /^\.(png|jpe?g|webp)$/;
const DEFAULT_COVER_EXTENSION = '.png';

const resolveCollectionsDir = () => resolveDataPath('collections');

const findCollectionCoverUrl = (coverFileName) =>
  coverFileName ? findVersionedFileUrl(path.join(resolveCollectionsDir(), coverFileName)) : null;

export const listCollections = () =>
  readJsonFileOrDefault(resolveDataPath(DATA_FILES.collections), []).map((collection) => ({
    ...collection,
    coverUrl: findCollectionCoverUrl(collection.cover),
  }));

const withoutRuntimeFields = (collection) =>
  Object.fromEntries(Object.entries(collection).filter(([key]) => key !== 'coverUrl'));

export const saveCollections = (collections) => {
  writeJsonFile(resolveDataPath(DATA_FILES.collections), collections.map(withoutRuntimeFields));
  return true;
};

export const saveCollectionCover = (collectionId, sourceFile) => {
  const collectionsDir = ensureDirectory(resolveCollectionsDir());
  for (const fileName of fs.readdirSync(collectionsDir)) {
    if (path.parse(fileName).name === collectionId) {
      fs.rmSync(path.join(collectionsDir, fileName), { force: true });
    }
  }
  if (!sourceFile) return { cover: null, coverUrl: null };
  const sourcePath = resolveConfigPath(sourceFile);
  const extension =
    path.extname(sourcePath).toLowerCase().match(COLLECTION_COVER_EXTENSION)?.[0] ??
    DEFAULT_COVER_EXTENSION;
  const coverFileName = collectionId + extension;
  fs.copyFileSync(sourcePath, path.join(collectionsDir, coverFileName));
  return { cover: coverFileName, coverUrl: findCollectionCoverUrl(coverFileName) };
};
