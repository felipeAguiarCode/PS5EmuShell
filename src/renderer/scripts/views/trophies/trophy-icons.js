import { TIER_NAMES } from './trophy-rules.js';

const RARITY_LEVELS = { Comum: 3, Raro: 2, 'Muito raro': 1, 'Ultra raro': 0 };
const PYRAMID_TOP = 1;
const PYRAMID_BASE = 21;
const PYRAMID_BANDS = [
  [PYRAMID_TOP, 5.6],
  [6.6, 10.6],
  [11.6, 15.6],
  [16.6, PYRAMID_BASE],
];

export const DATE_ICON =
  '<svg viewBox="0 0 24 24" class="date-ico"><rect x="3" y="6" width="15" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7 3.5h13a1 1 0 0 1 1 1v9" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="10.5" cy="11.5" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

export const renderTrophyIcon = (tier, extraClass = '') =>
  `<span class="trophy t-${tier} ${extraClass}"><img src="img/trophies/${tier}.svg" alt="${TIER_NAMES[tier]}" draggable="false"></span>`;

const calculateHalfWidth = (y) => (12 * (y - PYRAMID_TOP)) / (PYRAMID_BASE - PYRAMID_TOP);

const buildBandPoints = (index, topY, bottomY) => {
  const topHalf = calculateHalfWidth(topY);
  const bottomHalf = calculateHalfWidth(bottomY);
  if (index === 0) return `12,${topY} ${12 + bottomHalf},${bottomY} ${12 - bottomHalf},${bottomY}`;
  return `${12 - topHalf},${topY} ${12 + topHalf},${topY} ${12 + bottomHalf},${bottomY} ${12 - bottomHalf},${bottomY}`;
};

export const renderRarityPyramid = (label) => {
  const activeLevel = RARITY_LEVELS[label];
  const shapes = PYRAMID_BANDS.map(
    ([topY, bottomY], index) =>
      `<polygon points="${buildBandPoints(index, topY, bottomY)}" class="${index === activeLevel ? 'on' : 'off'}"/>`,
  ).join('');
  return `<svg viewBox="0 0 24 22" class="rar-ico lvl-${activeLevel}">${shapes}</svg>`;
};
