import { DATA_FILES } from '../constants/app.js';
import { resolveDataPath } from './app-paths.js';
import { readJsonFileOrDefault, writeJsonFile } from './json-file.js';

let currentStats = null;

const withoutNullFields = (record) =>
  Object.fromEntries(Object.entries(record).filter(([, value]) => value !== null));

export const loadStats = () => {
  const savedStats = readJsonFileOrDefault(resolveDataPath(DATA_FILES.stats), { games: {} });
  currentStats = { ...savedStats, games: savedStats.games ?? {} };
  return currentStats;
};

export const getStats = () => currentStats ?? loadStats();

export const findGameStats = (gameId) => getStats().games[gameId] ?? {};

export const updateGameStats = (gameId, patch) => {
  const stats = getStats();
  const gameStats = withoutNullFields({ ...(stats.games[gameId] ?? {}), ...patch });
  currentStats = { ...stats, games: { ...stats.games, [gameId]: gameStats } };
  writeJsonFile(resolveDataPath(DATA_FILES.stats), currentStats);
  return gameStats;
};
