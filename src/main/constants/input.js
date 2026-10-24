export const CONTROLLER_POLL_MS = 8;
export const PLAYER_SLOT_COUNT = 4;
export const DIRECTION_BUTTONS = ['up', 'down', 'left', 'right'];
export const REPEATABLE_BUTTONS = new Set([...DIRECTION_BUTTONS, 'lt', 'rt']);
export const STICK_NAVIGATION_THRESHOLD = 0.5;
export const TRIGGER_PRESS_THRESHOLD = 0.4;
export const REPEAT_FIRST_DELAY_MS = 340;
export const REPEAT_BASE_INTERVAL_MS = 115;
export const REPEAT_ACCELERATION_MS = 9;
export const REPEAT_MIN_INTERVAL_MS = 40;
export const DETECT_TIMEOUT_MS = 15000;
export const RUMBLE_DURATION_MS = 450;
export const RUMBLE_STRONG_LEVEL = 0.7;
export const RUMBLE_WEAK_LEVEL = 0.5;

export const XINPUT_DLL_NAMES = ['xinput1_4.dll', 'xinput1_3.dll', 'xinput9_1_0.dll'];
export const XINPUT_GET_STATE_EX_ORDINAL = 100;
export const XINPUT_SLOT_COUNT = 4;
export const XINPUT_PROBE_MS = 2000;
export const XINPUT_AXIS_MAX = 32767;
export const XINPUT_TRIGGER_MAX = 255;
export const XINPUT_BUTTON_MASKS = {
  up: 0x0001,
  down: 0x0002,
  left: 0x0004,
  right: 0x0008,
  start: 0x0010,
  back: 0x0020,
  ls: 0x0040,
  rs: 0x0080,
  lb: 0x0100,
  rb: 0x0200,
  guide: 0x0400,
  a: 0x1000,
  b: 0x2000,
  x: 0x4000,
  y: 0x8000,
};

export const SONY_VENDOR_ID = 0x054c;
export const HID_GAMEPAD_USAGE_PAGE = 1;
export const HID_GAMEPAD_USAGE = 5;
export const HID_SCAN_MS = 2500;
export const HID_OPEN_RETRY_MS = 15000;
export const HID_BLUETOOTH_PATH_PATTERN = /00001124-0000-1000-8000-00805f9b34fb|_VID&0002/i;
export const HID_CONTROLLER_MODELS = {
  0x05c4: { type: 'ds4', nameKey: 'dualShock4' },
  0x09cc: { type: 'ds4', nameKey: 'dualShock4' },
  0x0ba0: { type: 'ds4', nameKey: 'dualShock4Adapter' },
  0x0ce6: { type: 'dualsense', nameKey: 'dualSense' },
  0x0df2: { type: 'dualsense', nameKey: 'dualSenseEdge' },
};
export const HID_HAT_DIRECTIONS = [
  ['up'],
  ['up', 'right'],
  ['right'],
  ['down', 'right'],
  ['down'],
  ['down', 'left'],
  ['left'],
  ['up', 'left'],
];
export const HID_CALIBRATION_REPORTS = {
  ds4: { id: 0x02, length: 37 },
  dualsense: { id: 0x05, length: 41 },
};
export const PLAYER_LIGHT_COLORS = [
  [0, 64, 255],
  [255, 24, 24],
  [0, 200, 40],
  [255, 40, 160],
];
export const UNASSIGNED_LIGHT_COLOR = [40, 40, 40];
export const DUALSENSE_PLAYER_LEDS = [0b00100, 0b01010, 0b10101, 0b11011];
