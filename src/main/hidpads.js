// Controles de PlayStation (DualShock 4 e DualSense) lidos direto por HID, via USB ou Bluetooth.
// Eles não falam XInput: sem isto só funcionariam com Steam/DS4Windows.
// Formatos dos relatórios conforme o driver hid-playstation do Linux.

const SONY = 0x054c;
const MODELS = {
  0x05c4: { type: 'ds4', name: 'DualShock 4' },
  0x09cc: { type: 'ds4', name: 'DualShock 4' },
  0x0ba0: { type: 'ds4', name: 'DualShock 4 (adaptador sem fio)' },
  0x0ce6: { type: 'dualsense', name: 'DualSense' },
  0x0df2: { type: 'dualsense', name: 'DualSense Edge' },
};
const SCAN_MS = 2500;
const HAT = [['up'], ['up', 'right'], ['right'], ['down', 'right'], ['down'], ['down', 'left'], ['left'], ['up', 'left']];

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// Relatórios Bluetooth de saída terminam com um CRC32 calculado sobre 0xA2 + o relatório.
function withCrc(report) {
  const crc = crc32(Buffer.concat([Buffer.from([0xa2]), report.subarray(0, report.length - 4)]));
  report.writeUInt32LE(crc, report.length - 4);
  return report;
}

// Botões comuns aos dois modelos: d-pad (hat) + formas no 1º byte, ombros/gatilhos/share/options/L3/R3 no 2º.
function parseButtons(b0, b1, b2, type) {
  const buttons = new Set(HAT[b0 & 0x0f] || []);
  if (b0 & 0x10) buttons.add('x'); // quadrado
  if (b0 & 0x20) buttons.add('a'); // xis
  if (b0 & 0x40) buttons.add('b'); // círculo
  if (b0 & 0x80) buttons.add('y'); // triângulo
  if (b1 & 0x01) buttons.add('lb');
  if (b1 & 0x02) buttons.add('rb');
  if (b1 & 0x10) buttons.add('back'); // Share / Create
  if (b1 & 0x20) buttons.add('start'); // Options
  if (b1 & 0x40) buttons.add('ls');
  if (b1 & 0x80) buttons.add('rs');
  if (b2 & 0x01) buttons.add('guide'); // PS
  if (b2 & 0x02) buttons.add('touchpad');
  if (type === 'dualsense' && b2 & 0x04) buttons.add('mute');
  return buttons;
}

const axis = (v) => Math.max(-1, (v - 128) / 127);

// Lê um relatório de entrada. Retorna null se não for um relatório de estado conhecido.
function parseReport(type, data, bt) {
  const id = data[0];
  let o; // posição do eixo LX
  let full = true; // relatório completo (gatilhos em posições próprias do modelo)
  if (type === 'ds4') {
    if (id === 0x11) o = 3; // Bluetooth completo
    else if (id === 0x01) o = 1; // USB (ou Bluetooth simples: mesmo layout)
    else return null;
  } else {
    if (id === 0x31) o = 2; // Bluetooth completo
    else if (id === 0x01 && !bt) o = 1; // USB
    else if (id === 0x01) {
      o = 1; // Bluetooth simples: layout igual ao do DualShock 4
      full = false;
    } else return null;
  }
  const lx = axis(data[o]);
  const ly = axis(data[o + 1]);
  const rx = axis(data[o + 2]);
  const ry = axis(data[o + 3]);
  let lt;
  let rt;
  let b;
  if (type === 'ds4' || !full) {
    b = o + 4;
    lt = data[o + 7];
    rt = data[o + 8];
  } else {
    lt = data[o + 4];
    rt = data[o + 5];
    b = o + 7;
  }
  const buttons = parseButtons(data[b], data[b + 1], data[b + 2], type);
  return { buttons, lx, ly, rx, ry, lt: (lt || 0) / 255, rt: (rt || 0) / 255 };
}

// Cores da barra de luz por jogador (as mesmas do PS4/PS5) e LEDs de jogador do DualSense.
const PLAYER_COLORS = [[0, 64, 255], [255, 24, 24], [0, 200, 40], [255, 40, 160]];
const PLAYER_LEDS = [0b00100, 0b01010, 0b10101, 0b11011];

class HidPads {
  constructor() {
    this.pads = new Map(); // path → pad
    this.opening = new Set();
    this.failed = new Map(); // path → horário da falha (não tenta de novo toda hora)
    try {
      this.HID = require('node-hid');
      this.available = true;
    } catch (e) {
      this.available = false;
      this.error = e.message;
    }
  }

