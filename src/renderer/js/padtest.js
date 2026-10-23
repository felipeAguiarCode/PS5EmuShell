/* Controles: diagrama do controle (Xbox, DualShock 4, DualSense), tela de teste e autodetectar. */

const PAD_TYPES = {
  xbox: { name: 'Xbox / XInput', glyphs: 'xbox' },
  ds4: { name: 'DualShock 4', glyphs: 'playstation' },
  dualsense: { name: 'DualSense', glyphs: 'playstation' },
};
// Cores dos jogadores 1–4 (as mesmas da barra de luz dos controles de PlayStation).
const PLAYER_COLORS = ['#2f6bff', '#ff3b3b', '#22c55e', '#ff4fb0'];

// Ícone pequeno do tipo de controle (para as linhas dos slots).
function padIcon(type) {
  return type === 'xbox'
    ? Icons.gamepad
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 6h9c2.2 0 3.7 1.6 4.1 3.8l1 5.6c.4 2.2-.9 3.6-2.4 3.6-1.2 0-2-.8-2.7-1.9L15.4 15H8.6l-1.1 2.1C6.8 18.2 6 19 4.8 19c-1.5 0-2.8-1.4-2.4-3.6l1-5.6C3.8 7.6 5.3 6 7.5 6z"/><rect x="9.4" y="7.6" width="5.2" height="3.2" rx=".8"/><circle cx="9" cy="13.3" r="1.2"/><circle cx="15" cy="13.3" r="1.2"/></svg>';
}

