/* Componentes de interface: notificações, modais, teclado virtual, dicas e animação de lançamento. */

// Tipos de notificação no padrão do PS5: ícone branco (ou capa do jogo), categoria acima do título.
// error = detalhe vermelho no ícone; busy = ação em andamento (barra fina indeterminada).
const TOAST_KINDS = {
  info: { icon: () => Icons.info, cat: 'PS5 Emu Shell' },
  success: { icon: () => Icons.checkCircle, cat: 'PS5 Emu Shell' },
  error: { icon: () => Icons.xCircle, cat: 'PS5 Emu Shell', error: true },
  scan: { icon: () => Icons.refresh, cat: 'Biblioteca', busy: true },
  library: { icon: () => Icons.library, cat: 'Biblioteca' },
  launchError: { icon: () => Icons.xCircle, cat: 'Jogo', error: true },
  crash: { icon: () => Icons.alert, cat: 'Emulador', error: true },
  session: { icon: () => Icons.trophy, cat: 'Sessão de jogo' },
  favAdd: { icon: () => Icons.starFill, cat: 'Favoritos' },
  favRemove: { icon: () => Icons.star, cat: 'Favoritos' },
  cover: { icon: () => Icons.image, cat: 'Capas', busy: true },
  coverClear: { icon: () => Icons.trash, cat: 'Capas' },
  emulator: { icon: () => Icons.chip, cat: 'Emulador' },
  emuMissing: { icon: () => Icons.alert, cat: 'Emulador', error: true },
  padOn: { icon: () => Icons.gamepad, cat: 'Controle' },
  padOff: { icon: () => Icons.gamepadOff, cat: 'Controle' },
  collectionNew: { icon: () => Icons.folderPlus, cat: 'Coleções' },
  collectionAdd: { icon: () => Icons.libraryPlus, cat: 'Coleções' },
  collectionRemove: { icon: () => Icons.libraryMinus, cat: 'Coleções' },
  folders: { icon: () => Icons.folderCheck, cat: 'Instalação' },
  install: { icon: () => Icons.download, cat: 'Downloads' },
  installFail: { icon: () => Icons.download, cat: 'Downloads', error: true },
  systemAdd: { icon: () => Icons.plus, cat: 'Sistema' },
  optimizing: { icon: () => Icons.gauge, cat: 'Otimização', busy: true },
  optimized: { icon: () => Icons.sparkles, cat: 'Otimização' },
  avatar: { icon: () => Icons.user, cat: 'Perfil' },
  pcAdd: { icon: () => ConsoleIcons.pc, cat: 'Jogos de PC' },
  raLogin: { icon: () => Icons.trophy, cat: 'RetroAchievements' },
  raBusy: { icon: () => Icons.trophy, cat: 'RetroAchievements', busy: true },
  raSync: { icon: () => Icons.refresh, cat: 'Troféus', busy: true },
  raError: { icon: () => Icons.trophy, cat: 'RetroAchievements', error: true },
};
const TOAST_MAX = 4;
const TOAST_GAP = 12;

