const INITIAL_STATE = {
  config: null,
  stats: { games: {} },
  games: [],
  gamesById: new Map(),
  collections: [],
  view: 'home',
  isGameRunning: false,
  runningGameId: null,
  isLaunching: false,
  isBooting: true,
  isWelcomeVisible: false,
  isOverlayOpen: false,
  xinput: { available: false, count: 0 },
  pads: null,
  padType: null,
  paths: {},
  version: '',
  defaultSystems: [],
  defaultOptimize: null,
  coverProgress: null,
  avatarUrl: null,
};

const listeners = new Set();
let state = INITIAL_STATE;

export const getState = () => state;

export const updateState = (patch) => {
  state = { ...state, ...patch };
  for (const listener of listeners) listener(state);
  return state;
};

export const subscribeToState = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
