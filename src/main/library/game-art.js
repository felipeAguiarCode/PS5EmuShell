import fs from 'node:fs';
import path from 'node:path';
import { COVER_IMAGE_EXTENSIONS } from '../constants/app.js';
import { COVER_KINDS } from '../constants/library.js';
import { ensureDirectory, resolveDataPath } from '../core/app-paths.js';
import { buildVersionedFileUrl } from '../core/file-url.js';

const MANUAL_DIR_BY_KIND = { cover: 'covers', snap: 'backgrounds' };
const CACHE_DIR_BY_KIND = { cover: 'covers', snap: 'snaps' };
const DEFAULT_BACKGROUND_EXTENSION = '.png';

export const resolveCachedArtFile = (kind, game) =>
  resolveDataPath('cache', CACHE_DIR_BY_KIND[kind], game.system, `${game.id}.png`);

export const findManualArtFile = (kind, game) => {
  const manualDir = resolveDataPath(MANUAL_DIR_BY_KIND[kind], game.system);
  const candidateNames = game.native ? [game.id, game.base] : [game.base];
  for (const name of candidateNames) {
    for (const extension of COVER_IMAGE_EXTENSIONS) {
      const file = path.join(manualDir, name + extension);
      if (fs.existsSync(file)) return file;
    }
  }
  return null;
};

const findArtFile = (kind, game) => {
  const manualFile = findManualArtFile(kind, game);
  if (manualFile) return manualFile;
  const cachedFile = resolveCachedArtFile(kind, game);
  return fs.existsSync(cachedFile) ? cachedFile : null;
};

export const buildGameArt = (game) =>
  Object.fromEntries(
    Object.keys(COVER_KINDS).map((kind) => {
      const file = findArtFile(kind, game);
      return [kind, file ? buildVersionedFileUrl(file) : null];
    }),
  );

export const mapGamesWithArt = (games) => games.map((game) => ({ ...game, ...buildGameArt(game) }));

export const saveGameBackground = (game, sourceFile) => {
  const backgroundDir = resolveDataPath(MANUAL_DIR_BY_KIND.snap, game.system);
  for (const extension of COVER_IMAGE_EXTENSIONS) {
    fs.rmSync(path.join(backgroundDir, game.id + extension), { force: true });
  }
  if (!sourceFile) return buildGameArt(game);
  ensureDirectory(backgroundDir);
  const extension = path.extname(sourceFile).toLowerCase();
  const targetExtension = COVER_IMAGE_EXTENSIONS.includes(extension)
    ? extension
    : DEFAULT_BACKGROUND_EXTENSION;
  fs.copyFileSync(sourceFile, path.join(backgroundDir, game.id + targetExtension));
  return buildGameArt(game);
};

export const saveGeneratedCover = (gameId, systemId, dataUrl) => {
  const coverFile = resolveDataPath('cache', CACHE_DIR_BY_KIND.cover, systemId, `${gameId}.png`);
  ensureDirectory(path.dirname(coverFile));
  const base64Data = String(dataUrl).split(',')[1] || '';
  fs.writeFileSync(coverFile, Buffer.from(base64Data, 'base64'));
};
