import { EventEmitter } from 'node:events';
import {
  CONTROLLER_POLL_MS,
  DETECT_TIMEOUT_MS,
  PLAYER_SLOT_COUNT,
  RUMBLE_DURATION_MS,
  RUMBLE_STRONG_LEVEL,
  RUMBLE_WEAK_LEVEL,
} from '../constants/input.js';
import { MESSAGES } from '../constants/messages.js';
import { buildNavigationButtons, calculateButtonEvents } from './button-state.js';
import { createHidPadReader } from './hid-pad-reader.js';
import { createXInputReader } from './xinput-reader.js';

const XINPUT_CONNECTION = 'xinput';

export const buildPlayerSlots = (savedSlots) =>
  Array.from({ length: PLAYER_SLOT_COUNT }, (_, slot) => savedSlots?.[slot] ?? null);

export const findFreeSlot = (slots, isConnected) => {
  const emptySlot = slots.findIndex((slot) => !slot);
  if (emptySlot >= 0) return emptySlot;
  return slots.findIndex((slot) => !isConnected(slot.key));
};

export const withSwappedSlot = (slots, targetSlot, key, entry) => {
  const nextSlots = [...slots];
  const sourceSlot = slots.findIndex((slot) => slot && slot.key === key);
  if (sourceSlot >= 0) nextSlots[sourceSlot] = slots[targetSlot];
  nextSlots[targetSlot] = entry;
  return nextSlots;
};

const buildXInputDevice = (state, slot) => ({
  key: `${XINPUT_CONNECTION}:${slot}`,
  type: 'xbox',
  name: MESSAGES.xboxController,
  conn: XINPUT_CONNECTION,
  index: slot,
  state,
});

const buildSimulatedDevice = (device) => ({
  ...device,
  state: { ...device.state, buttons: new Set(device.state.buttons) },
});

