import { DEFAULT_BACKGROUND_COLOR } from '../../constants/systems.js';
import { BACKGROUND_SWAP_DELAY_MS } from '../../constants/ui.js';
import { forceReflow, queryAll } from '../../core/dom.js';
import { findSystem } from '../../core/selectors.js';
import { getState } from '../../core/store.js';

let backgroundTimer = null;
let activeLayerIndex = 0;
let backgroundKey = null;

export const BACKGROUND_STYLES = ['normal', 'blur', 'dark'];

export const resolveBackgroundStyle = (appearance = {}) =>
  BACKGROUND_STYLES.includes(appearance.backgroundStyle) ? appearance.backgroundStyle : 'normal';

export const buildBackgroundPlan = ({ game, system, appearance }) => {
  const url =
    game && appearance.heroBackground !== false
      ? game.snap || (appearance.coverArt !== false ? game.cover : null)
      : null;
  const kind = url ? 'image' : 'plain';
  const key = url || (system ? `sys:${system.color}` : 'none');
  const fallbackColor = system ? system.color : DEFAULT_BACKGROUND_COLOR;
  const image = url
    ? `url("${url}")`
    : `radial-gradient(ellipse at 75% 20%, ${fallbackColor}66 0%, transparent 60%), radial-gradient(ellipse at 10% 90%, #12204a 0%, transparent 55%)`;
  return { url, kind, key, image };
};

const swapLayers = (plan) => {
  if (backgroundKey !== plan.key) return;
  const layers = queryAll('.bg-layer');
  const currentLayer = layers[activeLayerIndex];
  activeLayerIndex = activeLayerIndex === 0 ? 1 : 0;
  const nextLayer = layers[activeLayerIndex];
  nextLayer.classList.remove('image', 'show');
  if (plan.kind !== 'plain') nextLayer.classList.add(plan.kind);
  nextLayer.style.backgroundImage = plan.image;
  forceReflow(nextLayer);
  nextLayer.classList.add('show');
  currentLayer.classList.remove('show');
};

const applyBackground = (game) => {
  const state = getState();
  const plan = buildBackgroundPlan({
    game,
    system: game ? findSystem(state, game.system) : null,
    appearance: state.config.appearance || {},
  });
  if (plan.key === backgroundKey) return;
  backgroundKey = plan.key;
  if (!plan.url) {
    swapLayers(plan);
    return;
  }
  const image = new Image();
  image.src = plan.url;
  image.decode().then(
    () => swapLayers(plan),
    () => swapLayers(plan),
  );
};

export const setBackground = (game) => {
  clearTimeout(backgroundTimer);
  backgroundTimer = setTimeout(() => applyBackground(game), BACKGROUND_SWAP_DELAY_MS);
};

export const resetBackgroundKey = () => {
  backgroundKey = null;
};
