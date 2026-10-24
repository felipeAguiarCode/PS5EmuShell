import koffi from 'koffi';
import {
  AC_LINE_ONLINE,
  BATTERY_FLAG_NO_BATTERY,
  BATTERY_FLAG_UNKNOWN,
  MAX_BATTERY_PERCENT,
} from '../constants/system.js';

let getSystemPowerStatus = null;

const bindGetSystemPowerStatus = () => {
  if (getSystemPowerStatus) return getSystemPowerStatus;
  const powerStatusStruct = koffi.struct('SYSTEM_POWER_STATUS', {
    ACLineStatus: 'uint8',
    BatteryFlag: 'uint8',
    BatteryLifePercent: 'uint8',
    SystemStatusFlag: 'uint8',
    BatteryLifeTime: 'uint32',
    BatteryFullLifeTime: 'uint32',
  });
  getSystemPowerStatus = koffi
    .load('kernel32.dll')
    .func('__stdcall', 'GetSystemPowerStatus', 'bool', [
      koffi.out(koffi.pointer(powerStatusStruct)),
    ]);
  return getSystemPowerStatus;
};

export const mapPowerStatusToBattery = (powerStatus) => {
  const hasNoBattery =
    powerStatus.BatteryFlag === BATTERY_FLAG_NO_BATTERY ||
    powerStatus.BatteryFlag === BATTERY_FLAG_UNKNOWN ||
    powerStatus.BatteryLifePercent > MAX_BATTERY_PERCENT;
  if (hasNoBattery) return null;
  return {
    level: powerStatus.BatteryLifePercent,
    charging: powerStatus.ACLineStatus === AC_LINE_ONLINE,
  };
};

export const readBatteryStatus = () => {
  try {
    const powerStatus = {};
    if (!bindGetSystemPowerStatus()(powerStatus)) return null;
    return mapPowerStatusToBattery(powerStatus);
  } catch {
    return null;
  }
};
