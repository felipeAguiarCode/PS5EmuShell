import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateCrc32, parseHidReport } from '../../src/main/input/hid-reports.js';

const buildReport = (length, bytes) => {
  const report = Buffer.alloc(length);
  for (const [index, value] of Object.entries(bytes)) report[Number(index)] = value;
  return report;
};

const parseSorted = (controllerType, report, isBluetooth) => {
  const state = parseHidReport(controllerType, report, isBluetooth);
  return state && { ...state, buttons: [...state.buttons].sort() };
};

describe('parseHidReport', () => {
  it('reads a DualShock 4 USB report', () => {
    const report = buildReport(64, {
      0: 1,
      1: 0,
      2: 128,
      3: 128,
      4: 128,
      5: 0x02 | 0x20 | 0x80,
      6: 0x01 | 0x20,
      7: 1,
      8: 255,
      9: 0,
    });
    assert.deepEqual(parseSorted('ds4', report, false), {
      buttons: ['a', 'guide', 'lb', 'right', 'start', 'y'],
      lx: -1,
      ly: 0,
      rx: 0,
      ry: 0,
      lt: 1,
      rt: 0,
    });
  });

  it('reads a DualShock 4 Bluetooth report with the two byte offset', () => {
    const report = buildReport(78, {
      0: 0x11,
      3: 255,
      4: 128,
      5: 128,
      6: 128,
      7: 0x08 | 0x10,
      8: 0x80,
      9: 0x02,
      11: 200,
    });
    assert.deepEqual(parseSorted('ds4', report, true), {
      buttons: ['rs', 'touchpad', 'x'],
      lx: 1,
      ly: 0,
      rx: 0,
      ry: 0,
      lt: 0,
      rt: 200 / 255,
    });
  });

  it('reads a DualSense USB report with the mute button', () => {
    const report = buildReport(64, {
      0: 1,
      1: 128,
      2: 255,
      3: 128,
      4: 128,
      5: 10,
      6: 255,
      8: 0x04 | 0x40,
      9: 0x10,
      10: 0x04,
    });
    assert.deepEqual(parseSorted('dualsense', report, false), {
      buttons: ['b', 'back', 'down', 'mute'],
      lx: 0,
      ly: 1,
      rx: 0,
      ry: 0,
      lt: 10 / 255,
      rt: 1,
    });
  });

  it('reads a DualSense Bluetooth extended report', () => {
    const report = buildReport(78, {
      0: 0x31,
      2: 128,
      3: 0,
      4: 128,
      5: 128,
      6: 0,
      7: 128,
      9: 0x08 | 0x20,
      10: 0x02 | 0x40,
      11: 1,
    });
    assert.deepEqual(parseSorted('dualsense', report, true), {
      buttons: ['a', 'guide', 'ls', 'rb'],
      lx: 0,
      ly: -1,
      rx: 0,
      ry: 0,
      lt: 0,
      rt: 128 / 255,
    });
  });

  it('ignores reports with an unknown id', () => {
    assert.equal(parseHidReport('ds4', buildReport(32, { 0: 5 }), false), null);
  });
});

describe('calculateCrc32', () => {
  it('matches the standard CRC-32 check value', () => {
    assert.equal(calculateCrc32(Buffer.from('123456789')), 0xcbf43926);
  });
});