  start() {
    if (!this.available || this.timer) return;
    this.scan();
    this.timer = setInterval(() => this.scan(), SCAN_MS);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    for (const p of this.pads.values()) this.close(p);
  }

  async scan() {
    if (this.scanning) return;
    this.scanning = true;
    try {
      const list = await this.HID.devicesAsync(SONY, 0);
      const now = Date.now();
      for (const d of list) {
        const model = MODELS[d.productId];
        // Só a coleção de gamepad (página 1, uso 5); o controle expõe outras (áudio, etc.).
        if (!model || d.usagePage !== 1 || d.usage !== 5) continue;
        if (this.pads.has(d.path) || this.opening.has(d.path)) continue;
        if (now - (this.failed.get(d.path) || 0) < 15000) continue;
        this.open(d, model);
      }
    } catch {}
    this.scanning = false;
  }

  async open(info, model) {
    this.opening.add(info.path);
    try {
      const dev = await this.HID.HIDAsync.open(info.path);
      const bt = /00001124-0000-1000-8000-00805f9b34fb|_VID&0002/i.test(info.path);
      const serial = (info.serialNumber || '').replace(/[^0-9a-f]/gi, '');
      const pad = {
        path: info.path,
        dev,
        type: model.type,
        name: model.name,
        bt,
        // Identificador estável: o serial (endereço do controle) quando o Windows informa.
        key: `${model.type}:${serial || info.path}`,
        state: null,
        seq: 0,
        player: -1,
      };
      dev.on('data', (data) => {
        if (data[0] === 0x11 || data[0] === 0x31) pad.bt = true;
        const st = parseReport(pad.type, data, pad.bt);
        if (st) pad.state = st;
      });
      dev.on('error', () => this.close(pad));
      this.pads.set(info.path, pad);
      // No Bluetooth, ler o relatório de calibração faz o controle mandar o relatório completo.
      try {
        await dev.getFeatureReport(model.type === 'ds4' ? 0x02 : 0x05, model.type === 'ds4' ? 37 : 41);
      } catch {}
    } catch {
      this.failed.set(info.path, Date.now());
    }
    this.opening.delete(info.path);
  }

  close(pad) {
    if (!this.pads.has(pad.path)) return;
    this.pads.delete(pad.path);
    pad.dev.close().catch(() => {});
  }

  // Lista dos controles abertos que já mandaram estado.
  read() {
    const out = [];
    for (const p of this.pads.values()) {
      if (!p.state) continue;
      out.push({ key: p.key, type: p.type, name: p.name, conn: p.bt ? 'bt' : 'usb', state: p.state });
    }
    return out;
  }

  find(key) {
    for (const p of this.pads.values()) if (p.key === key) return p;
    return null;
  }

  // Luz do jogador (barra de luz + LEDs do DualSense) e vibração.
  output(key, { player = -1, strong = 0, weak = 0 } = {}) {
    const p = this.find(key);
    if (!p) return;
    if (player !== null) p.player = player;
    const [r, g, b] = PLAYER_COLORS[p.player] || [40, 40, 40];
    let report;
    if (p.type === 'ds4') {
      const common = [0x07, 0x00, 0x00, Math.round(weak * 255), Math.round(strong * 255), r, g, b, 0, 0];
      if (p.bt) {
        report = Buffer.alloc(78);
        report[0] = 0x11;
        report[1] = 0xc0;
        Buffer.from(common).copy(report, 3);
        withCrc(report);
      } else {
        report = Buffer.alloc(32);
        report[0] = 0x05;
        Buffer.from(common).copy(report, 1);
      }
    } else {
      const common = Buffer.alloc(47);
      common[0] = 0x03; // vibração compatível + seleção dos motores
      common[1] = 0x04 | 0x10; // barra de luz + LEDs de jogador
      common[2] = Math.round(weak * 255);
      common[3] = Math.round(strong * 255);
      common[38] = 0x02; // controle do setup da barra de luz
      common[41] = 0x02; // apaga a animação azul inicial
      common[43] = PLAYER_LEDS[p.player] || 0;
      common[44] = r;
      common[45] = g;
      common[46] = b;
      if (p.bt) {
        report = Buffer.alloc(78);
        report[0] = 0x31;
        report[1] = (p.seq++ & 0x0f) << 4;
        report[2] = 0x10;
        common.copy(report, 3);
        withCrc(report);
      } else {
        report = Buffer.alloc(48);
        report[0] = 0x02;
        common.copy(report, 1);
      }
    }
    p.dev.write([...report]).catch(() => {});
  }
}

module.exports = { HidPads, parseReport };
