import {
  DUALSENSE_PLAYER_LEDS,
  HID_HAT_DIRECTIONS,
  PLAYER_LIGHT_COLORS,
  UNASSIGNED_LIGHT_COLOR,
} from '../constants/input.js';

const BLUETOOTH_CRC_SEED = 0xa2;
const CRC_POLYNOMIAL = 0xedb88320;
const AXIS_CENTER = 128;
const AXIS_RANGE = 127;
const TRIGGER_MAX = 255;
const BLUETOOTH_OUTPUT_LENGTH = 78;
const CRC_LENGTH = 4;

const buildCrcTable = () =>
  Int32Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? CRC_POLYNOMIAL ^ (value >>> 1) : value >>> 1;
    }
    return value;
  });

const CRC_TABLE = buildCrcTable();

export const calculateCrc32 = (bytes) => {
  let crc = -1;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
};

const withBluetoothCrc = (report) => {
  const signedReport = Buffer.from(report);
  const payload = Buffer.concat([
    Buffer.from([BLUETOOTH_CRC_SEED]),
    signedReport.subarray(0, signedReport.length - CRC_LENGTH),
  ]);
  signedReport.writeUInt32LE(calculateCrc32(payload), signedReport.length - CRC_LENGTH);
  return signedReport;
};

const FACE_AND_SHOULDER_BITS = [
  ['faces', 0x10, 'x'],
  ['faces', 0x20, 'a'],
  ['faces', 0x40, 'b'],
  ['faces', 0x80, 'y'],
  ['shoulders', 0x01, 'lb'],
  ['shoulders', 0x02, 'rb'],
  ['shoulders', 0x10, 'back'],
  ['shoulders', 0x20, 'start'],
  ['shoulders', 0x40, 'ls'],
  ['shoulders', 0x80, 'rs'],
  ['system', 0x01, 'guide'],
  ['system', 0x02, 'touchpad'],
];

export const parseHidButtons = ({ faces, shoulders, system }, controllerType) => {
  const bytes = { faces, shoulders, system };
  const buttons = new Set(HID_HAT_DIRECTIONS[faces & 0x0f] ?? []);
  for (const [byteName, mask, button] of FACE_AND_SHOULDER_BITS) {
    if (bytes[byteName] & mask) buttons.add(button);
  }
  if (controllerType === 'dualsense' && system & 0x04) buttons.add('mute');
  return buttons;
};

const normalizeAxis = (value) => Math.max(-1, (value - AXIS_CENTER) / AXIS_RANGE);

const findReportLayout = (controllerType, reportId, isBluetooth) => {
  if (controllerType === 'ds4') {
    if (reportId === 0x11) return { axisOffset: 3, isCompact: true };
    if (reportId === 0x01) return { axisOffset: 1, isCompact: true };
    return null;
  }
  if (reportId === 0x31) return { axisOffset: 2, isCompact: false };
  if (reportId === 0x01) return { axisOffset: 1, isCompact: isBluetooth };
  return null;
};

export const parseHidReport = (controllerType, report, isBluetooth) => {
  const layout = findReportLayout(controllerType, report[0], isBluetooth);
  if (!layout) return null;
  const { axisOffset, isCompact } = layout;
  const buttonOffset = isCompact ? axisOffset + 4 : axisOffset + 7;
  const leftTrigger = isCompact ? report[axisOffset + 7] : report[axisOffset + 4];
  const rightTrigger = isCompact ? report[axisOffset + 8] : report[axisOffset + 5];
  const buttons = parseHidButtons(
    {
      faces: report[buttonOffset],
      shoulders: report[buttonOffset + 1],
      system: report[buttonOffset + 2],
    },
    controllerType,
  );
  return {
    buttons,
    lx: normalizeAxis(report[axisOffset]),
    ly: normalizeAxis(report[axisOffset + 1]),
    rx: normalizeAxis(report[axisOffset + 2]),
    ry: normalizeAxis(report[axisOffset + 3]),
    lt: (leftTrigger || 0) / TRIGGER_MAX,
    rt: (rightTrigger || 0) / TRIGGER_MAX,
  };
};

const toMotorLevel = (level) => Math.round(level * TRIGGER_MAX);

const buildDualShock4OutputReport = ({ isBluetooth, color, strong, weak }) => {
  const common = Buffer.from([
    0x07,
    0x00,
    0x00,
    toMotorLevel(weak),
    toMotorLevel(strong),
    ...color,
    0,
    0,
  ]);
  if (!isBluetooth) {
    const report = Buffer.alloc(32);
    report[0] = 0x05;
    common.copy(report, 1);
    return report;
  }
  const report = Buffer.alloc(BLUETOOTH_OUTPUT_LENGTH);
  report[0] = 0x11;
  report[1] = 0xc0;
  common.copy(report, 3);
  return withBluetoothCrc(report);
};

const buildDualSenseOutputReport = ({ isBluetooth, color, player, strong, weak, sequence }) => {
  const common = Buffer.alloc(47);
  common[0] = 0x03;
  common[1] = 0x04 | 0x10;
  common[2] = toMotorLevel(weak);
  common[3] = toMotorLevel(strong);
  common[38] = 0x02;
  common[41] = 0x02;
  common[43] = DUALSENSE_PLAYER_LEDS[player] ?? 0;
  common[44] = color[0];
  common[45] = color[1];
  common[46] = color[2];
  if (!isBluetooth) {
    const report = Buffer.alloc(48);
    report[0] = 0x02;
    common.copy(report, 1);
    return report;
  }
  const report = Buffer.alloc(BLUETOOTH_OUTPUT_LENGTH);
  report[0] = 0x31;
  report[1] = (sequence & 0x0f) << 4;
  report[2] = 0x10;
  common.copy(report, 3);
  return withBluetoothCrc(report);
};

export const buildHidOutputReport = ({
  controllerType,
  isBluetooth,
  player,
  strong = 0,
  weak = 0,
  sequence = 0,
}) => {
  const color = PLAYER_LIGHT_COLORS[player] ?? UNASSIGNED_LIGHT_COLOR;
  const options = { isBluetooth, color, player, strong, weak, sequence };
  return controllerType === 'ds4'
    ? buildDualShock4OutputReport(options)
    : buildDualSenseOutputReport(options);
};
