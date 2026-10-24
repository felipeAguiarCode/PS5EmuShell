import koffi from 'koffi';
import {
  XINPUT_AXIS_MAX,
  XINPUT_BUTTON_MASKS,
  XINPUT_DLL_NAMES,
  XINPUT_GET_STATE_EX_ORDINAL,
  XINPUT_PROBE_MS,
  XINPUT_SLOT_COUNT,
  XINPUT_TRIGGER_MAX,
} from '../constants/input.js';

const XINPUT_SUCCESS = 0;
const RUMBLE_MOTOR_MAX = 65535;

const loadXInputLibrary = () => {
  for (const dllName of XINPUT_DLL_NAMES) {
    try {
      return koffi.load(dllName);
    } catch {
      continue;
    }
  }
  throw new Error('XInput DLL not found');
};

const bindXInputFunctions = () => {
  const library = loadXInputLibrary();
  const gamepadStruct = koffi.struct('XINPUT_GAMEPAD', {
    wButtons: 'uint16',
    bLeftTrigger: 'uint8',
    bRightTrigger: 'uint8',
    sThumbLX: 'int16',
    sThumbLY: 'int16',
    sThumbRX: 'int16',
    sThumbRY: 'int16',
  });
  const stateStruct = koffi.struct('XINPUT_STATE', {
    dwPacketNumber: 'uint32',
    Gamepad: gamepadStruct,
  });
  const vibrationStruct = koffi.struct('XINPUT_VIBRATION', {
    wLeftMotorSpeed: 'uint16',
    wRightMotorSpeed: 'uint16',
  });
  const stateOutput = koffi.out(koffi.pointer(stateStruct));
  const bindGetState = () => {
    try {
      return library.func('__stdcall', XINPUT_GET_STATE_EX_ORDINAL, 'uint32', [
        'uint32',
        stateOutput,
      ]);
    } catch {
      return library.func('__stdcall', 'XInputGetState', 'uint32', ['uint32', stateOutput]);
    }
  };
  return {
    getState: bindGetState(),
    setState: library.func('__stdcall', 'XInputSetState', 'uint32', [
      'uint32',
      koffi.pointer(vibrationStruct),
    ]),
  };
};

export const mapXInputGamepadToState = (gamepad) => ({
  buttons: new Set(
    Object.entries(XINPUT_BUTTON_MASKS)
      .filter(([, mask]) => gamepad.wButtons & mask)
      .map(([button]) => button),
  ),
  lx: gamepad.sThumbLX / XINPUT_AXIS_MAX,
  ly: -gamepad.sThumbLY / XINPUT_AXIS_MAX,
  rx: gamepad.sThumbRX / XINPUT_AXIS_MAX,
  ry: -gamepad.sThumbRY / XINPUT_AXIS_MAX,
  lt: gamepad.bLeftTrigger / XINPUT_TRIGGER_MAX,
  rt: gamepad.bRightTrigger / XINPUT_TRIGGER_MAX,
});

export const createXInputReader = () => {
  const connectedSlots = Array(XINPUT_SLOT_COUNT).fill(false);
  const nextProbeAt = Array(XINPUT_SLOT_COUNT).fill(0);
  let functions = null;
  let error = null;

  try {
    functions = bindXInputFunctions();
  } catch (bindError) {
    error = bindError.message;
  }

  const readSlot = (slot, now) => {
    if (!connectedSlots[slot] && now < nextProbeAt[slot]) return null;
    const state = {};
    if (functions.getState(slot, state) !== XINPUT_SUCCESS) {
      connectedSlots[slot] = false;
      nextProbeAt[slot] = now + XINPUT_PROBE_MS;
      return null;
    }
    connectedSlots[slot] = true;
    return mapXInputGamepadToState(state.Gamepad);
  };

  const readSlots = (now = Date.now()) => {
    if (!functions) return Array(XINPUT_SLOT_COUNT).fill(null);
    return connectedSlots.map((_, slot) => readSlot(slot, now));
  };

  const rumble = (slot, strongLevel, weakLevel) => {
    if (!functions) return;
    try {
      functions.setState(slot, {
        wLeftMotorSpeed: Math.round(strongLevel * RUMBLE_MOTOR_MAX),
        wRightMotorSpeed: Math.round(weakLevel * RUMBLE_MOTOR_MAX),
      });
    } catch (rumbleError) {
      console.error('XInput rumble failed', rumbleError);
    }
  };

  return { isAvailable: Boolean(functions), error, readSlots, rumble };
};
