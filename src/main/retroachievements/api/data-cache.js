import { RA_CACHE_DIR_PARTS, RA_CACHE_TTL_MS } from '../../constants/retroachievements.js';
import { resolveDataPath } from '../../core/app-paths.js';
import { readJsonFileOrDefault, writeJsonFile } from '../../core/json-file.js';

export const resolveRaCacheFile = (name) => resolveDataPath(...RA_CACHE_DIR_PARTS, `${name}.json`);

export const readRaCacheEntry = (name) => readJsonFileOrDefault(resolveRaCacheFile(name), null);

const isWithinTtl = (cacheEntry) => Date.now() - cacheEntry.at < RA_CACHE_TTL_MS;

export const loadCachedRaData = async ({ name, isForced, fetchData, isFresh = isWithinTtl }) => {
  const cacheEntry = readRaCacheEntry(name);
  if (!isForced && cacheEntry && isFresh(cacheEntry))
    return { ...cacheEntry.data, cachedAt: cacheEntry.at };
  try {
    const data = await fetchData();
    const fetchedAt = Date.now();
    writeJsonFile(resolveRaCacheFile(name), { at: fetchedAt, data });
    return { ...data, cachedAt: fetchedAt };
  } catch (error) {
    if (!cacheEntry) throw error;
    return { ...cacheEntry.data, cachedAt: cacheEntry.at, stale: true, error: error.message };
  }
};
