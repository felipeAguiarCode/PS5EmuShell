import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import {
  COVER_DOWNLOAD_CONCURRENCY,
  COVER_INDEX_TTL_MS,
  COVER_KINDS,
  COVER_MISS_TTL_MS,
  KEPT_CACHE_DIRS,
  PC_SYSTEM_ID,
} from '../constants/library.js';
import { MESSAGES } from '../constants/messages.js';
import { HTTP_HEADERS, THUMBNAILS_SERVER_URL } from '../constants/network.js';
import { ensureDirectory, resolveDataPath } from '../core/app-paths.js';
import { findSystemById } from '../core/config-store.js';
import { readJsonFileOrDefault, writeJsonFile } from '../core/json-file.js';
import { buildCoverIndex, findCoverName } from './cover-matching.js';
import { buildGameArt, findManualArtFile, resolveCachedArtFile } from './game-art.js';

const PNG_LINK_PATTERN = /href="([^"]+)\.png"/g;
const coverIndexes = new Map();
const pendingIndexes = new Map();
const downloadQueue = [];
const queuedGameIds = new Set();
let coverMisses = null;
let isDownloading = false;
let totalCount = 0;
let doneCount = 0;

export const normalizeThumbnailFolder = (repository) =>
  (repository.includes('_-_') ? repository.replace(/_/g, ' ') : repository).trim();

export const buildThumbnailUrl = (repository, kindDir, name = '') =>
  `${THUMBNAILS_SERVER_URL}${encodeURIComponent(normalizeThumbnailFolder(repository))}/${kindDir}/${
    name ? `${encodeURIComponent(name)}.png` : ''
  }`;

const resolveMissesFile = () => resolveDataPath('cache', 'misses.json');

const loadCoverMisses = () => {
  coverMisses ??= readJsonFileOrDefault(resolveMissesFile(), {});
  return coverMisses;
};

const fetchThumbnailNames = async (repository, kindDir) => {
  const response = await fetch(buildThumbnailUrl(repository, kindDir), { headers: HTTP_HEADERS });
  if (!response.ok) throw new Error(MESSAGES.coverServerResponded(response.status));
  const html = await response.text();
  return [...html.matchAll(PNG_LINK_PATTERN)].map((match) => decodeURIComponent(match[1]));
};

const fetchRawIndex = async (repository, now) => {
  const rawIndex = { at: now };
  for (const [kind, kindDir] of Object.entries(COVER_KINDS)) {
    rawIndex[kind] = await fetchThumbnailNames(repository, kindDir);
  }
  return rawIndex;
};

const loadCoverIndex = async (repository) => {
  const indexFile = resolveDataPath(
    'cache',
    'index',
    `${normalizeThumbnailFolder(repository)}.json`,
  );
  const cachedIndex = readJsonFileOrDefault(indexFile, null);
  const now = Date.now();
  if (cachedIndex && now - cachedIndex.at < COVER_INDEX_TTL_MS) return buildCoverIndex(cachedIndex);
  try {
    const rawIndex = await fetchRawIndex(repository, now);
    writeJsonFile(indexFile, rawIndex);
    return buildCoverIndex(rawIndex);
  } catch (error) {
    if (cachedIndex) return buildCoverIndex(cachedIndex);
    throw error;
  }
};

const findCoverIndex = async (repository) => {
  if (coverIndexes.has(repository)) return coverIndexes.get(repository);
  if (pendingIndexes.has(repository)) return pendingIndexes.get(repository);
  const pendingIndex = loadCoverIndex(repository).then((index) => {
    coverIndexes.set(repository, index);
    return index;
  });
  pendingIndexes.set(repository, pendingIndex);
  try {
    return await pendingIndex;
  } finally {
    pendingIndexes.delete(repository);
  }
};

const downloadThumbnail = async ({ repository, kindDir, name, targetFile }) => {
  const response = await fetch(buildThumbnailUrl(repository, kindDir, name), {
    headers: HTTP_HEADERS,
  });
  if (!response.ok) return false;
  const imageBuffer = Buffer.from(await response.arrayBuffer());
  ensureDirectory(path.dirname(targetFile));
  await fsPromises.writeFile(targetFile, imageBuffer);
  return true;
};

const shouldSkipKind = ({ kind, game, isForced, misses, now }) => {
  if (findManualArtFile(kind, game)) return true;
  if (isForced) return false;
  if (fs.existsSync(resolveCachedArtFile(kind, game))) return true;
  const missedAt = misses[`${game.id}:${kind}`];
  return Boolean(missedAt) && now - missedAt < COVER_MISS_TTL_MS;
};

const downloadGameArt = async (game, isForced) => {
  const system = findSystemById(game.system);
  if (!system || !system.thumbnailsRepo) return false;
  const misses = loadCoverMisses();
  let hasDownloaded = false;
  for (const [kind, kindDir] of Object.entries(COVER_KINDS)) {
    const now = Date.now();
    if (shouldSkipKind({ kind, game, isForced, misses, now })) continue;
    const missKey = `${game.id}:${kind}`;
    const coverIndex = await findCoverIndex(system.thumbnailsRepo);
    const name = findCoverName(coverIndex[kind], game);
    const isDownloaded = name
      ? await downloadThumbnail({
          repository: system.thumbnailsRepo,
          kindDir,
          name,
          targetFile: resolveCachedArtFile(kind, game),
        })
      : false;
    if (isDownloaded) {
      delete misses[missKey];
      hasDownloaded = true;
    } else {
      misses[missKey] = now;
    }
  }
  writeJsonFile(resolveMissesFile(), misses);
  return hasDownloaded;
};

const runDownloadQueue = async ({ onUpdate, onProgress }) => {
  isDownloading = true;
  const processQueue = async () => {
    while (downloadQueue.length) {
      const { game, isForced } = downloadQueue.shift();
      try {
        if (await downloadGameArt(game, isForced)) onUpdate?.(game.id, buildGameArt(game));
      } catch (error) {
        onProgress?.({ done: doneCount, total: totalCount, error: error.message });
      }
      queuedGameIds.delete(game.id);
      doneCount += 1;
      onProgress?.({ done: doneCount, total: totalCount });
    }
  };
  await Promise.all(Array.from({ length: COVER_DOWNLOAD_CONCURRENCY }, processQueue));
  isDownloading = false;
  totalCount = 0;
  doneCount = 0;
};

export const enqueueCoverDownloads = (games, { isForced = false, onUpdate, onProgress } = {}) => {
  for (const game of games) {
    if (queuedGameIds.has(game.id)) continue;
    queuedGameIds.add(game.id);
    downloadQueue.push({ game, isForced });
    totalCount += 1;
  }
  if (!isDownloading) runDownloadQueue({ onUpdate, onProgress });
};

export const clearCoverCache = async () => {
  const cacheDir = resolveDataPath('cache');
  for (const name of await fsPromises.readdir(cacheDir).catch(() => [])) {
    if (KEPT_CACHE_DIRS.includes(name)) continue;
    if (name === 'covers') {
      for (const systemDir of await fsPromises.readdir(path.join(cacheDir, name)).catch(() => [])) {
        if (systemDir === PC_SYSTEM_ID) continue;
        await fsPromises.rm(path.join(cacheDir, name, systemDir), { recursive: true, force: true });
      }
      continue;
    }
    await fsPromises.rm(path.join(cacheDir, name), { recursive: true, force: true });
  }
  coverIndexes.clear();
  coverMisses = {};
};
