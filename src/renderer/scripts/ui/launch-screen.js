import { LAUNCH_SCREEN_HIDE_MS } from '../constants/ui.js';
import { forceReflow, queryOne } from '../core/dom.js';
import { findEmulatorForGame, findSystem } from '../core/selectors.js';
import { getState } from '../core/store.js';

const FALLBACK_TILE_SIZE = 180;
const TARGET_SIZE_RATIO = 0.42;
const TARGET_TOP_RATIO = 0.36;
const FALLBACK_ART_COLOR = '#333';

const getLaunchLayer = () => queryOne('#launch-layer');

const buildFallbackRect = () => ({
  left: innerWidth / 2 - FALLBACK_TILE_SIZE / 2,
  top: innerHeight / 2 - FALLBACK_TILE_SIZE / 2,
  width: FALLBACK_TILE_SIZE,
  height: FALLBACK_TILE_SIZE,
});

export const startLaunchAnimation = (game, fromRect) => {
  const state = getState();
  const layer = getLaunchLayer();
  const art = queryOne('.launch-art', layer);
  const system = findSystem(state, game.system);
  layer.classList.remove('hidden', 'go', 'back');
  queryOne('.launch-title', layer).textContent = game.title;
  queryOne('.launch-sub', layer).textContent =
    `Iniciando no ${findEmulatorForGame(state, game).name || 'emulador'}…`;
  art.style.backgroundImage = game.cover
    ? `url("${game.cover}")`
    : `linear-gradient(145deg, ${system ? system.color : FALLBACK_ART_COLOR}, #000)`;
  const rect = fromRect || buildFallbackRect();
  art.style.transition = 'none';
  art.style.width = `${rect.width}px`;
  art.style.height = `${rect.height}px`;
  art.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
  forceReflow(art);
  art.style.transition = '';
  const size = Math.min(innerWidth, innerHeight) * TARGET_SIZE_RATIO;
  const scale = size / rect.width;
  art.style.transform = `translate(${innerWidth / 2 - size / 2}px, ${innerHeight * TARGET_TOP_RATIO - size / 2}px) scale(${scale})`;
  requestAnimationFrame(() => layer.classList.add('go'));
};

export const showLaunchCover = (title, subtitleHtml) => {
  const layer = getLaunchLayer();
  queryOne('.launch-art', layer).style.backgroundImage = 'none';
  queryOne('.launch-title', layer).textContent = title;
  queryOne('.launch-sub', layer).innerHTML = subtitleHtml;
  layer.classList.remove('hidden', 'back');
  requestAnimationFrame(() => layer.classList.add('go'));
};

export const setLaunchSubtitle = (html) => {
  queryOne('.launch-sub').innerHTML = html;
};

export const endLaunchScreen = () => {
  const layer = getLaunchLayer();
  if (layer.classList.contains('hidden')) return;
  layer.classList.add('back');
  setTimeout(() => layer.classList.add('hidden'), LAUNCH_SCREEN_HIDE_MS);
};
