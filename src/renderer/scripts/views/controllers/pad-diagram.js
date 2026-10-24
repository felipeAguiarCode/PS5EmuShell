import { BUTTON_NAMES } from '../../constants/buttons.js';

const PLAYSTATION_BODY_PATH =
  'M150 92C205 72 435 72 490 92C560 104 600 172 615 262C628 342 600 386 560 386C522 386 500 346 470 304H170C140 346 118 386 80 386C40 386 12 342 25 262C40 172 80 104 150 92Z';
const XBOX_BODY_PATH =
  'M170 92C220 76 420 76 470 92C545 108 590 175 610 268C625 345 595 388 552 388C512 388 490 350 462 318C420 300 220 300 178 318C150 350 128 388 88 388C45 388 15 345 30 268C50 175 95 108 170 92Z';
const PLAYSTATION_POSITIONS = {
  dpad: [150, 178],
  face: [490, 178],
  ls: [242, 258],
  rs: [398, 258],
  back: [212, 112],
  start: [428, 112],
  guide: [320, 222],
};
const XBOX_POSITIONS = {
  dpad: [242, 262],
  face: [478, 168],
  ls: [168, 168],
  rs: [398, 262],
  back: [276, 168],
  start: [364, 168],
  guide: [320, 116],
};
const FACE_OFFSETS = [
  ['y', 0, -36],
  ['b', 36, 0],
  ['a', 0, 36],
  ['x', -36, 0],
];
const BASE_BUTTONS = [
  'up',
  'down',
  'left',
  'right',
  'a',
  'b',
  'x',
  'y',
  'lb',
  'rb',
  'lt',
  'rt',
  'ls',
  'rs',
  'back',
  'start',
  'guide',
  'lstick',
  'rstick',
];
const EXTRA_LABELS = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  lstick: 'Analógico esq.',
  rstick: 'Analógico dir.',
  touchpad: 'Touchpad',
  mute: 'Mudo',
};

const isPlayStationType = (type) => type !== 'xbox';

const renderDpadArm = (button, x, y, width, height) =>
  `<rect class="pd-btn" data-b="${button}" x="${x}" y="${y}" width="${width}" height="${height}" rx="5"/>`;

const renderDpad = ([x, y]) =>
  renderDpadArm('up', x - 13, y - 44, 26, 32) +
  renderDpadArm('down', x - 13, y + 12, 26, 32) +
  renderDpadArm('left', x - 44, y - 13, 32, 26) +
  renderDpadArm('right', x + 12, y - 13, 32, 26) +
  `<rect class="pd-hub" x="${x - 13}" y="${y - 13}" width="26" height="26"/>`;

const buildFaceSymbols = (isPlayStation) => ({
  y: isPlayStation ? `<path d="M0 -9L8 6H-8Z"/>` : `<text>Y</text>`,
  b: isPlayStation ? `<circle r="8"/>` : `<text>B</text>`,
  a: isPlayStation ? `<path d="M-7 -7L7 7M7 -7L-7 7"/>` : `<text>A</text>`,
  x: isPlayStation ? `<rect x="-7" y="-7" width="14" height="14"/>` : `<text>X</text>`,
});

const renderFaceButtons = ([x, y], isPlayStation) => {
  const symbols = buildFaceSymbols(isPlayStation);
  return FACE_OFFSETS.map(
    ([button, offsetX, offsetY]) =>
      `<g class="pd-face" transform="translate(${x + offsetX} ${y + offsetY})"><circle class="pd-btn" data-b="${button}" r="19"/><g class="pd-sym pd-${button}">${symbols[button]}</g></g>`,
  ).join('');
};

const findStickLabel = (button, isPlayStation) => {
  if (button === 'ls') return isPlayStation ? 'L3' : 'LS';
  return isPlayStation ? 'R3' : 'RS';
};

