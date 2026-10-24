import HID from 'node-hid';
import {
  HID_BLUETOOTH_PATH_PATTERN,
  HID_CALIBRATION_REPORTS,
  HID_CONTROLLER_MODELS,
  HID_GAMEPAD_USAGE,
  HID_GAMEPAD_USAGE_PAGE,
  HID_OPEN_RETRY_MS,
  HID_SCAN_MS,
  SONY_VENDOR_ID,
} from '../constants/input.js';
import { MESSAGES } from '../constants/messages.js';
import { buildHidOutputReport, parseHidReport } from './hid-reports.js';

const BLUETOOTH_FULL_REPORT_IDS = new Set([0x11, 0x31]);
const NON_HEX_CHARACTERS = /[^0-9a-f]/gi;

const isGamepadCollection = (device) =>
  device.usagePage === HID_GAMEPAD_USAGE_PAGE && device.usage === HID_GAMEPAD_USAGE;

const buildPadKey = (controllerType, device) => {
  const serial = (device.serialNumber || '').replace(NON_HEX_CHARACTERS, '');
  return `${controllerType}:${serial || device.path}`;
};

export const createHidPadReader = () => {
  const openPads = new Map();
  const openingPaths = new Set();
  const failedAt = new Map();
  let scanTimer = null;
  let isScanning = false;

  const closePad = (pad) => {
    if (!openPads.has(pad.path)) return;
    openPads.delete(pad.path);
    pad.device.close().catch((error) => console.error('HID close failed', error));
  };

  const requestFullReports = async (device, controllerType) => {
    const calibration = HID_CALIBRATION_REPORTS[controllerType];
    try {
      await device.getFeatureReport(calibration.id, calibration.length);
    } catch {
      return;
    }
  };

  const openPad = async (deviceInfo, model) => {
    openingPaths.add(deviceInfo.path);
    try {
      const device = await HID.HIDAsync.open(deviceInfo.path);
      const pad = {
        path: deviceInfo.path,
        device,
        type: model.type,
        name: MESSAGES[model.nameKey],
        isBluetooth: HID_BLUETOOTH_PATH_PATTERN.test(deviceInfo.path),
        key: buildPadKey(model.type, deviceInfo),
        state: null,
        sequence: 0,
        player: -1,
      };
      device.on('data', (report) => {
        if (BLUETOOTH_FULL_REPORT_IDS.has(report[0])) pad.isBluetooth = true;
        const state = parseHidReport(pad.type, report, pad.isBluetooth);
        if (state) pad.state = state;
      });
      device.on('error', () => closePad(pad));
      openPads.set(deviceInfo.path, pad);
      await requestFullReports(device, model.type);
    } catch {
      failedAt.set(deviceInfo.path, Date.now());
    }
    openingPaths.delete(deviceInfo.path);
  };

  const canOpen = (deviceInfo, now) =>
    !openPads.has(deviceInfo.path) &&
    !openingPaths.has(deviceInfo.path) &&
    now - (failedAt.get(deviceInfo.path) || 0) >= HID_OPEN_RETRY_MS;

  const scanDevices = async () => {
    if (isScanning) return;
    isScanning = true;
    try {
      const devices = await HID.devicesAsync(SONY_VENDOR_ID, 0);
      const now = Date.now();
      for (const deviceInfo of devices) {
        const model = HID_CONTROLLER_MODELS[deviceInfo.productId];
        if (!model || !isGamepadCollection(deviceInfo) || !canOpen(deviceInfo, now)) continue;
        openPad(deviceInfo, model);
      }
    } catch (error) {
      console.error('HID scan failed', error);
    }
    isScanning = false;
  };

  const start = () => {
    if (scanTimer) return;
    scanDevices();
    scanTimer = setInterval(scanDevices, HID_SCAN_MS);
  };

  const stop = () => {
    clearInterval(scanTimer);
    scanTimer = null;
    for (const pad of openPads.values()) closePad(pad);
  };

  const listPads = () =>
    [...openPads.values()]
      .filter((pad) => pad.state)
      .map((pad) => ({
        key: pad.key,
        type: pad.type,
        name: pad.name,
        conn: pad.isBluetooth ? 'bt' : 'usb',
        state: pad.state,
      }));

  const findPadByKey = (key) => [...openPads.values()].find((pad) => pad.key === key) ?? null;

  const sendOutput = (key, { player = -1, strong = 0, weak = 0 } = {}) => {
    const pad = findPadByKey(key);
    if (!pad) return;
    if (player !== null) pad.player = player;
    const report = buildHidOutputReport({
      controllerType: pad.type,
      isBluetooth: pad.isBluetooth,
      player: pad.player,
      strong,
      weak,
      sequence: pad.sequence,
    });
    if (pad.type === 'dualsense' && pad.isBluetooth) pad.sequence += 1;
    pad.device.write([...report]).catch((error) => console.error('HID write failed', error));
  };

  return { isAvailable: true, error: null, start, stop, listPads, sendOutput };
};
