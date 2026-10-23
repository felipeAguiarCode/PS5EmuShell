// Gerenciador de controles: junta XInput (Xbox e compatíveis) e HID (DualShock 4 / DualSense),
// distribui os controles em até 4 slots de jogador e transforma o estado em eventos de botão.
// Os slots ficam em data/controllers.json (gravado só pelo main, separado do config.json).
const { EventEmitter } = require('events');
const paths = require('./paths');
const { readJson, writeJson } = require('./config');
const { XInput } = require('./xinput');
const { HidPads } = require('./hidpads');

const POLL_MS = 8;
const SLOTS = 4;
const REPEATABLE = new Set(['up', 'down', 'left', 'right', 'lt', 'rt']);
const STICK_NAV = 0.5;
const TRIGGER_PRESS = 0.4;
const XINPUT_NAMES = 'Controle Xbox';

const file = () => paths.file('controllers.json');

class Controllers extends EventEmitter {
  constructor() {
    super();
    this.xinput = new XInput();
    this.hid = new HidPads();
    this.devices = new Map(); // key → { key, type, name, conn, state, held }
    this.prev = new Set();
    this.repeat = {};
    this.lastType = null;
    const saved = readJson(file(), {});
    this.settings = {
      autoAssign: saved.autoAssign !== false,
      slots: Array.from({ length: SLOTS }, (_, i) => (saved.slots && saved.slots[i]) || null),
    };
  }

  get available() {
    return this.xinput.available || this.hid.available;
  }

  start() {
    if (this.timer) return;
    this.hid.start();
    this.timer = setInterval(() => this.poll(), POLL_MS);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.hid.stop();
  }

  save() {
    writeJson(file(), this.settings);
  }

  connectedCount() {
    return this.devices.size;
  }

  // Botões "de navegação" de um controle: botões + gatilhos e analógico esquerdo como direcionais.
  navSet(st) {
    const s = new Set(st.buttons);
    if (st.lt > TRIGGER_PRESS) s.add('lt');
    if (st.rt > TRIGGER_PRESS) s.add('rt');
    if (st.lx < -STICK_NAV) s.add('left');
    if (st.lx > STICK_NAV) s.add('right');
    if (st.ly < -STICK_NAV) s.add('up');
    if (st.ly > STICK_NAV) s.add('down');
    return s;
  }

  poll() {
    const now = Date.now();
    const seen = new Map();
    this.xinput.read().forEach((state, i) => {
      if (state) seen.set(`xinput:${i}`, { key: `xinput:${i}`, type: 'xbox', name: XINPUT_NAMES, conn: 'xinput', index: i, state });
    });
    for (const d of this.hid.read()) seen.set(d.key, d);
    // Controles simulados pelo devsnap (testes sem controle físico).
    if (this.fake) for (const d of this.fake) seen.set(d.key, { ...d, state: { ...d.state, buttons: new Set(d.state.buttons) } });

    for (const [key, d] of seen) {
      const cur = this.devices.get(key);
      if (cur) {
        cur.state = d.state;
        cur.conn = d.conn;
      } else {
        d.held = new Set();
        this.devices.set(key, d);
        this.onConnect(d);
      }
    }
    for (const [key, d] of this.devices) {
      if (seen.has(key)) continue;
      this.devices.delete(key);
      this.emit('disconnect', this.info(d));
      this.emit('change');
    }

    // Cada controle: botões novos (para autodetectar e para o estilo de ícones automático).
    const all = new Set();
    for (const d of this.devices.values()) {
      const held = this.navSet(d.state);
      for (const b of held) {
        all.add(b);
        if (d.held.has(b)) continue;
        if (this.lastType !== d.type) {
          this.lastType = d.type;
          this.emit('active', d.type);
        }
        if (this.detecting) {
          const done = this.detecting;
          this.detecting = null;
          done(this.info(d));
        }
      }
      d.held = held;
    }

    // Navegação do launcher: qualquer controle conectado, com repetição nos direcionais.
    for (const k of all) {
      if (!this.prev.has(k)) {
        this.repeat[k] = { next: now + 340, count: 0 };
        this.emit('press', k, false);
      } else if (REPEATABLE.has(k) && now >= this.repeat[k].next) {
        const rep = this.repeat[k];
        rep.count++;
        rep.next = now + Math.max(40, 115 - rep.count * 9);
        this.emit('press', k, true);
      }
    }
    for (const k of this.prev) if (!all.has(k)) this.emit('release', k);
    this.prev = all;

    if (this.watching) {
      const d = this.devices.get(this.watching);
      this.emit('state', d ? { key: d.key, connected: true, ...d.state, buttons: [...d.state.buttons] } : { key: this.watching, connected: false });
    }
  }