const renderStick = (button, [x, y], isPlayStation) =>
  `<g class="pd-stick" data-stick="${button}" transform="translate(${x} ${y})"><circle class="pd-well" r="38"/><circle class="pd-range" r="24"/>` +
  `<g class="pd-cap"><circle class="pd-btn" data-b="${button}" r="20"/><text>${findStickLabel(button, isPlayStation)}</text></g></g>`;

const renderPill = (button, [x, y], label) =>
  `<g transform="translate(${x} ${y})"><rect class="pd-btn" data-b="${button}" x="-17" y="-9" width="34" height="18" rx="9"/><text class="pd-small" y="28">${label}</text></g>`;

const renderShoulder = (button, x, label) =>
  `<g transform="translate(${x} 58)"><rect class="pd-btn" data-b="${button}" width="96" height="18" rx="9"/><text class="pd-small" x="48" y="13">${label}</text></g>`;

const renderTrigger = (button, x, label) =>
  `<g transform="translate(${x} 14)"><rect class="pd-trig" width="96" height="30" rx="10"/><rect class="pd-fill" data-t="${button}" width="0" height="30" rx="10"/>` +
  `<rect class="pd-btn pd-ghost" data-b="${button}" width="96" height="30" rx="10"/><text class="pd-small" x="48" y="20">${label}</text></g>`;

const renderCenter = (type, [guideX, guideY]) => {
  if (!isPlayStationType(type)) {
    return `<circle class="pd-btn" data-b="guide" cx="${guideX}" cy="${guideY}" r="17"/><text class="pd-small" x="${guideX}" y="${guideY + 4}">Guia</text>`;
  }
  return (
    `<rect class="pd-btn pd-pad" data-b="touchpad" x="246" y="98" width="148" height="82" rx="14"/><text class="pd-small" x="320" y="144">touchpad</text>` +
    `<circle class="pd-btn" data-b="guide" cx="${guideX}" cy="${guideY}" r="13"/><text class="pd-small" x="${guideX}" y="${guideY + 4}">PS</text>` +
    (type === 'dualsense'
      ? `<rect class="pd-btn" data-b="mute" x="308" y="242" width="24" height="9" rx="4.5"/>`
      : '')
  );
};

const listDiagramNames = (type) => {
  if (!isPlayStationType(type)) return ['LB', 'RB', 'LT', 'RT', 'EXIBIR', 'MENU'];
  return ['L1', 'R1', 'L2', 'R2', type === 'ds4' ? 'SHARE' : 'CREATE', 'OPTIONS'];
};

export const renderPadDiagram = (type) => {
  const isPlayStation = isPlayStationType(type);
  const positions = isPlayStation ? PLAYSTATION_POSITIONS : XBOX_POSITIONS;
  const names = listDiagramNames(type);
  return (
    `<svg class="pad-diagram" viewBox="0 0 640 400" aria-hidden="true">` +
    renderTrigger('lt', 104, names[2]) +
    renderTrigger('rt', 440, names[3]) +
    renderShoulder('lb', 104, names[0]) +
    renderShoulder('rb', 440, names[1]) +
    `<path class="pd-body" d="${isPlayStation ? PLAYSTATION_BODY_PATH : XBOX_BODY_PATH}"/>` +
    renderCenter(type, positions.guide) +
    renderPill('back', positions.back, names[4]) +
    renderPill('start', positions.start, names[5]) +
    renderDpad(positions.dpad) +
    renderFaceButtons(positions.face, isPlayStation) +
    renderStick('ls', positions.ls, isPlayStation) +
    renderStick('rs', positions.rs, isPlayStation) +
    `</svg>`
  );
};

export const listPadTestButtons = (type) => [
  ...BASE_BUTTONS,
  ...(type !== 'xbox' ? ['touchpad'] : []),
  ...(type === 'dualsense' ? ['mute'] : []),
];

export const formatPadButtonLabel = (button, type) =>
  EXTRA_LABELS[button] ||
  BUTTON_NAMES[isPlayStationType(type) ? 'playstation' : 'xbox'][button] ||
  button;

export const formatAxisValue = (value) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}`;
