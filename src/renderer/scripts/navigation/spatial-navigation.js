import { queryAll, queryOne } from '../core/dom.js';
import { isMotionEnabled } from '../core/selectors.js';
import { getState } from '../core/store.js';
import { playSound } from '../ui/sound.js';

const TOP_GROUP = 'top';
const OVERLAP_TOLERANCE = 0.3;
const ORTHOGONAL_WEIGHT = 3;
const ALIGNMENT_WEIGHT = 0.05;
const OTHER_GROUP_PENALTY = 400;

let scope = null;
let focusedElement = null;
let lastFocus = null;
const memoryByGroup = {};

const findCenter = (rect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

export const isElementVisible = (element) => {
  if (!element.isConnected || element.disabled) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && element.offsetParent !== null;
};

export const isTopBarElement = (element) => Boolean(element) && element.dataset.group === TOP_GROUP;

export const getNavScope = () => scope ?? document.body;

export const listFocusCandidates = () =>
  queryAll('.focusable', getNavScope()).filter((element) => isElementVisible(element));

export const replaceNavScope = (element) => {
  scope = element;
};

export const getFocusedElement = () => focusedElement;

export const getNavMemory = (group) => memoryByGroup[group];

export const rememberNavElement = (group, element) => {
  memoryByGroup[group] = element;
};

export const getLastFocus = () => lastFocus;

export const restoreLastFocus = (savedFocus) => {
  lastFocus = savedFocus;
};

export const focusElement = (element, options = {}) => {
  if (!element) return;
  const previousElement = focusedElement;
  if (previousElement === element) return;
  if (previousElement) {
    previousElement.classList.remove('focused');
    previousElement.dispatchEvent(new CustomEvent('navblur', { bubbles: true }));
  }
  focusedElement = element;
  element.classList.add('focused');
  if (element.dataset.group) memoryByGroup[element.dataset.group] = element;
  const rect = element.getBoundingClientRect();
  lastFocus = {
    group: element.dataset.group,
    id: element.dataset.id,
    top: isTopBarElement(element),
    rect: findCenter(rect),
  };
  const isSmooth = !options.instant && isMotionEnabled(getState().config);
  if (!options.noScroll) {
    element.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: isSmooth ? 'smooth' : 'auto',
    });
  }
  element.dispatchEvent(new CustomEvent('navfocus', { detail: options, bubbles: true }));
  if (!options.silent) playSound('move');
};

export const setNavScope = (element, target) => {
  scope = element;
  const candidates = listFocusCandidates();
  const nextElement =
    target || candidates.find((candidate) => !isTopBarElement(candidate)) || candidates[0];
  if (nextElement) focusElement(nextElement, { silent: true, instant: true });
};

const isRememberedElementUsable = (element) =>
  element && element.isConnected && isElementVisible(element) && getNavScope().contains(element);

export const recoverFocus = () => {
  const savedFocus = lastFocus || {};
  const candidates = listFocusCandidates().filter(
    (candidate) => savedFocus.top || !isTopBarElement(candidate),
  );
  if (!candidates.length) return listFocusCandidates()[0] || null;
  const remembered = savedFocus.group && memoryByGroup[savedFocus.group];
  if (
    isRememberedElementUsable(remembered) &&
    (!savedFocus.id || remembered.dataset.id === savedFocus.id)
  ) {
    return remembered;
  }
  if (savedFocus.id) {
    const sameItem = candidates.find(
      (candidate) =>
        candidate.dataset.id === savedFocus.id && candidate.dataset.group === savedFocus.group,
    );
    if (sameItem) return sameItem;
  }
  if (!savedFocus.rect) return candidates[0];
  const calculateDistance = (candidate) => {
    const center = findCenter(candidate.getBoundingClientRect());
    const groupPenalty = candidate.dataset.group === savedFocus.group ? 0 : OTHER_GROUP_PENALTY;
    return Math.hypot(center.x - savedFocus.rect.x, center.y - savedFocus.rect.y) + groupPenalty;
  };
  return candidates.reduce((closest, candidate) =>
    calculateDistance(candidate) < calculateDistance(closest) ? candidate : closest,
  );
};

const calculatePrimaryDistance = (direction, from, to) => {
  if (direction === 'right') return to.left - from.right;
  if (direction === 'left') return from.left - to.right;
  if (direction === 'down') return to.top - from.bottom;
  return from.top - to.bottom;
};

const calculateOrthogonalGap = (isHorizontal, from, to) => {
  if (isHorizontal) {
    if (to.bottom < from.top) return from.top - to.bottom;
    return to.top > from.bottom ? to.top - from.bottom : 0;
  }
  if (to.right < from.left) return from.left - to.right;
  return to.left > from.right ? to.left - from.right : 0;
};

export const findNeighbor = (current, direction) => {
  const from = current.getBoundingClientRect();
  const fromCenter = findCenter(from);
  const isHorizontal = direction === 'left' || direction === 'right';
  const isFromTopBar = isTopBarElement(current);
  let bestElement = null;
  let bestScore = Infinity;
  for (const candidate of listFocusCandidates()) {
    if (candidate === current) continue;
    if (!isFromTopBar && direction !== 'up' && isTopBarElement(candidate)) continue;
    const to = candidate.getBoundingClientRect();
    const primary = calculatePrimaryDistance(direction, from, to);
    const sizeKey = isHorizontal ? 'width' : 'height';
    if (primary < -Math.min(from[sizeKey], to[sizeKey]) * OVERLAP_TOLERANCE) continue;
    const toCenter = findCenter(to);
    const orthogonal = calculateOrthogonalGap(isHorizontal, from, to);
    const alignment = isHorizontal
      ? Math.abs(toCenter.y - fromCenter.y)
      : Math.abs(to.left - from.left);
    const score =
      Math.max(0, primary) + orthogonal * ORTHOGONAL_WEIGHT + alignment * ALIGNMENT_WEIGHT;
    if (score < bestScore) {
      bestScore = score;
      bestElement = candidate;
    }
  }
  if (bestElement && isTopBarElement(bestElement) && !isFromTopBar) {
    const activeTab = queryOne('.tab.active', getNavScope());
    if (activeTab && isElementVisible(activeTab)) return activeTab;
  }
  if (
    bestElement &&
    bestElement.dataset.group &&
    bestElement.dataset.group !== current.dataset.group
  ) {
    const remembered = memoryByGroup[bestElement.dataset.group];
    if (remembered && remembered !== bestElement && isRememberedElementUsable(remembered)) {
      return remembered;
    }
  }
  return bestElement;
};

export const moveFocus = (direction) => {
  const current = focusedElement;
  if (current && current.isConnected && current.navHandler && current.navHandler(direction)) {
    return true;
  }
  if (
    !current ||
    !current.isConnected ||
    !getNavScope().contains(current) ||
    !isElementVisible(current)
  ) {
    const previousId = lastFocus && lastFocus.id;
    const recovered = recoverFocus();
    if (!recovered) return false;
    focusElement(recovered, { silent: true });
    if (previousId && recovered.dataset.id === previousId && recovered.isConnected) {
      return moveFocus(direction);
    }
    return true;
  }
  const nextElement = findNeighbor(current, direction);
  if (nextElement) {
    focusElement(nextElement);
    return true;
  }
  playSound('edge');
  return false;
};

export const activateFocused = () => {
  if (!focusedElement || !focusedElement.isConnected) return false;
  focusedElement.click();
  return true;
};