export const createControllerHub = ({ loadSettings, saveSettings }) => {
  const events = new EventEmitter();
  const xinput = createXInputReader();
  const hid = createHidPadReader();
  const devices = new Map();
  const savedSettings = loadSettings();
  let settings = {
    autoAssign: savedSettings.autoAssign !== false,
    slots: buildPlayerSlots(savedSettings.slots),
  };
  let previousButtons = new Set();
  let repeatTimers = {};
  let lastControllerType = null;
  let pendingDetection = null;
  let watchedKey = null;
  let pollTimer = null;
  let simulatedDevices = null;

  const persistSettings = () => saveSettings(settings);

  const findSlotByKey = (key) => settings.slots.findIndex((slot) => slot && slot.key === key);

  const buildDeviceSummary = (device) => ({
    key: device.key,
    type: device.type,
    name: device.name,
    conn: device.conn,
    slot: findSlotByKey(device.key),
    count: devices.size,
  });

  const updatePlayerLights = () => {
    for (const device of devices.values()) {
      if (device.conn !== XINPUT_CONNECTION) {
        hid.sendOutput(device.key, { player: findSlotByKey(device.key) });
      }
    }
  };

  const handleDeviceConnected = (device) => {
    const knownSlot = findSlotByKey(device.key);
    const slot =
      knownSlot < 0 && settings.autoAssign
        ? findFreeSlot(settings.slots, (key) => devices.has(key))
        : knownSlot;
    if (slot >= 0) {
      const slots = [...settings.slots];
      slots[slot] = { key: device.key, type: device.type, name: device.name };
      settings = { ...settings, slots };
      persistSettings();
    }
    updatePlayerLights();
    events.emit('connect', buildDeviceSummary(device));
    events.emit('change');
  };

  const listConnectedDevices = () => {
    const connected = new Map();
    xinput.readSlots().forEach((state, slot) => {
      if (state) connected.set(`${XINPUT_CONNECTION}:${slot}`, buildXInputDevice(state, slot));
    });
    for (const pad of hid.listPads()) connected.set(pad.key, pad);
    for (const device of simulatedDevices ?? [])
      connected.set(device.key, buildSimulatedDevice(device));
    return connected;
  };

  const syncDevices = (connected) => {
    for (const [key, device] of connected) {
      const knownDevice = devices.get(key);
      if (knownDevice) {
        knownDevice.state = device.state;
        knownDevice.conn = device.conn;
        continue;
      }
      devices.set(key, { ...device, heldButtons: new Set() });
      handleDeviceConnected(devices.get(key));
    }
    for (const [key, device] of devices) {
      if (connected.has(key)) continue;
      devices.delete(key);
      events.emit('disconnect', buildDeviceSummary(device));
      events.emit('change');
    }
  };

  const handleNewPresses = (device, heldButtons) => {
    const hasNewPress = [...heldButtons].some((button) => !device.heldButtons.has(button));
    if (!hasNewPress) return;
    if (lastControllerType !== device.type) {
      lastControllerType = device.type;
      events.emit('active', device.type);
    }
    if (pendingDetection) {
      const resolveDetection = pendingDetection.resolve;
      pendingDetection = null;
      resolveDetection(buildDeviceSummary(device));
    }
  };

  const collectHeldButtons = () => {
    const allHeldButtons = new Set();
    for (const device of devices.values()) {
      const heldButtons = buildNavigationButtons(device.state);
      handleNewPresses(device, heldButtons);
      device.heldButtons = heldButtons;
      for (const button of heldButtons) allHeldButtons.add(button);
    }
    return allHeldButtons;
  };

  const emitWatchedState = () => {
    if (!watchedKey) return;
    const device = devices.get(watchedKey);
    events.emit(
      'state',
      device
        ? { key: device.key, connected: true, ...device.state, buttons: [...device.state.buttons] }
        : { key: watchedKey, connected: false },
    );
  };

  const poll = () => {
    syncDevices(listConnectedDevices());
    const heldButtons = collectHeldButtons();
    const buttonEvents = calculateButtonEvents({
      heldButtons,
      previousButtons,
      repeatTimers,
      now: Date.now(),
    });
    for (const { button, isRepeat } of buttonEvents.presses) events.emit('press', button, isRepeat);
    for (const button of buttonEvents.releases) events.emit('release', button);
    previousButtons = heldButtons;
    repeatTimers = buttonEvents.repeatTimers;
    emitWatchedState();
  };

  const listControllers = () => ({
    slots: settings.slots.map((entry, slot) => {
      if (!entry) return { slot, empty: true };
      const device = devices.get(entry.key);
      return {
        slot,
        key: entry.key,
        type: entry.type,
        name: entry.name,
        connected: Boolean(device),
        conn: device ? device.conn : null,
      };
    }),
    unassigned: [...devices.values()]
      .filter((device) => findSlotByKey(device.key) < 0)
      .map(buildDeviceSummary),
    autoAssign: settings.autoAssign,
    lastType: lastControllerType,
    sources: {
      xinput: { available: xinput.isAvailable, error: xinput.error },
      hid: { available: hid.isAvailable, error: hid.error },
    },
  });

  const commitSlots = (slots) => {
    settings = { ...settings, slots };
    persistSettings();
    updatePlayerLights();
    events.emit('change');
    return listControllers();
  };

  const assignSlot = (targetSlot, key) => {
    const device = devices.get(key);
    const sourceSlot = findSlotByKey(key);
    const entry = device
      ? { key, type: device.type, name: device.name }
      : (settings.slots[sourceSlot] ?? null);
    if (!entry || targetSlot < 0 || targetSlot >= PLAYER_SLOT_COUNT) return listControllers();
    return commitSlots(withSwappedSlot(settings.slots, targetSlot, key, entry));
  };

  const clearSlot = (slot) => {
    const slots = [...settings.slots];
    slots[slot] = null;
    return commitSlots(slots);
  };

  const setAutoAssign = (isEnabled) => {
    settings = { ...settings, autoAssign: Boolean(isEnabled) };
    if (isEnabled) {
      for (const device of devices.values()) {
        if (findSlotByKey(device.key) < 0) handleDeviceConnected(device);
      }
    }
    persistSettings();
    events.emit('change');
    return listControllers();
  };

  const cancelDetection = () => {
    if (!pendingDetection) return;
    const { resolve, timer } = pendingDetection;
    pendingDetection = null;
    clearTimeout(timer);
    resolve(null);
  };

  const detectController = () => {
    cancelDetection();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pendingDetection = null;
        resolve(null);
      }, DETECT_TIMEOUT_MS);
      pendingDetection = {
        timer,
        resolve: (summary) => {
          clearTimeout(timer);
          resolve(summary);
        },
      };
    });
  };

  const rumble = (key) => {
    const device = devices.get(key);
    if (!device) return false;
    if (device.conn === XINPUT_CONNECTION) {
      xinput.rumble(device.index, RUMBLE_STRONG_LEVEL, RUMBLE_WEAK_LEVEL);
      setTimeout(() => xinput.rumble(device.index, 0, 0), RUMBLE_DURATION_MS);
      return true;
    }
    hid.sendOutput(key, { player: null, strong: RUMBLE_STRONG_LEVEL, weak: RUMBLE_WEAK_LEVEL });
    setTimeout(() => hid.sendOutput(key, { player: null }), RUMBLE_DURATION_MS);
    return true;
  };

  const start = () => {
    if (pollTimer) return;
    hid.start();
    pollTimer = setInterval(poll, CONTROLLER_POLL_MS);
  };

  const stop = () => {
    clearInterval(pollTimer);
    pollTimer = null;
    hid.stop();
  };

  return {
    on: (eventName, listener) => events.on(eventName, listener),
    start,
    stop,
    isAvailable: () => xinput.isAvailable || hid.isAvailable,
    getXInputError: () => xinput.error,
    getConnectedCount: () => devices.size,
    listHeldButtonSets: () => [...devices.values()].map((device) => device.heldButtons),
    listControllers,
    assignSlot,
    clearSlot,
    setAutoAssign,
    detectController,
    cancelDetection,
    watchController: (key) => {
      watchedKey = key || null;
    },
    rumble,
    setSimulatedDevices: (nextDevices) => {
      simulatedDevices = nextDevices;
    },
  };
};
