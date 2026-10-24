import { MIN_COUNTED_SESSION_MS, PLAYTIME_CHECKPOINT_MS } from '../constants/library.js';
import { findGameStats, getStats, updateGameStats } from '../core/stats-store.js';

let checkpointTimer = null;

export const calculateSessionStats = (previousStats, durationMs) => {
  const countedMs = durationMs >= MIN_COUNTED_SESSION_MS ? Math.round(durationMs) : 0;
  return {
    playTime: (previousStats.playTime || 0) + countedMs,
    lastSessionMs: countedMs || previousStats.lastSessionMs || null,
    session: null,
  };
};

export const calculateRecoveredDurationMs = (session) =>
  Math.max(0, (session.checkpoint || session.start) - session.start);

const saveSession = (gameId, durationMs) =>
  updateGameStats(gameId, calculateSessionStats(findGameStats(gameId), durationMs));

export const startPlaySession = (gameId) => {
  const now = Date.now();
  updateGameStats(gameId, { session: { start: now, checkpoint: now } });
  clearInterval(checkpointTimer);
  checkpointTimer = setInterval(() => {
    const { session } = findGameStats(gameId);
    if (session) updateGameStats(gameId, { session: { ...session, checkpoint: Date.now() } });
  }, PLAYTIME_CHECKPOINT_MS);
};

export const finishPlaySession = (gameId, durationMs) => {
  clearInterval(checkpointTimer);
  checkpointTimer = null;
  return saveSession(gameId, durationMs);
};

export const recoverOpenSessions = () =>
  Object.entries(getStats().games)
    .filter(([, gameStats]) => gameStats.session)
    .map(([gameId, gameStats]) => {
      const durationMs = calculateRecoveredDurationMs(gameStats.session);
      saveSession(gameId, durationMs);
      return { id: gameId, duration: durationMs };
    });
