// Nível de bateria do PC (GetSystemPowerStatus via koffi). Em PCs sem bateria devolve null.
let fn = null;

function load() {
  if (fn !== null) return fn;
  try {
    const koffi = require('koffi');
    const STATUS = koffi.struct('SYSTEM_POWER_STATUS', {
      ACLineStatus: 'uint8',
      BatteryFlag: 'uint8',
      BatteryLifePercent: 'uint8',
      SystemStatusFlag: 'uint8',
      BatteryLifeTime: 'uint32',
      BatteryFullLifeTime: 'uint32',
    });
    fn = koffi.load('kernel32.dll').func('__stdcall', 'GetSystemPowerStatus', 'bool', [koffi.out(koffi.pointer(STATUS))]);
  } catch {
    fn = false;
  }
  return fn;
}

// { level: 0–100, charging } ou null (sem bateria ou leitura indisponível).
function read() {
  const f = load();
  if (!f) return null;
  const st = {};
  if (!f(st)) return null;
  // 128 = sem bateria no sistema; 255 = status desconhecido.
  if (st.BatteryFlag === 128 || st.BatteryFlag === 255 || st.BatteryLifePercent > 100) return null;
  return { level: st.BatteryLifePercent, charging: st.ACLineStatus === 1 };
}

module.exports = { read };
