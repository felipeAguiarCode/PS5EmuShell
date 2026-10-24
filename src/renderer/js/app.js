/* Aplicação: estado global, entrada (controle/teclado/mouse), visões, lançamento e boot. */
const App = {
  config: null,
  stats: { games: {} },
  games: [],
  byId: new Map(),
  view: 'home',
  running: false,
  launching: false,
  booting: true,
  welcome: false,
  xinput: { available: false, count: 0 },
  paths: {},
  coverProgress: null,
  bgIdx: 0,
  bgKey: null,

  async init() {
    const data = await api.invoke('app:init');
    this.config = data.config;
    this.stats = data.stats || { games: {} };
    this.xinput = data.xinput;
    this.pads = data.pads;
    const first = [...data.pads.slots, ...data.pads.unassigned].find((s) => s.connected !== false && s.type);
    this.padType = first ? first.type : null;
    this.paths = data.paths;
    this.version = data.version;
    this.defaultSystems = data.defaultSystems;
    this.defaultOptimize = data.defaultOptimize;
    this.setGames(data.library, true);

    $('[data-cmd="add"]').innerHTML = Icons.plus;
    $('[data-cmd="search"]').innerHTML = Icons.search;
    $('[data-cmd="settings"]').innerHTML = Icons.gear;
    $('[data-cmd="power"]').innerHTML = Icons.power;
    this.applyProfile();

    FocusRing.init();
    this.applyAppearance();
    Home.init();
    Library.init();
    await Collections.init();
    Trophies.init();
    Settings.init();
    this.bindTopbar();
    this.bindEvents();
    this.bindMouse();
    this.bindKeyboard();
    if (!this.xinput.available) this.startGamepadFallback();

    this.tickClock();
    setInterval(() => this.tickClock(), 10000);

    Home.refresh();
    Library.refresh();
    this.setView('home', true);
    this.boot();
  },

  // ---------- dados ----------

  setGames(list, silent) {
    this.games = list || [];
    this.byId = new Map(this.games.map((g) => [g.id, g]));
    if (silent) return;
    Home.refresh();
    Library.refresh();
    if (this.view === 'collections') Collections.render(Nav.current && Nav.current.dataset.id);
    if (this.view === 'settings') Settings.render();
  },

  system(id) {
    return this.config.systems.find((s) => s.id === id);
  },

  gs(id) {
    return this.stats.games[id] || {};
  },

  emulatorFor(game) {
    const sys = this.system(game.system);
    if (!sys) return {};
    if (game.native) return { id: 'windows', name: 'Windows' };
    const override = this.gs(game.id).emulator;
    return sys.emulators.find((e) => e.id === override) || sys.emulators.find((e) => e.id === sys.defaultEmulator) || sys.emulators[0] || {};
  },

  async updateStats(id, patch) {
    this.stats.games[id] = await api.invoke('stats:update', id, patch);
  },

  async rescan() {
    Toast.show('Buscando jogos…', 'Lendo as pastas de ROMs.', { kind: 'scan', ms: 1800 });
    const list = await api.invoke('library:rescan');
    this.setGames(list);
    Toast.show('Biblioteca atualizada', `${list.length} ${list.length === 1 ? 'jogo encontrado' : 'jogos encontrados'}.`, { kind: 'library' });
  },

  // Configurações › Aparência: tema, animações, imagem de fundo e miniaturas.
  applyAppearance() {
    const a = this.config.appearance || {};
    const b = document.body.classList;
    b.toggle('theme-light', a.theme === 'light');
    b.toggle('no-motion', a.motion === false);
    b.toggle('no-covers', a.coverArt === false);
    b.toggle('glyph-ps', glyphStyle() === 'playstation');
    FocusRing.setEnabled(a.motion !== false);
    if (this.config.particles && a.theme !== 'light') Particles.start();
    else Particles.stop();
    this.bgKey = null;
    if (this.view === 'home' && Home.current && Home.current()) this.setBackground(Home.current().game || null);
    else this.setBackground(null);
    if (this.view === 'collections') Collections.render();
  },

  // Ícones automáticos: troca na hora quando outro tipo de controle passa a ser usado.
  setPadType(type) {
    if (!type || type === this.padType) return;
    this.padType = type;
    if (this.config.buttonGlyphs !== 'auto') return;
    document.body.classList.toggle('glyph-ps', glyphStyle() === 'playstation');
    if (Modal.top) return;
    this.updateHints();
    if (this.view === 'settings') Settings.render();
  },

  motion() {
    return !this.config.appearance || this.config.appearance.motion !== false;
  },

  async applyProfile() {
    const name = this.config.profileName || 'Jogador';
    const initial = esc(name.trim().charAt(0).toUpperCase());
    this.avatarUrl = await api.invoke('avatar:url', this.config.avatar);
    const html = this.avatarUrl ? `<img src="${esc(this.avatarUrl)}" alt="" draggable="false">` : initial;
    for (const el of [$('#top-avatar'), $('.welcome-avatar')]) {
      el.innerHTML = html;
      el.classList.toggle('has-img', !!this.avatarUrl);
    }
    $('.welcome-name').textContent = name;
  },

  // ---------- visões ----------

  setView(name, instant) {
    const prev = this.view;
    this.view = name;
    document.body.classList.remove('view-home', 'view-library', 'view-collections', 'view-trophies', 'view-settings');
    document.body.classList.add('view-' + name);
    $('#view-settings').classList.toggle('hidden', name !== 'settings');
    if (name !== 'settings') {
      for (const v of ['home', 'library', 'collections', 'trophies']) $('#view-' + v).classList.toggle('hidden', v !== name);
      $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === name));
      const el = $('#view-' + name);
      if (!instant && prev !== 'settings') {
        el.classList.remove('entering');
        void el.offsetWidth;
        el.classList.add('entering');
      }
      if (prev === 'settings') {
        Nav.scope = $('#app');
        const back = Nav.memory[{ home: 'row', library: 'grid', collections: Collections.openId ? 'cgames' : 'cgrid', trophies: Trophies.gameId ? 'ach' : 'trows' }[name]];
        if (name === 'trophies' && !(back && back.isConnected)) Trophies.show();
        Nav.setScope($('#app'), back && back.isConnected && Nav.visible(back) ? back : null);
      } else if (name === 'collections') {
        Nav.scope = $('#app');
        Collections.render();
      } else if (name === 'trophies') {
        Nav.scope = $('#app');
        Trophies.show();
      } else if (name === 'home') {
        Nav.setScope($('#app'), this.games.length ? Home.row : $('#home-empty .btn-play'));
        Home.layout(true);
        Home.updateHero(true);
      } else {
        Nav.setScope($('#app'), $('.gcard', Library.grid) || $('#lib-filters .side-item.active'));
      }
    }
    this.updateHints();
  },

  updateHints() {
    if (Modal.top) return;
    if (this.view === 'settings') return Hints.set(Settings.hints());
    const tabs = ['lt+rt', 'Abas'];
    if (this.view === 'collections') return Hints.set([...Collections.hints(), tabs]);
    if (this.view === 'trophies') return Hints.set([...Trophies.hints(), tabs]);
    const cur = Nav.current;
    const onGame = (this.view === 'home' && (cur === Home.row || (cur && cur.dataset.group === 'actions')) && Home.current() && Home.current().kind === 'game') || (cur && cur.classList.contains('gcard'));
    const h = [];
    if (onGame) h.push(['a', 'Jogar'], ['y', 'Opções'], ['x', 'Favoritar']);
    else h.push(['a', 'Selecionar']);
    h.push(['lb+rb', 'Sistema'], tabs);
    if (this.view === 'library') h.push(['b', 'Voltar']);
    Hints.set(h);
  },

  setBackground(game) {
    clearTimeout(this.bgTimer);
    this.bgTimer = setTimeout(() => this.applyBackground(game), 160);
  },

  applyBackground(game) {
    const sys = game ? this.system(game.system) : null;
    const a = this.config.appearance || {};
    // Imagem de fundo desligada (ou miniaturas desligadas): usa só o gradiente com a cor do sistema.
    const url = game && a.heroBackground !== false ? (game.snap || (a.coverArt !== false ? game.cover : null)) : null;
    const kind = game && game.snap ? 'snap' : url ? 'blurred' : 'plain';
    const key = url || (sys ? 'sys:' + sys.color : 'none');
    if (key === this.bgKey) return;
    this.bgKey = key;
    const layers = $$('.bg-layer');
    const swap = () => {
      if (this.bgKey !== key) return;
      const cur = layers[this.bgIdx];
      this.bgIdx ^= 1;
      const next = layers[this.bgIdx];
      next.classList.remove('snap', 'blurred', 'show');
      if (kind !== 'plain') next.classList.add(kind);
      next.style.backgroundImage = url
        ? `url("${url}")`
        : `radial-gradient(ellipse at 75% 20%, ${sys ? sys.color : '#1b2a55'}66 0%, transparent 60%), radial-gradient(ellipse at 10% 90%, #12204a 0%, transparent 55%)`;
      void next.offsetWidth;
      next.classList.add('show');
      cur.classList.remove('show');
    };
    if (url) {
      const img = new Image();
      img.src = url;
      img.decode().then(swap, swap);
    } else swap();
  },

  // ---------- jogos ----------

  async launch(game, fromEl) {
    if (this.running || this.launching || !game) return;
    this.launching = true;
    const rect = fromEl ? fromEl.getBoundingClientRect() : null;
    Sound.launch();
    Launch.start(game, rect);
    const res = await api.invoke('game:launch', game.id);
    if (!res.ok) {
      await wait(600);
      Launch.end();
      this.launching = false;
      Toast.show('Não foi possível iniciar o jogo', res.error, { kind: 'launchError', ms: 6500, image: game.cover });
      return;
    }
    this.stats.games[game.id] = res.stats;
    this.running = true;
    this.runningId = game.id;
    this.launching = false;
    const comboId = (this.config.killCombo.buttons || []).join('+');
    Launch.setSub(`${esc(res.emulatorName)} · segure ${glyph(comboId)} para fechar o jogo`);
    setTimeout(() => this.running && Particles.stop(), 1200);
  },

  // Launcher chamado por cima do jogo (atalho "voltar ao launcher"): menu Retomar / Fechar.
  async openOverlay() {
    if (this.overlay) return;
    this.overlay = true;
    const game = this.byId.get(this.runningId);
    const emu = game ? this.emulatorFor(game) : {};
    Launch.end();
    if (this.config.particles && this.config.appearance.theme !== 'light') Particles.start();
    Sound.open();
    const v = await Modal.open({
      className: 'overlay-menu',
      html:
        `<div class="ov-head">${game && game.cover ? `<img src="${esc(game.cover)}" alt="">` : `<span>${consoleIcon(game ? game.system : '')}</span>`}` +
        `<div><div class="ov-k">Em jogo</div><h3>${esc(game ? game.title : 'Jogo em execução')}</h3><div class="sub">${esc(emu.name || '')}</div></div></div>` +
        `<button class="menu-item focusable" data-group="ov" data-v="resume"><span class="ico">${Icons.play}</span><span>Retomar jogo</span><span class="r">${glyph((this.config.homeCombo.buttons || []).join('+'))}</span></button>` +
        `<button class="menu-item focusable" data-group="ov" data-v="kill"><span class="ico">${Icons.power}</span><span>Fechar jogo</span><span class="r">${glyph((this.config.killCombo.buttons || []).join('+'))}</span></button>`,
      hints: [['a', 'Selecionar'], ['b', 'Retomar']],
      onMount: (box) =>
        box.addEventListener('click', (e) => {
          const b = e.target.closest('[data-v]');
          if (!b) return;
          Sound.select();
          Modal.close(b.dataset.v);
        }),
    });
    if (v === '__external') return;
    if (v === 'kill') {
      this.overlay = false;
      Launch.cover(game ? game.title : '', 'Fechando o jogo…');
      api.invoke('game:kill');
    } else this.resumeGame();
  },

  // Fechado pelo próprio atalho (com o menu ainda aberto) ou ao terminar o jogo.
  closeOverlay() {
    if (!this.overlay) return;
    this.overlay = false;
    if (Modal.top && Modal.top.box.classList.contains('overlay-menu')) Modal.close('__external');
    if (this.running) this.coverForGame();
  },

  resumeGame() {
    this.overlay = false;
    this.coverForGame();
    api.invoke('game:resume');
  },

  coverForGame() {
    const game = this.byId.get(this.runningId);
    Launch.cover(game ? game.title : '', `Retomando o jogo · segure ${glyph((this.config.homeCombo.buttons || []).join('+'))} para voltar ao launcher`);
    setTimeout(() => this.running && Particles.stop(), 800);
  },

  onGameState(st) {
    if (st.running) return;
    if (this.overlay) {
      this.overlay = false;
      if (Modal.top && Modal.top.box.classList.contains('overlay-menu')) Modal.close('__external');
    }
    this.running = false;
    this.launching = false;
    if (st.stats) this.stats.games[st.id] = st.stats;
    Launch.end();
    if (this.config.particles && this.config.appearance.theme !== 'light') Particles.start();
    Home.refresh(st.id);
    Library.refresh();
    if (this.view === 'home' && Nav.scope === $('#app')) Nav.focus(Home.row, { silent: true, noScroll: true });
    const g = this.byId.get(st.id);
    const image = g && g.cover;
    if (st.error) {
      Toast.show('Erro ao executar o emulador', st.error, { kind: 'crash', ms: 7000, image });
    } else if (st.code && st.duration < 5000) {
      Toast.show('O emulador fechou inesperadamente', `Código ${st.code}. Verifique BIOS, executável e argumentos em Configurações.`, { kind: 'crash', ms: 7000, image });
    } else if (st.duration > 60000) {
      Toast.show(g ? g.title : 'Sessão encerrada', `Você jogou por ${fmtDuration(st.duration)}.`, { kind: 'session', image });
    }
  },

  async toggleFavorite(game) {
    const fav = !this.gs(game.id).favorite;
    await this.updateStats(game.id, { favorite: fav || null });
    Sound.toggle();
    Toast.show(fav ? 'Adicionado aos favoritos' : 'Removido dos favoritos', game.title, { kind: fav ? 'favAdd' : 'favRemove', ms: 2200, sound: false, image: game.cover });
    Home.updateHero(true);
    Library.renderSide();
    Library.updateArt(game.id);
  },

  async gameOptions(game) {
    if (game.native) return AddGames.options(game);
    const st = this.gs(game.id);
    const sys = this.system(game.system);
    const emu = this.emulatorFor(game);
    const inCol = this.view === 'collections' && Collections.get(Collections.openId);
    const inCount = Collections.list.filter((c) => c.games.includes(game.id)).length;
    const v = await Modal.menu({
      title: game.title,
      sub: `${sys ? sys.name : game.system} · ${game.file}`,
      items: [
        { label: 'Jogar', icon: Icons.play, value: 'play' },
        { label: st.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos', icon: Icons.star, value: 'fav' },
        { label: 'Adicionar à coleção…', icon: Icons.library, right: inCount ? `em ${inCount}` : null, value: 'collection' },
        ...(inCol ? [{ label: `Remover de “${inCol.name}”`, icon: Icons.trash, value: 'uncollect' }] : []),
        { label: 'Emulador', icon: Icons.chip, right: (emu.name || '—') + (st.emulator ? '' : ' (padrão)'), value: 'emu' },
        { label: 'Baixar capa novamente', icon: Icons.image, value: 'cover' },
        { label: 'Mostrar arquivo no Explorer', icon: Icons.folder, value: 'folder' },
        { label: 'Informações', icon: Icons.info, value: 'info' },
      ],
    });
    if (v === 'play') {
      const el = this.view === 'home' ? Home.tiles.get(game.id) : $(`#view-${this.view} .gcard[data-id="${game.id}"] .art`);
      this.launch(game, el);
    } else if (v === 'fav') this.toggleFavorite(game);
    else if (v === 'collection') Collections.addGameMenu(game);
    else if (v === 'uncollect') {
      Collections.toggleGame(inCol, game, false);
      Collections.render();
    }
    else if (v === 'emu') this.chooseEmulator(game);
    else if (v === 'cover') {
      await api.invoke('covers:fetch', [game.id], true);
      Toast.show('Buscando capa', game.title, { kind: 'cover', ms: 2500, image: game.cover });
    } else if (v === 'folder') api.invoke('path:open', game.path, true);
    else if (v === 'info') this.gameInfo(game);
  },

  async chooseEmulator(game) {
    const sys = this.system(game.system);
    if (!sys || !sys.emulators.length) return Toast.show('Nenhum emulador configurado', sys ? sys.name : '', { kind: 'emuMissing' });
    const st = this.gs(game.id);
    const def = sys.emulators.find((e) => e.id === sys.defaultEmulator) || sys.emulators[0];
    const v = await Modal.menu({
      title: 'Emulador para este jogo',
      sub: game.title,
      items: [
        { label: `Padrão do sistema (${def.name})`, value: '__default', checked: !st.emulator, icon: Icons.chip },
        ...sys.emulators.map((e) => ({ label: e.name, value: e.id, checked: st.emulator === e.id, icon: Icons.chip })),
      ],
    });
    if (!v) return;
    await this.updateStats(game.id, { emulator: v === '__default' ? null : v });
    Home.updateHero(true);
    Toast.show('Emulador alterado', `${game.title} → ${this.emulatorFor(game).name}`, { kind: 'emulator', ms: 2500, image: game.cover });
  },

  gameInfo(game) {
    const st = this.gs(game.id);
    const sys = this.system(game.system);
    const rows = [
      ['Sistema', sys ? sys.name : game.system],
      ['Arquivo', game.path],
      ['Tamanho', fmtSize(game.size)],
      ['Região', game.region || '—'],
      ['Emulador', this.emulatorFor(game).name || '—'],
      ['Tempo de jogo', st.playTime > 0 ? fmtDuration(st.playTime) : 'Nunca jogado'],
      ['Última sessão', st.lastSessionMs ? fmtDuration(st.lastSessionMs) : '—'],
      ['Sessões', st.playCount || 0],
      ['Última vez', fmtAgo(st.lastPlayed)],
    ];
    Modal.open({
      html:
        `<h3>${esc(game.title)}</h3>` +
        rows.map(([k, v]) => `<div class="menu-item" style="height:auto;padding:10px 18px"><span style="color:var(--fg-faint);width:130px;flex:none">${esc(k)}</span><span style="word-break:break-all">${esc(v)}</span></div>`).join('') +
        `<div class="modal-buttons"><button class="btn-pill focusable danger" data-group="mb" data-act="reset">${Icons.refresh} Resetar estatísticas</button>` +
        `<button class="btn-pill focusable" data-group="mb" data-act="ok">OK</button></div>`,
      initial: '[data-act="ok"]',
      onMount: (box) =>
        box.addEventListener('click', (e) => {
          const b = e.target.closest('.btn-pill');
          if (!b) return;
          if (b.dataset.act === 'reset') this.resetStats(game);
          else Modal.close();
        }),
    });
  },

  // Zera tempo de jogo, sessões e "última vez" do jogo (favorito e emulador escolhido continuam).
  async resetStats(game) {
    if (this.running && this.runningId === game.id) return Toast.show('Jogo em execução', 'Feche o jogo antes de resetar as estatísticas.', { kind: 'error' });
    const ok = await Modal.confirm('Resetar estatísticas?', `Tempo de jogo, sessões e a data da última vez de “${game.title}” voltam a zero. Isso não pode ser desfeito.`, { ok: 'Resetar' });
    if (!ok) return;
    await this.updateStats(game.id, { playTime: null, lastSessionMs: null, playCount: null, lastPlayed: null, session: null });
    Modal.close(); // fecha as informações antigas
    Home.refresh();
    Library.refresh();
    Toast.show('Estatísticas resetadas', game.title, { kind: 'success', image: game.cover });
    this.gameInfo(game);
  },

  async powerMenu() {
    const v = await Modal.menu({
      title: 'Energia',
      items: [
        { label: 'Sair do launcher', icon: Icons.exit, value: 'quit' },
        { label: 'Buscar jogos novamente', icon: Icons.refresh, value: 'rescan' },
        { label: 'Alternar tela cheia', icon: Icons.expand, value: 'fs' },
      ],
    });
    if (v === 'quit') this.quit();
    else if (v === 'rescan') this.rescan();
    else if (v === 'fs') api.invoke('window:fullscreen');
  },

  quit() {
    document.body.style.transition = 'opacity .4s';
    document.body.style.opacity = 0;
    setTimeout(() => api.invoke('app:quit'), 380);
  },

  // ---------- entrada ----------

  bindTopbar() {
    $$('.tab').forEach((t) =>
      t.addEventListener('click', () => {
        if (this.view !== t.dataset.view) {
          Sound.select();
          this.setView(t.dataset.view);
        }
      })
    );
    $('[data-cmd="add"]').addEventListener('click', () => AddGames.menu());
    $('[data-cmd="search"]').addEventListener('click', () => Library.search());
    $('[data-cmd="settings"]').addEventListener('click', () => Settings.open());
    $('[data-cmd="power"]').addEventListener('click', () => this.powerMenu());
    $('#app').addEventListener('navfocus', () => this.updateHints());
    $('#welcome').addEventListener('click', () => this.dismissWelcome());
  },

  bindEvents() {
    api.on('input', ({ button, repeat }) => this.handleButton(button, repeat));
    api.on('library', (list) => this.setGames(list));
    api.on('game:state', (st) => this.onGameState(st));
    api.on('game:overlay', ({ open }) => (open ? this.openOverlay() : this.closeOverlay()));
    api.on('cover', ({ id, cover, snap }) => {
      const g = this.byId.get(id);
      if (!g) return;
      g.cover = cover;
      g.snap = snap;
      Home.updateArt(id);
      Library.updateArt(id);
      Collections.updateArt(id);
    });
    api.on('covers:progress', (p) => {
      this.coverProgress = p;
      if (this.view === 'settings') Settings.updateProgress();
    });
    api.on('pad', (p) => {
      this.xinput.count = p.count;
      const where = p.slot >= 0 ? `Jogador ${p.slot + 1}` : 'Sem slot livre';
      const conn = { usb: 'USB', bt: 'Bluetooth' }[p.conn];
      Toast.show(p.connected ? 'Controle conectado' : 'Controle desconectado', [p.name, conn, where].filter(Boolean).join(' · '), { kind: p.connected ? 'padOn' : 'padOff', ms: 2600 });
      if (p.connected && !this.running) this.setPadType(p.type);
    });
    api.on('pads:changed', (list) => {
      this.pads = list;
      if (this.view === 'settings' && Settings.page === 'controls' && !Modal.top) Settings.render();
    });
    api.on('pads:active', (type) => this.setPadType(type));
    api.on('pads:state', (st) => PadTest.onState(st));
  },

  handleButton(btn, repeat) {
    if (this.booting) return;
    if (this.welcome) {
      if (btn === 'a' && !repeat) this.dismissWelcome();
      return;
    }
    if ((this.running && !this.overlay) || this.launching) return;
    if (Modal.top) {
      if (Modal.handleButton(btn)) return;
      if (['up', 'down', 'left', 'right'].includes(btn)) Nav.move(btn);
      else if (btn === 'a') Nav.activate();
      return;
    }
    if (['up', 'down', 'left', 'right'].includes(btn)) {
      Nav.move(btn);
      return;
    }
    if (repeat) return;
    if (this.view === 'settings') {
      if (Settings.handleButton(btn)) return;
      if (btn === 'a') Nav.activate();
      return;
    }
    if (btn === 'lt' || btn === 'rt') {
      this.cycleTab(btn === 'rt' ? 1 : -1);
      return;
    }
    if (this.view === 'library' && Library.handleButton(btn)) return;
    if (this.view === 'collections' && Collections.handleButton(btn)) return;
    if (this.view === 'trophies' && Trophies.handleButton(btn)) return;

    const game = this.focusedGame();
    switch (btn) {
      case 'a':
        Nav.activate();
        break;
      case 'b':
        if (this.view === 'library' || this.view === 'collections' || this.view === 'trophies') {
          Sound.back();
          this.setView('home');
        } else if (Nav.current !== Home.row && this.games.length) {
          Sound.back();
          Nav.focus(Home.row, { silent: true });
        }
        break;
      case 'y':
        if (game) this.gameOptions(game);
        break;
      case 'x':
        if (game) this.toggleFavorite(game);
        break;
      case 'lb':
      case 'rb':
        if (this.view === 'home') Home.cycleFilter(btn === 'rb' ? 1 : -1);
        break;
      case 'start':
        Settings.open();
        break;
      case 'back':
        Library.search();
        break;
      case 'guide':
        if (this.view !== 'home') this.setView('home');
        break;
    }
  },

  // L2/R2 (LT/RT): aba anterior/próxima — Jogos, Biblioteca, Coleções, Troféus.
  // O foco vai direto para o conteúdo da aba, não para a barra superior.
  cycleTab(step) {
    const tabs = ['home', 'library', 'collections', 'trophies'];
    const next = tabs[tabs.indexOf(this.view) + step];
    if (!next) return Sound.edge();
    Sound.move();
    this.setView(next);
  },

  focusedGame() {
    const cur = Nav.current;
    if (!cur) return null;
    if (cur.classList.contains('gcard')) return this.byId.get(cur.dataset.id);
    if (this.view === 'home' && (cur === Home.row || cur.dataset.group === 'actions')) {
      const it = Home.current();
      return it && it.kind === 'game' ? it.game : null;
    }
    return null;
  },

  bindKeyboard() {
    const map = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      Enter: 'a', Escape: 'b', Backspace: 'b',
      q: 'lb', e: 'rb', f: 'x', o: 'y', F1: 'start', PageUp: 'lt', PageDown: 'rt', Home: 'guide',
    };
    window.addEventListener('keydown', (e) => {
      if (Modal.top && Modal.top.onKey && Modal.top.onKey(e)) {
        e.preventDefault();
        return;
      }
      if (e.target.tagName === 'INPUT') return;
      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        return this.handleButton('back', false);
      }
      const btn = map[e.key] || map[e.key.toLowerCase()];
      if (!btn) return;
      e.preventDefault();
      this.handleButton(btn, e.repeat && !['up', 'down', 'left', 'right'].includes(btn));
    });
  },

  // O cursor só aparece quando o mouse se move de verdade e some depois de parado.
  bindMouse() {
    let lastX = -1;
    let lastY = -1;
    let timer = null;
    const body = document.body;
    window.addEventListener('mousemove', (e) => {
      if (Math.abs(e.screenX - lastX) + Math.abs(e.screenY - lastY) < 3) return;
      const first = lastX < 0;
      lastX = e.screenX;
      lastY = e.screenY;
      if (first) return;
      body.classList.remove('cursor-hidden');
      clearTimeout(timer);
      timer = setTimeout(() => body.classList.add('cursor-hidden'), 2200);
    });
    document.addEventListener('mouseover', (e) => {
      if (body.classList.contains('cursor-hidden')) return;
      const el = e.target.closest('.focusable');
      if (!el || el === Home.row || el === Nav.current || !Nav.scope.contains(el)) return;
      if (el.closest('#set-nav') || el.closest('#lib-filters') || el.closest('#chips')) return; // evita trocar de página só ao passar o mouse
      Nav.focus(el, { silent: true, noScroll: true });
    });
  },

  // Alternativa via Gamepad API, caso a DLL XInput não carregue.
  startGamepadFallback() {
    const MAP = { 0: 'a', 1: 'b', 2: 'x', 3: 'y', 4: 'lb', 5: 'rb', 6: 'lt', 7: 'rt', 8: 'back', 9: 'start', 10: 'ls', 11: 'rs', 12: 'up', 13: 'down', 14: 'left', 15: 'right', 16: 'guide' };
    const DIRS = new Set(['up', 'down', 'left', 'right']);
    let prev = new Set();
    const rep = {};
    const loop = () => {
      const held = new Set();
      for (const pad of navigator.getGamepads()) {
        if (!pad) continue;
        pad.buttons.forEach((b, i) => b.pressed && MAP[i] && held.add(MAP[i]));
        if (pad.axes[0] < -0.5) held.add('left');
        if (pad.axes[0] > 0.5) held.add('right');
        if (pad.axes[1] < -0.5) held.add('up');
        if (pad.axes[1] > 0.5) held.add('down');
      }
      const now = performance.now();
      for (const k of held) {
        if (!prev.has(k)) {
          rep[k] = { next: now + 340, n: 0 };
          this.handleButton(k, false);
        } else if (DIRS.has(k) && now >= rep[k].next) {
          rep[k].n++;
          rep[k].next = now + Math.max(40, 115 - rep[k].n * 9);
          this.handleButton(k, true);
        }
      }
      prev = held;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  tickClock() {
    $('#clock').textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },

  // ---------- boot ----------

  async boot() {
    Sound.boot();
    await wait(2600);
    $('#boot').classList.add('out');
    document.body.classList.add('ready');
    if (this.config.showWelcome) {
      this.welcome = true;
      $('.welcome-press').innerHTML = `Pressione ${glyph('a')} para continuar`;
      $('#welcome').classList.remove('hidden');
    } else {
      Home.updateHero(true);
    }
    await wait(700);
    $('#boot').remove();
    this.booting = false;
    if (!this.welcome) this.checkSetup();
  },

  // Primeira execução: oferece criar a estrutura de pastas e baixar os emuladores que faltam.
  async checkSetup() {
    if (this.config.setupDismissed) return;
    const st = await api.invoke('setup:status');
    const dirs = st.dirs.filter((d) => !d.exists);
    const emus = st.emulators.filter((e) => !e.installed && e.downloadable);
    if (!dirs.length && !emus.length) return;
    const parts = [];
    if (dirs.length) parts.push(`${dirs.length} ${dirs.length === 1 ? 'pasta' : 'pastas'}`);
    if (emus.length) parts.push(`${emus.length} ${emus.length === 1 ? 'emulador' : 'emuladores'} (${emus.map((e) => e.name).join(', ')})`);
    const items = [];
    if (dirs.length) items.push({ label: 'Criar estrutura de pastas', icon: Icons.folder, value: 'dirs' });
    if (emus.length) items.push({ label: 'Criar pastas e baixar emuladores', icon: Icons.plus, value: 'all' });
    items.push(
      { label: 'Ver detalhes em Configurações', icon: Icons.gear, value: 'settings' },
      { label: 'Agora não', icon: Icons.clock, value: 'later' },
      { label: 'Não perguntar novamente', icon: Icons.exit, value: 'never' }
    );
    const v = await Modal.menu({
      title: 'Preparar o PS5 Emu Shell',
      sub: `Faltam ${parts.join(' e ')} em ${st.base}. O PS5 Emu Shell pode criar a mesma estrutura de bios, cores, roms, saves e screenshots.`,
      items,
    });
    if (v === 'dirs') {
      await Settings.createDirs();
    } else if (v === 'all') {
      await Settings.open('setup');
      await Settings.createDirs();
      await Settings.installMissing();
      if (this.games.length === 0) this.rescan();
    } else if (v === 'settings') {
      Settings.open('setup');
    } else if (v === 'never') {
      this.config.setupDismissed = true;
      api.invoke('config:save', this.config);
    }
  },

  dismissWelcome() {
    if (!this.welcome) return;
    this.welcome = false;
    Sound.select();
    $('#welcome').classList.add('out');
    setTimeout(() => $('#welcome').classList.add('hidden'), 650);
    Home.layout(true);
    Home.updateHero(true);
    setTimeout(() => this.checkSetup(), 700);
  },
};

App.init().catch((e) => {
  document.body.innerHTML = `<pre style="color:#f88;padding:40px;white-space:pre-wrap">Erro ao iniciar: ${esc(e.stack || e.message)}</pre>`;
});