  // Combos (fechar jogo / voltar ao launcher) valem quando segurados num mesmo controle.
  heldSets() {
    return [...this.devices.values()].map((d) => d.held);
  }

  slotOf(key) {
    return this.settings.slots.findIndex((s) => s && s.key === key);
  }

  // Todo controle novo entra sozinho no próximo slot livre (vazio ou com um controle que não está conectado).
  onConnect(d) {
    let slot = this.slotOf(d.key);
    if (slot < 0 && this.settings.autoAssign) {
      slot = this.settings.slots.findIndex((s) => !s);
      if (slot < 0) slot = this.settings.slots.findIndex((s) => !this.devices.has(s.key));
      if (slot >= 0) this.settings.slots[slot] = { key: d.key, type: d.type, name: d.name };
    } else if (slot >= 0) {
      this.settings.slots[slot] = { key: d.key, type: d.type, name: d.name };
    }
    if (slot >= 0) this.save();
    this.updateLights();
    this.emit('connect', this.info(d));
    this.emit('change');
  }

  info(d) {
    const slot = this.slotOf(d.key);
    return { key: d.key, type: d.type, name: d.name, conn: d.conn, slot, count: this.devices.size };
  }

  // Coloca um controle num slot. Se ele já estava em outro, os dois trocam de lugar.
  assign(slot, key) {
    const d = this.devices.get(key);
    const s = this.settings.slots;
    const from = this.slotOf(key);
    const entry = d ? { key, type: d.type, name: d.name } : s[from];
    if (!entry || slot < 0 || slot >= SLOTS) return this.list();
    if (from >= 0) s[from] = s[slot];
    s[slot] = entry;
    this.save();
    this.updateLights();
    this.emit('change');
    return this.list();
  }

  clear(slot) {
    this.settings.slots[slot] = null;
    this.save();
    this.updateLights();
    this.emit('change');
    return this.list();
  }

  setAutoAssign(on) {
    this.settings.autoAssign = !!on;
    // Ligou: quem está conectado sem slot já entra agora.
    if (on) for (const d of this.devices.values()) if (this.slotOf(d.key) < 0) this.onConnect(d);
    this.save();
    this.emit('change');
    return this.list();
  }

  // Autodetectar: o próximo controle que apertar um botão.
  detect(timeoutMs = 15000) {
    this.cancelDetect();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.detecting = null;
        resolve(null);
      }, timeoutMs);
      this.detecting = (info) => {
        clearTimeout(timer);
        resolve(info);
      };
      this.detectCancel = () => {
        clearTimeout(timer);
        resolve(null);
      };
    });
  }

  cancelDetect() {
    if (!this.detecting) return;
    this.detecting = null;
    this.detectCancel();
  }

  // Tela de teste: transmite o estado bruto de um controle enquanto ela estiver aberta.
  watch(key) {
    this.watching = key || null;
  }

  // Barra de luz/LEDs do controle de PlayStation com a cor do jogador.
  updateLights() {
    for (const d of this.devices.values()) if (d.conn !== 'xinput') this.hid.output(d.key, { player: this.slotOf(d.key) });
  }

  // Vibra o controle por um instante, para identificar qual é qual.
  rumble(key) {
    const d = this.devices.get(key);
    if (!d) return false;
    if (d.conn === 'xinput') {
      this.xinput.rumble(d.index, 0.7, 0.5);
      setTimeout(() => this.xinput.rumble(d.index, 0, 0), 450);
    } else {
      this.hid.output(key, { player: null, strong: 0.7, weak: 0.5 });
      setTimeout(() => this.hid.output(key, { player: null }), 450);
    }
    return true;
  }

  list() {
    const slots = this.settings.slots.map((s, i) => {
      if (!s) return { slot: i, empty: true };
      const d = this.devices.get(s.key);
      return { slot: i, key: s.key, type: s.type, name: s.name, connected: !!d, conn: d ? d.conn : null };
    });
    const unassigned = [...this.devices.values()].filter((d) => this.slotOf(d.key) < 0).map((d) => this.info(d));
    return {
      slots,
      unassigned,
      autoAssign: this.settings.autoAssign,
      lastType: this.lastType,
      sources: {
        xinput: { available: this.xinput.available, error: this.xinput.error || null },
        hid: { available: this.hid.available, error: this.hid.error || null },
      },
    };
  }
}

module.exports = { Controllers };