const PadDiagram = {
  // Desenho original e simplificado; os elementos com data-b acendem quando pressionados.
  svg(type) {
    const ps = type !== 'xbox';
    const body = ps
      ? 'M150 92C205 72 435 72 490 92C560 104 600 172 615 262C628 342 600 386 560 386C522 386 500 346 470 304H170C140 346 118 386 80 386C40 386 12 342 25 262C40 172 80 104 150 92Z'
      : 'M170 92C220 76 420 76 470 92C545 108 590 175 610 268C625 345 595 388 552 388C512 388 490 350 462 318C420 300 220 300 178 318C150 350 128 388 88 388C45 388 15 345 30 268C50 175 95 108 170 92Z';
    const P = ps
      ? { dpad: [150, 178], face: [490, 178], ls: [242, 258], rs: [398, 258], back: [212, 112], start: [428, 112], guide: [320, 222] }
      : { dpad: [242, 262], face: [478, 168], ls: [168, 168], rs: [398, 262], back: [276, 168], start: [364, 168], guide: [320, 116] };
    const [dx, dy] = P.dpad;
    const arm = (b, x, y, w, h) => `<rect class="pd-btn" data-b="${b}" x="${x}" y="${y}" width="${w}" height="${h}" rx="5"/>`;
    const dpad =
      arm('up', dx - 13, dy - 44, 26, 32) + arm('down', dx - 13, dy + 12, 26, 32) + arm('left', dx - 44, dy - 13, 32, 26) + arm('right', dx + 12, dy - 13, 32, 26) +
      `<rect class="pd-hub" x="${dx - 13}" y="${dy - 13}" width="26" height="26"/>`;
    const [fx, fy] = P.face;
    const faceSym = {
      y: ps ? `<path d="M0 -9L8 6H-8Z"/>` : `<text>Y</text>`,
      b: ps ? `<circle r="8"/>` : `<text>B</text>`,
      a: ps ? `<path d="M-7 -7L7 7M7 -7L-7 7"/>` : `<text>A</text>`,
      x: ps ? `<rect x="-7" y="-7" width="14" height="14"/>` : `<text>X</text>`,
    };
    const face = [['y', 0, -36], ['b', 36, 0], ['a', 0, 36], ['x', -36, 0]]
      .map(([b, ox, oy]) => `<g class="pd-face" transform="translate(${fx + ox} ${fy + oy})"><circle class="pd-btn" data-b="${b}" r="19"/><g class="pd-sym pd-${b}">${faceSym[b]}</g></g>`)
      .join('');
    const stick = (b, [x, y]) =>
      `<g class="pd-stick" data-stick="${b}" transform="translate(${x} ${y})"><circle class="pd-well" r="38"/><circle class="pd-range" r="24"/>` +
      `<g class="pd-cap"><circle class="pd-btn" data-b="${b}" r="20"/><text>${b === 'ls' ? (ps ? 'L3' : 'LS') : ps ? 'R3' : 'RS'}</text></g></g>`;
    const pill = (b, [x, y], label) => `<g transform="translate(${x} ${y})"><rect class="pd-btn" data-b="${b}" x="-17" y="-9" width="34" height="18" rx="9"/><text class="pd-small" y="28">${label}</text></g>`;
    const shoulder = (b, x, label) => `<g transform="translate(${x} 58)"><rect class="pd-btn" data-b="${b}" width="96" height="18" rx="9"/><text class="pd-small" x="48" y="13">${label}</text></g>`;
    const trigger = (b, x, label) =>
      `<g transform="translate(${x} 14)"><rect class="pd-trig" width="96" height="30" rx="10"/><rect class="pd-fill" data-t="${b}" width="0" height="30" rx="10"/>` +
      `<rect class="pd-btn pd-ghost" data-b="${b}" width="96" height="30" rx="10"/><text class="pd-small" x="48" y="20">${label}</text></g>`;
    const center = ps
      ? `<rect class="pd-btn pd-pad" data-b="touchpad" x="246" y="98" width="148" height="82" rx="14"/><text class="pd-small" x="320" y="144">touchpad</text>` +
        `<circle class="pd-btn" data-b="guide" cx="${P.guide[0]}" cy="${P.guide[1]}" r="13"/><text class="pd-small" x="${P.guide[0]}" y="${P.guide[1] + 4}">PS</text>` +
        (type === 'dualsense' ? `<rect class="pd-btn" data-b="mute" x="308" y="242" width="24" height="9" rx="4.5"/>` : '')
      : `<circle class="pd-btn" data-b="guide" cx="${P.guide[0]}" cy="${P.guide[1]}" r="17"/><text class="pd-small" x="${P.guide[0]}" y="${P.guide[1] + 4}">Guia</text>`;
    const names = ps ? ['L1', 'R1', 'L2', 'R2', type === 'ds4' ? 'SHARE' : 'CREATE', 'OPTIONS'] : ['LB', 'RB', 'LT', 'RT', 'EXIBIR', 'MENU'];
    return (
      `<svg class="pad-diagram" viewBox="0 0 640 400" aria-hidden="true">` +
      trigger('lt', 104, names[2]) + trigger('rt', 440, names[3]) +
      shoulder('lb', 104, names[0]) + shoulder('rb', 440, names[1]) +
      `<path class="pd-body" d="${body}"/>` +
      center + pill('back', P.back, names[4]) + pill('start', P.start, names[5]) +
      dpad + face + stick('ls', P.ls) + stick('rs', P.rs) +
      `</svg>`
    );
  },

  buttons(type) {
    const list = ['up', 'down', 'left', 'right', 'a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'ls', 'rs', 'back', 'start', 'guide', 'lstick', 'rstick'];
    if (type !== 'xbox') list.push('touchpad');
    if (type === 'dualsense') list.push('mute');
    return list;
  },
};

const PadTest = {
  cur: null,

  label(b, type) {
    const ps = type !== 'xbox';
    const extra = { up: '↑', down: '↓', left: '←', right: '→', lstick: 'Analógico esq.', rstick: 'Analógico dir.', touchpad: 'Touchpad', mute: 'Mudo' };
    if (extra[b]) return extra[b];
    return BUTTON_NAMES[ps ? 'playstation' : 'xbox'][b] || b;
  },

  // Tela de teste: diagrama ao vivo + lista do que já foi testado.
  // Segurar ○/B por 1,5 s (ou Esc / clique em Fechar) sai, já que todos os botões estão sendo testados.
  async open(dev) {
    const type = dev.type || 'xbox';
    const all = PadDiagram.buttons(type);
    const html =
      `<div class="pt-head"><div class="pt-ico">${padIcon(type)}</div><div><h3>Testar controle</h3>` +
      `<div class="sub">${esc(dev.name || PAD_TYPES[type].name)}${dev.slot >= 0 ? ` · Jogador ${dev.slot + 1}` : ''}</div></div>` +
      `<div class="pt-count"><b>0</b> de ${all.length} testados</div></div>` +
      `<div class="pt-body"><div class="pt-stage">${PadDiagram.svg(type)}<div class="pt-off hidden">Controle desconectado</div></div>` +
      `<div class="pt-side">` +
      `<div class="pt-k">Pressionados agora</div><div class="pt-now">—</div>` +
      `<div class="pt-k">Analógicos</div><div class="pt-axes"></div>` +
      `<div class="pt-k">Botões</div><div class="pt-list">${all.map((b) => `<span data-c="${b}">${esc(this.label(b, type))}</span>`).join('')}</div>` +
      `</div></div>` +
      `<div class="pt-foot"><div class="pt-exit"><i></i><span>Segure ${glyph('b')} para sair</span></div>` +
      `<button class="btn-pill focusable" data-group="pt" data-v="rumble">Vibrar</button><button class="btn-pill focusable" data-group="pt" data-v="close">Fechar</button></div>`;
    this.cur = { dev, type, all, tested: new Set(), holdSince: 0, box: null };
    api.invoke('pads:watch', dev.key);
    await Modal.open({
      className: 'pad-test',
      html,
      hints: [['b', 'Segure para sair']],
      onButton: () => true, // todas as entradas vão para o teste
      onKey: (e) => {
        if (e.key === 'Escape') Modal.close();
        return true;
      },
      onMount: (box) => {
        this.cur.box = box;
        box.addEventListener('click', (e) => {
          const b = e.target.closest('[data-v]');
          if (!b) return;
          if (b.dataset.v === 'rumble') api.invoke('pads:rumble', dev.key);
          else Modal.close();
        });
      },
    });
    api.invoke('pads:watch', null);
    this.cur = null;
  },

  onState(st) {
    const c = this.cur;
    if (!c || !c.box || st.key !== c.dev.key) return;
    const box = c.box;
    $('.pt-off', box).classList.toggle('hidden', st.connected);
    if (!st.connected) return;
    const on = new Set(st.buttons);
    if (st.lt > 0.05) on.add('lt');
    if (st.rt > 0.05) on.add('rt');
    for (const el of $$('[data-b]', box)) el.classList.toggle('on', on.has(el.dataset.b));
    // Gatilhos analógicos: barra proporcional.
    for (const el of $$('[data-t]', box)) el.setAttribute('width', Math.round(96 * (st[el.dataset.t] || 0)));
    // Analógicos: a tampa acompanha o eixo.
    for (const g of $$('[data-stick]', box)) {
      const s = g.dataset.stick === 'ls' ? [st.lx, st.ly] : [st.rx, st.ry];
      $('.pd-cap', g).setAttribute('transform', `translate(${(s[0] * 18).toFixed(1)} ${(s[1] * 18).toFixed(1)})`);
    }
    // Contabiliza o que já foi testado (gatilhos e analógicos precisam ir até o fim).
    for (const b of st.buttons) c.tested.add(b);
    if (st.lt > 0.9) c.tested.add('lt');
    if (st.rt > 0.9) c.tested.add('rt');
    if (Math.hypot(st.lx, st.ly) > 0.9) c.tested.add('lstick');
    if (Math.hypot(st.rx, st.ry) > 0.9) c.tested.add('rstick');
    for (const el of $$('.pt-list [data-c]', box)) el.classList.toggle('ok', c.tested.has(el.dataset.c));
    const done = c.all.filter((b) => c.tested.has(b)).length;
    $('.pt-count b', box).textContent = done;
    $('.pt-count', box).classList.toggle('all', done === c.all.length);
    const now = st.buttons.map((b) => this.label(b, c.type));
    if (st.lt > 0.05) now.push(`${this.label('lt', c.type)} ${Math.round(st.lt * 100)}%`);
    if (st.rt > 0.05) now.push(`${this.label('rt', c.type)} ${Math.round(st.rt * 100)}%`);
    $('.pt-now', box).textContent = now.length ? [...new Set(now)].join('  ') : '—';
    const f = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2);
    $('.pt-axes', box).innerHTML =
      `<span>Esq.</span><span>X ${f(st.lx)}</span><span>Y ${f(st.ly)}</span>` +
      `<span>Dir.</span><span>X ${f(st.rx)}</span><span>Y ${f(st.ry)}</span>`;
    // Sair: segurar B (círculo) por 1,5 s.
    const holding = on.has('b');
    if (holding && !c.holdSince) c.holdSince = performance.now();
    if (!holding) c.holdSince = 0;
    const p = c.holdSince ? Math.min(1, (performance.now() - c.holdSince) / 1500) : 0;
    $('.pt-exit i', box).style.width = `${p * 100}%`;
    if (p >= 1) {
      c.holdSince = 0;
      Sound.back();
      Modal.close();
    }
  },

  // Autodetectar: espera alguém apertar um botão em qualquer controle.
  async detect(title, sub) {
    let closed = false;
    const shown = Modal.open({
      className: 'pad-detect',
      html:
        `<div class="pd-wait"><div class="pd-pulse">${Icons.gamepad}</div><h3>${esc(title)}</h3>` +
        `<div class="sub">${esc(sub || 'Pressione qualquer botão no controle.')}</div><div class="sub faint">Esc ou 15 s sem resposta para cancelar.</div></div>`,
      hints: [],
      onButton: () => true,
      onKey: (e) => {
        if (e.key === 'Escape') api.invoke('pads:cancelDetect');
        return true;
      },
    });
    shown.then(() => (closed = true));
    const dev = await api.invoke('pads:detect');
    if (!closed) Modal.close();
    return dev;
  },
};
