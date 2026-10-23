// Leitura de controles XInput direto da xinput1_4.dll (via koffi), no processo main.
// Funciona mesmo com a janela oculta — necessário para o combo de fechar o emulador.
// Só lê o estado; quem transforma em eventos de botão é o controllers.js.

const BTN = {
  up: 0x0001, down: 0x0002, left: 0x0004, right: 0x0008,
  start: 0x0010, back: 0x0020, ls: 0x0040, rs: 0x0080,
  lb: 0x0100, rb: 0x0200, guide: 0x0400,
  a: 0x1000, b: 0x2000, x: 0x4000, y: 0x8000,
};
const PROBE_MS = 2000;

class XInput {
  constructor() {
    this.available = false;
    this.connected = [false, false, false, false];
    this.nextProbe = [0, 0, 0, 0];
    try {
      this.init();
      this.available = true;
    } catch (e) {
      this.error = e.message;
    }
  }

  init() {
    const koffi = require('koffi');
    let lib;
    for (const dll of ['xinput1_4.dll', 'xinput1_3.dll', 'xinput9_1_0.dll']) {
      try {
        lib = koffi.load(dll);
        break;
      } catch {}
    }
    if (!lib) throw new Error('XInput DLL não encontrada');
    const GAMEPAD = koffi.struct('XINPUT_GAMEPAD', {
      wButtons: 'uint16',
      bLeftTrigger: 'uint8',
      bRightTrigger: 'uint8',
      sThumbLX: 'int16',
      sThumbLY: 'int16',
      sThumbRX: 'int16',
      sThumbRY: 'int16',
    });
    const STATE = koffi.struct('XINPUT_STATE', { dwPacketNumber: 'uint32', Gamepad: GAMEPAD });
    const VIBRATION = koffi.struct('XINPUT_VIBRATION', { wLeftMotorSpeed: 'uint16', wRightMotorSpeed: 'uint16' });
    const outState = koffi.out(koffi.pointer(STATE));
    // Ordinal 100 = XInputGetStateEx (inclui o botão Guide). Cai para a função pública se faltar.
    try {
      this.getState = lib.func('__stdcall', 100, 'uint32', ['uint32', outState]);
    } catch {
      this.getState = lib.func('__stdcall', 'XInputGetState', 'uint32', ['uint32', outState]);
    }
    this.setState = lib.func('__stdcall', 'XInputSetState', 'uint32', ['uint32', koffi.pointer(VIBRATION)]);
  }

  // Estado de cada um dos 4 slots: null (desconectado) ou { buttons, lx, ly, rx, ry, lt, rt }.
  // Eixos de -1 a 1 (y positivo para baixo, como na tela) e gatilhos de 0 a 1.
  read() {
    const now = Date.now();
    const out = [null, null, null, null];
    if (!this.available) return out;
    for (let i = 0; i < 4; i++) {
      if (!this.connected[i] && now < this.nextProbe[i]) continue;
      const st = {};
      if (this.getState(i, st) !== 0) {
        this.connected[i] = false;
        this.nextProbe[i] = now + PROBE_MS;
        continue;
      }
      this.connected[i] = true;
      const g = st.Gamepad;
      const buttons = new Set();
      for (const [k, v] of Object.entries(BTN)) if (g.wButtons & v) buttons.add(k);
      out[i] = {
        buttons,
        lx: g.sThumbLX / 32767,
        ly: -g.sThumbLY / 32767,
        rx: g.sThumbRX / 32767,
        ry: -g.sThumbRY / 32767,
        lt: g.bLeftTrigger / 255,
        rt: g.bRightTrigger / 255,
      };
    }
    return out;
  }

  rumble(i, strong, weak) {
    if (!this.available) return;
    try {
      this.setState(i, { wLeftMotorSpeed: Math.round(strong * 65535), wRightMotorSpeed: Math.round(weak * 65535) });
    } catch {}
  }
}

module.exports = { XInput };