const Toast = {
  // image: capa do jogo, quando a notificação é sobre um jogo (como o PS5 mostra a arte do jogo).
  show(title, text = '', { kind = 'info', ms = 4200, sound = true, image = null } = {}) {
    const k = TOAST_KINDS[kind] || TOAST_KINDS.info;
    const host = $('#toasts');
    // A mesma notificação repetida em sequência substitui a anterior em vez de empilhar.
    for (const old of $$('.toast:not(.leaving)', host)) if (old.dataset.key === title + '|' + text) this.dismiss(old, true);
    const el = document.createElement('div');
    el.className = `toast${k.error ? ' is-error' : ''}${k.busy ? ' busy' : ''}${image ? ' has-art' : ''}`;
    el.dataset.key = title + '|' + text;
    const art = image
      ? `<img src="${esc(image)}" alt="" draggable="false"><span class="ti-badge">${k.icon()}</span>`
      : k.icon();
    el.innerHTML =
      `<div class="toast-body"><div class="ti">${art}</div>` +
      `<div class="tc"><div class="tk">${esc(k.cat)}</div><div class="tt">${esc(title)}</div>${text ? `<div class="tx">${esc(text)}</div>` : ''}</div></div>` +
      (k.busy ? `<div class="tbusy"><i></i></div>` : '');
    host.appendChild(el);

    // Entrada: abre espaço (altura) e desliza da direita ao mesmo tempo.
    const h = el.offsetHeight;
    el.animate(
      [
        { height: '0px', marginBottom: '0px', opacity: 0, transform: 'translateX(48px)' },
        { height: h + 'px', marginBottom: TOAST_GAP + 'px', opacity: 1, transform: 'none' },
      ],
      { duration: App.motion() ? 460 : 1, easing: 'cubic-bezier(.2,.8,.2,1)' }
    );
    if (sound) Sound.notify();

    // Tempo de exibição (pausa com o mouse em cima).
    let left = ms;
    let started = performance.now();
    const arm = () => (el._timer = setTimeout(() => this.dismiss(el), left));
    el.addEventListener('mouseenter', () => {
      clearTimeout(el._timer);
      left -= performance.now() - started;
      el.classList.add('paused');
    });
    el.addEventListener('mouseleave', () => {
      started = performance.now();
      el.classList.remove('paused');
      arm();
    });
    el.addEventListener('click', () => this.dismiss(el));
    arm();

    const live = $$('.toast:not(.leaving)', host);
    if (live.length > TOAST_MAX) this.dismiss(live[0]);
    return el;
  },

  // Saída: esmaece/desliza e depois fecha o espaço, para as outras subirem suavemente.
  dismiss(el, fast) {
    if (!el || el.classList.contains('leaving')) return;
    el.classList.add('leaving');
    clearTimeout(el._timer);
    const h = el.offsetHeight;
    const anim = el.animate(
      [
        { height: h + 'px', marginBottom: TOAST_GAP + 'px', opacity: 1, transform: 'none' },
        { height: h + 'px', marginBottom: TOAST_GAP + 'px', opacity: 0, transform: 'translateX(48px)', offset: 0.55 },
        { height: '0px', marginBottom: '0px', opacity: 0, transform: 'translateX(48px)' },
      ],
      { duration: !App.motion() ? 1 : fast ? 260 : 780, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }
    );
    anim.onfinish = () => el.remove();
  },
};

const Hints = {
  set(list) {
    $('#hints').innerHTML = list.map(([btn, label]) => `<div class="hint">${glyph(btn)}<span>${esc(label)}</span></div>`).join('');
  },
};

