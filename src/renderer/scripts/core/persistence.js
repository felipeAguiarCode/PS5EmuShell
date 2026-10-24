import { invokeMain } from './api.js';
import { getState, updateState } from './store.js';

export const saveConfig = async (nextConfig = getState().config) => {
  updateState({ config: nextConfig });
  await invokeMain('config:save', nextConfig);
  return nextConfig;
};

export const saveGameStats = async (gameId, patch) => {
  const gameStats = await invokeMain('stats:update', gameId, patch);
  const { stats } = getState();
  updateState({ stats: { ...stats, games: { ...stats.games, [gameId]: gameStats } } });
  return gameStats;
};

export const storeGameStats = (gameId, gameStats) => {
  const { stats } = getState();
  updateState({ stats: { ...stats, games: { ...stats.games, [gameId]: gameStats } } });
};
