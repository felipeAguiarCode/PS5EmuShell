export const BUTTON_IMAGES = {
  playstation: ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'ls', 'rs'],
  xbox: ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'ls', 'rs', 'start', 'back', 'guide'],
};

export const BUTTON_NAMES = {
  playstation: {
    a: '✕',
    b: '○',
    x: '□',
    y: '△',
    lb: 'L1',
    rb: 'R1',
    lt: 'L2',
    rt: 'R2',
    ls: 'L3',
    rs: 'R3',
    start: 'OPTIONS',
    back: 'CREATE',
    guide: 'PS',
    lr: '◀ ▶',
  },
  xbox: {
    a: 'A',
    b: 'B',
    x: 'X',
    y: 'Y',
    lb: 'LB',
    rb: 'RB',
    lt: 'LT',
    rt: 'RT',
    ls: 'LS',
    rs: 'RS',
    start: 'Menu',
    back: 'Exibir',
    guide: 'Xbox',
    lr: '◀ ▶',
  },
};

export const FACE_BUTTONS = ['a', 'b', 'x', 'y'];

export const DIRECTION_BUTTONS = ['up', 'down', 'left', 'right'];

export const KEYBOARD_BUTTONS = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Enter: 'a',
  Escape: 'b',
  Backspace: 'b',
  q: 'lb',
  e: 'rb',
  f: 'x',
  o: 'y',
  F1: 'start',
  PageUp: 'lt',
  PageDown: 'rt',
  Home: 'guide',
};

export const GAMEPAD_API_BUTTONS = {
  0: 'a',
  1: 'b',
  2: 'x',
  3: 'y',
  4: 'lb',
  5: 'rb',
  6: 'lt',
  7: 'rt',
  8: 'back',
  9: 'start',
  10: 'ls',
  11: 'rs',
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right',
  16: 'guide',
};

export const GAMEPAD_STICK_THRESHOLD = 0.5;
export const REPEAT_FIRST_DELAY_MS = 340;
export const REPEAT_BASE_INTERVAL_MS = 115;
export const REPEAT_ACCELERATION_MS = 9;
export const REPEAT_MIN_INTERVAL_MS = 40;