const Modal = {
  stack: [],

  get top() {
    return this.stack[this.stack.length - 1];
  },

  // Abre um modal. Retorna uma Promise com o valor passado para close().
  open({ html, className = '', onButton, onKey, hints, initial, onMount }) {
    const layer = $('#modal-layer');
    layer.classList.remove('hidden', 'closing');
    const box = document.createElement('div');
    box.className = 'modal ' + className;
    box.innerHTML = html;
    layer.querySelectorAll('.modal').forEach((m) => (m.style.display = 'none'));
    layer.appendChild(box);
    return new Promise((resolve) => {
      const entry = {
        box,
        resolve,
        onButton,
        onKey,
        prevScope: Nav.scope,
        prevFocus: Nav.current,
        prevLast: Nav.last,
        prevHints: $('#hints').innerHTML,
      };
      this.stack.push(entry);
      Hints.set(hints || [['a', 'Selecionar'], ['b', 'Voltar']]);
      if (onMount) onMount(box, entry);
      Nav.setScope(box, initial ? $(initial, box) : null);
      Sound.open();
    });
  },

  close(value = null) {
    const entry = this.stack.pop();
    if (!entry) return;
    const layer = $('#modal-layer');
    entry.box.remove();
    $('#hints').innerHTML = entry.prevHints;
    if (this.stack.length) {
      this.top.box.style.display = '';
    } else {
      layer.classList.add('closing');
      setTimeout(() => {
        if (!this.stack.length) layer.classList.add('hidden');
      }, 200);
    }
    Nav.scope = entry.prevScope;
    if (entry.prevFocus && entry.prevFocus.isConnected) Nav.focus(entry.prevFocus, { silent: true, noScroll: true });
    else {
      // O item de antes foi redesenhado enquanto o modal estava aberto: volta para o equivalente.
      Nav.last = entry.prevLast;
      const back = Nav.recover();
      if (back) Nav.focus(back, { silent: true, noScroll: true });
    }
    entry.resolve(value);
  },

  handleButton(btn) {
    const top = this.top;
    if (!top) return false;
    if (top.onButton && top.onButton(btn)) return true;
    if (btn === 'b') {
      Sound.back();
      this.close(null);
      return true;
    }
    return false;
  },

  // Menu de opções: items = [{ label, icon, right, checked, value, danger }]
  menu({ title, sub, items }) {
    const html =
      `<h3>${esc(title)}</h3>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}` +
      items
        .map(
          (it, i) =>
            `<button class="menu-item focusable${it.checked ? ' checked' : ''}" data-group="menu" data-i="${i}">` +
            `<span class="ico">${it.icon || ''}</span><span>${esc(it.label)}</span>` +
            `${it.right != null ? `<span class="r">${it.checked ? '✓ ' : ''}${esc(it.right)}</span>` : it.checked ? '<span class="r">✓</span>' : ''}</button>`
        )
        .join('');
    return this.open({
      html,
      initial: items.findIndex((i) => i.checked) >= 0 ? `[data-i="${items.findIndex((i) => i.checked)}"]` : null,
      onMount: (box) =>
        box.addEventListener('click', (e) => {
          const b = e.target.closest('.menu-item');
          if (!b) return;
          Sound.select();
          const it = items[+b.dataset.i];
          this.close(it.value !== undefined ? it.value : +b.dataset.i);
        }),
    });
  },

  confirm(title, sub, { ok = 'Confirmar', cancel = 'Cancelar' } = {}) {
    return this.open({
      html: `<h3>${esc(title)}</h3><div class="sub">${esc(sub || '')}</div><div class="modal-buttons">
        <button class="btn-pill focusable" data-group="mb" data-v="0">${esc(cancel)}</button>
        <button class="btn-pill focusable" data-group="mb" data-v="1">${esc(ok)}</button></div>`,
      initial: '[data-v="1"]',
      onMount: (box) =>
        box.addEventListener('click', (e) => {
          const b = e.target.closest('[data-v]');
          if (!b) return;
          Sound.select();
          this.close(b.dataset.v === '1');
        }),
    });
  },

  // Teclado virtual navegável pelo controle. Resolve com o texto ou null se cancelado.
  // mask: mostra • no lugar dos caracteres (senhas).
  keyboard({ title = 'Digite', value = '', onChange, mask = false } = {}) {
    let text = value;
    let shift = false;
    const rows = ['1234567890', 'qwertyuiop', "asdfghjkl'", 'zxcvbnm,.-', '/\\:_()[]&!'];
    const keysHtml = () =>
      rows
        .map(
          (r, ri) =>
            `<div class="kb-row">${[...r]
              .map((ch, ci) => `<button class="key focusable" data-group="kb" data-k="${esc(ch)}" data-pos="${ri}-${ci}">${esc(shift ? ch.toUpperCase() : ch)}</button>`)
              .join('')}</div>`
        )
        .join('') +
      `<div class="kb-row">
        <button class="key wide focusable${shift ? ' on' : ''}" data-group="kb" data-act="shift">⇧ Maiúsc.</button>
        <button class="key wide focusable" data-group="kb" data-act="space">Espaço</button>
        <button class="key wide focusable" data-group="kb" data-act="del">⌫ Apagar</button>
        <button class="key wide focusable" data-group="kb" data-act="clear">Limpar</button>
        <button class="key wide ok focusable" data-group="kb" data-act="ok">${glyph('start')} Confirmar</button></div>`;

    let box;
    const render = () => {
      $('.kb-input', box).innerHTML = `<span>${esc(mask ? '•'.repeat([...text].length) : text)}</span><span class="caret"></span>`;
      if (onChange) onChange(text);
    };
    const redrawKeys = () => {
      const pos = Nav.current && (Nav.current.dataset.pos || Nav.current.dataset.act);
      $('.kb-keys', box).innerHTML = keysHtml();
      const again = $(`[data-pos="${pos}"],[data-act="${pos}"]`, box);
      if (again) Nav.focus(again, { silent: true, noScroll: true });
    };
    const type = (ch) => {
      text += ch;
      render();
    };
    const act = (a) => {
      if (a === 'shift') {
        shift = !shift;
        redrawKeys();
      } else if (a === 'space') type(' ');
      else if (a === 'del') {
        text = text.slice(0, -1);
        render();
      } else if (a === 'clear') {
        text = '';
        render();
      } else if (a === 'ok') {
        Sound.select();
        this.close(text);
        return;
      }
      Sound.toggle();
    };
    return this.open({
      className: 'kb',
      html: `<h3>${esc(title)}</h3><div class="kb-input"></div><div class="kb-keys">${keysHtml()}</div>`,
      initial: '[data-pos="1-0"]',
      // Start/Options confirma de qualquer ponto do teclado (sem precisar navegar até o botão).
      hints: [['start', 'Confirmar'], ['a', 'Digitar'], ['x', 'Apagar'], ['y', 'Espaço'], ['lt', 'Maiúsc.'], ['b', 'Cancelar']],
      onMount: (b) => {
        box = b;
        render();
        box.addEventListener('click', (e) => {
          const k = e.target.closest('.key');
          if (!k) return;
          if (k.dataset.act) act(k.dataset.act);
          else {
            type(shift ? k.dataset.k.toUpperCase() : k.dataset.k);
            Sound.toggle();
          }
        });
      },
      onButton: (btn) => {
        if (btn === 'x') act('del');
        else if (btn === 'y') act('space');
        else if (btn === 'lt') act('shift');
        else if (btn === 'start') act('ok');
        else return false;
        return true;
      },
      onKey: (e) => {
        if (e.key === 'Enter') act('ok');
        else if (e.key === 'Backspace') act('del');
        else if (e.key === 'Escape') {
          Sound.back();
          this.close(null);
        } else if (e.key.length === 1 && !e.ctrlKey) type(e.key);
        else return false;
        return true;
      },
    });
  },
};

