import { FOCUS_RING_GLIDE_MS, FOCUS_RING_PADDING_PX } from '../constants/ui.js';
import { getFocusedElement } from '../navigation/spatial-navigation.js';

const OWN_HIGHLIGHT_SELECTOR =
  '#row, .btn-play, .btn-round, .tab, .icon-btn, .chip, .key, .td-mode, .tr-back, .rng-reset';
const DEFAULT_RADIUS_PX = 8;

let ringElement = null;
let targetElement = null;
let lastPlacementKey = null;
let glideUntil = 0;
let isEnabled = true;

const findRingShape = (element) => {
  if (element.matches('.gcard')) return element.querySelector('.art') || element;
  if (element.matches('.ccard')) return element.querySelector('.mosaic') || element;
  return element;
};

const hideRing = () => {
  ringElement.classList.remove('show');
  lastPlacementKey = null;
};

const buildRingBox = (rect) => ({
  x: Math.round(rect.left - FOCUS_RING_PADDING_PX),
  y: Math.round(rect.top - FOCUS_RING_PADDING_PX),
  width: Math.round(rect.width + FOCUS_RING_PADDING_PX * 2),
  height: Math.round(rect.height + FOCUS_RING_PADDING_PX * 2),
});

const placeRing = (isInstant) => {
  const focused = getFocusedElement();
  if (!targetElement || !targetElement.isConnected || targetElement !== focused) {
    if (targetElement && targetElement !== focused) targetElement.classList.remove('glide');
    targetElement = null;
    hideRing();
    return;
  }
  const shape = findRingShape(targetElement);
  const rect = shape.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    hideRing();
    return;
  }
  const box = buildRingBox(rect);
  const radius =
    (parseFloat(getComputedStyle(shape).borderTopLeftRadius) || DEFAULT_RADIUS_PX) +
    FOCUS_RING_PADDING_PX;
  const placementKey = `${box.x},${box.y},${box.width},${box.height},${radius}`;
  if (placementKey === lastPlacementKey) return;
  lastPlacementKey = placementKey;
  ringElement.classList.toggle('gliding', !isInstant && performance.now() < glideUntil);
  ringElement.style.transform = `translate3d(${box.x}px, ${box.y}px, 0)`;
  ringElement.style.width = `${box.width}px`;
  ringElement.style.height = `${box.height}px`;
  ringElement.style.borderRadius = `${radius}px`;
  ringElement.classList.add('show');
};

const followElement = (element) => {
  if (targetElement && targetElement !== element) targetElement.classList.remove('glide');
  if (!isEnabled || !element || element.matches(OWN_HIGHLIGHT_SELECTOR)) {
    targetElement = null;
    hideRing();
    return;
  }
  targetElement = element;
  element.classList.add('glide');
  glideUntil = performance.now() + FOCUS_RING_GLIDE_MS;
  if (!ringElement.classList.contains('show')) {
    lastPlacementKey = null;
    placeRing(true);
  }
};

const updateRing = () => {
  if (isEnabled && targetElement) placeRing(false);
  requestAnimationFrame(updateRing);
};

export const initFocusRing = () => {
  ringElement = document.createElement('div');
  ringElement.id = 'focus-ring';
  document.body.appendChild(ringElement);
  document.addEventListener('navfocus', (event) => followElement(event.target));
  requestAnimationFrame(updateRing);
};

export const setFocusRingEnabled = (isRingEnabled) => {
  isEnabled = isRingEnabled;
  if (!isRingEnabled) hideRing();
  else if (getFocusedElement()) followElement(getFocusedElement());
};
