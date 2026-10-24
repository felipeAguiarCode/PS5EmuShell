const WINDOWS_EMULATOR = { id: 'windows', name: 'Windows' };

export const buildGamesById = (games) => new Map(games.map((game) => [game.id, game]));

export const findSystem = (state, systemId) =>
  state.config.systems.find((system) => system.id === systemId);

export const findGame = (state, gameId) => state.gamesById.get(gameId);

export const findGameStats = (state, gameId) => state.stats.games[gameId] || {};

export const findEmulatorForGame = (state, game) => {
  const system = findSystem(state, game.system);
  if (!system) return {};
  if (game.native) return WINDOWS_EMULATOR;
  const overrideId = findGameStats(state, game.id).emulator;
  return (
    system.emulators.find((emulator) => emulator.id === overrideId) ||
    system.emulators.find((emulator) => emulator.id === system.defaultEmulator) ||
    system.emulators[0] ||
    {}
  );
};

export const isMotionEnabled = (config) =>
  !config?.appearance || config.appearance.motion !== false;

const PARTICLE_LEVELS = ['off', 'light', 'full'];

export const resolveParticleLevel = (config) => {
  const value = config?.particles;
  if (value === false) return 'off';
  return PARTICLE_LEVELS.includes(value) ? value : 'full';
};

export const isParticlesEnabled = (config) =>
  resolveParticleLevel(config) !== 'off' && config.appearance?.theme !== 'light';

export const listComboButtons = (combo) => combo?.buttons || [];

export const formatComboId = (combo) => listComboButtons(combo).join('+');