// Animação de "abrindo jogo": a capa sai do tile e cresce até ocupar a tela.
const Launch = {
  start(game, fromRect) {
    const layer = $('#launch-layer');
    const art = $('.launch-art', layer);
    const sys = App.system(game.system);
    layer.classList.remove('hidden', 'go', 'back');
    $('.launch-title', layer).textContent = game.title;
    $('.launch-sub', layer).textContent = `Iniciando no ${App.emulatorFor(game).name || 'emulador'}…`;
    art.style.backgroundImage = game.cover
      ? `url("${game.cover}")`
      : `linear-gradient(145deg, ${sys ? sys.color : '#333'}, #000)`;
    const r = fromRect || { left: innerWidth / 2 - 90, top: innerHeight / 2 - 90, width: 180, height: 180 };
    art.style.transition = 'none';
    art.style.width = r.width + 'px';
    art.style.height = r.height + 'px';
    art.style.transform = `translate(${r.left}px, ${r.top}px)`;
    void art.offsetWidth;
    art.style.transition = '';
    const size = Math.min(innerWidth, innerHeight) * 0.42;
    const s = size / r.width;
    art.style.transform = `translate(${innerWidth / 2 - size / 2}px, ${innerHeight * 0.36 - size / 2}px) scale(${s})`;
    requestAnimationFrame(() => layer.classList.add('go'));
  },
  // Tela preta com título, usada ao retomar um jogo que estava em segundo plano.
  cover(title, sub) {
    const layer = $('#launch-layer');
    $('.launch-art', layer).style.backgroundImage = 'none';
    $('.launch-title', layer).textContent = title;
    $('.launch-sub', layer).innerHTML = sub;
    layer.classList.remove('hidden', 'back');
    requestAnimationFrame(() => layer.classList.add('go'));
  },
  setSub(html) {
    $('.launch-sub').innerHTML = html;
  },
  end() {
    const layer = $('#launch-layer');
    if (layer.classList.contains('hidden')) return;
    layer.classList.add('back');
    setTimeout(() => layer.classList.add('hidden'), 750);
  },
};
