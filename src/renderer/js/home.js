/* Tela inicial: chips de sistema, linha horizontal de jogos e área "hero" do jogo selecionado. */
const Home = {
  el: $('#view-home'),
  row: $('#row'),
  track: $('#row-track'),
  label: $('#row-label'),
  filter: 'all',
  list: [],
  sel: 0,
  selByFilter: {},
  tiles: new Map(),
  tileSize: 124,

  init() {
    this.row.navHandler = (dir) => {
      if (dir === 'left' || dir === 'right') {
        this.select(this.sel + (dir === 'right' ? 1 : -1));
        return true;
      }
      return false;
    };
    this.row.addEventListener('navfocus', () => {
      this.layout();
      App.updateHints();
    });
    this.row.addEventListener('navblur', () => requestAnimationFrame(() => this.layout()));
    this.row.addEventListener('click', (e) => {
      const tile = e.target.closest('.tile');
      if (tile && tile.dataset.idx != null && +tile.dataset.idx !== this.sel) {
        Nav.focus(this.row, { silent: true, noScroll: true });
        this.select(+tile.dataset.idx);
        return;
      }
      this.activate();
    });
    this.row.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (Math.abs(e.deltaY) + Math.abs(e.deltaX) < 4) return;
        this.select(this.sel + ((e.deltaY || e.deltaX) > 0 ? 1 : -1));
      },
      { passive: false }
    );

    $('#chips').addEventListener('click', (e) => {
      const c = e.target.closest('.chip');
      if (!c) return;
      this.setFilter(c.dataset.filter);
      Nav.focus(this.row);
    });
    $('#chips').addEventListener('navfocus', (e) => {
      const c = e.target.closest('.chip');
      if (c) this.setFilter(c.dataset.filter);
    });
    $$('.hero-actions [data-cmd]', this.el).forEach((b) =>
      b.addEventListener('click', () => {
        const item = this.current();
        if (b.dataset.cmd === 'rescan') return App.rescan();
        if (b.dataset.cmd === 'settings') return Settings.open();
        if (!item) return;
        if (b.dataset.cmd === 'play') this.activate();
        else if (item.kind === 'game' && b.dataset.cmd === 'favorite') App.toggleFavorite(item.game);
        else if (item.kind === 'game' && b.dataset.cmd === 'options') App.gameOptions(item.game);
      })
    );
    $('[data-cmd="favorite"]', this.el).innerHTML = Icons.star;
    $('[data-cmd="options"]', this.el).innerHTML = Icons.dots;
    window.addEventListener('resize', debounce(() => this.layout(true), 100));
  },

  current() {
    return this.list[this.sel];
  },

  buildList() {
    const games = App.games.filter((g) => this.filter === 'all' || g.system === this.filter);
    games.sort((a, b) => {
      const la = App.gs(a.id).lastPlayed || 0;
      const lb = App.gs(b.id).lastPlayed || 0;
      if (la !== lb) return lb - la;
      return a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' });
    });
    this.list = games.map((g) => ({ kind: 'game', key: g.id, game: g }));
    if (games.length) this.list.push({ kind: 'library', key: '__library' });
  },

  // Reconstrói a lista mantendo a seleção (ou indo para keepId, se informado).
  refresh(keepId) {
    const prevKey = keepId || (this.current() && this.current().key);
    const systemsWithGames = new Set(App.games.map((g) => g.system));
    if (this.filter !== 'all' && !systemsWithGames.has(this.filter)) this.filter = 'all';
    this.buildList();
    const idx = this.list.findIndex((i) => i.key === prevKey);
    this.sel = idx >= 0 ? idx : 0;
    this.renderChips();
    const empty = App.games.length === 0;
    this.el.classList.toggle('empty', empty);
    $('#home-empty').classList.toggle('hidden', !empty);
    if (empty) this.renderEmpty();
    this.layout(true);
    this.updateHero(true);
  },

  renderEmpty() {
    const dirs = App.config.systems.filter((s) => s.enabled !== false).flatMap((s) => s.romDirs.map((d) => `<code>${esc(d)}</code>`));
    $('.empty-dirs').innerHTML = dirs.join('');
  },

  renderChips() {
    const counts = {};
    for (const g of App.games) counts[g.system] = (counts[g.system] || 0) + 1;
    const systems = App.config.systems.filter((s) => counts[s.id]);
    const chips = [{ id: 'all', shortName: 'Todos', color: '#fff', n: App.games.length }, ...systems.map((s) => ({ ...s, n: counts[s.id] }))];
    $('#chips').innerHTML = chips
      .map(
        (c) =>
          `<button class="chip focusable${c.id === this.filter ? ' active' : ''}" data-group="chips" data-filter="${esc(c.id)}">` +
          (c.id === 'all' ? '' : `<span class="dot" style="--c:${esc(c.color)}"></span>`) +
          `${esc(c.shortName)}<span class="count">${c.n}</span></button>`
      )
      .join('');
    // Memória de foco do grupo aponta para o chip ativo.
    Nav.memory.chips = $('#chips .chip.active');
  },

  setFilter(id) {
    if (id === this.filter) return;
    this.selByFilter[this.filter] = this.current() && this.current().key;
    this.filter = id;
    $$('#chips .chip').forEach((c) => c.classList.toggle('active', c.dataset.filter === id));
    Nav.memory.chips = $('#chips .chip.active');
    // Recria os tiles: o selo de sistema só aparece no filtro "Todos".
    for (const el of this.tiles.values()) el.remove();
    this.tiles.clear();
    this.buildList();
    const idx = this.list.findIndex((i) => i.key === this.selByFilter[id]);
    this.sel = idx >= 0 ? idx : 0;
    if (App.motion()) this.track.animate([{ opacity: 0.2, transform: 'translateX(24px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.85,.25,1)' });
    this.layout(true);
    this.updateHero(true);
  },

  cycleFilter(delta) {
    const ids = $$('#chips .chip').map((c) => c.dataset.filter);
    if (ids.length < 2) return;
    const i = (ids.indexOf(this.filter) + delta + ids.length) % ids.length;
    this.setFilter(ids[i]);
    Sound.move();
  },

  select(i) {
    if (!this.list.length) return;
    if (i < 0 || i >= this.list.length) {
      Sound.edge();
      return;
    }
    if (i === this.sel) return;
    this.sel = i;
    Sound.move();
    this.layout();
    this.updateHero();
    App.updateHints();
  },

  activate() {
    const item = this.current();
    if (!item) return;
    Sound.select();
    if (item.kind === 'library') App.setView('library');
    else App.launch(item.game, this.tiles.get(item.key));
  },

  makeTile(item, i) {
    const el = document.createElement('div');
    el.className = 'tile no-anim';
    el.dataset.key = item.key;
    if (item.kind === 'library') {
      el.classList.add('lib-tile');
      el.innerHTML = `<div class="lib-icon">${Icons.grid}</div>`;
    } else {
      const g = item.game;
      const sys = App.system(g.system);
      el.style.setProperty('--c', sys ? sys.color : '#444');
      el.innerHTML = this.tileInner(g, sys);
      if (g.cover) el.classList.add('has-img');
    }
    el.dataset.idx = i;
    return el;
  },

  tileInner(g, sys) {
    const badge = this.filter === 'all' && sys ? `<span class="badge">${esc(sys.shortName)}</span>` : '';
    return `${imgTag(g.cover, g.title)}<div class="ph"><span class="sys">${esc(sys ? sys.shortName : '')}</span>${esc(g.title)}</div>${badge}`;
  },

  layout(instant) {
    const T = (this.tileSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tile')) || 124);
    const GAP = 18;
    const stride = T + GAP;
    const focused = Nav.current === this.row;
    const s = focused ? 1.42 : 1.16;
    const big = T * s;
    const item = this.current();

    // Rótulo com o nome do jogo ao lado do tile em foco.
    let labelW = 0;
    if (focused && item) {
      const sys = item.kind === 'game' ? App.system(item.game.system) : null;
      $('.rl-title', this.label).textContent = item.kind === 'game' ? item.game.title : 'Biblioteca de jogos';
      $('.rl-sub', this.label).textContent = item.kind === 'game' ? (sys ? sys.name : '') : `${App.games.length} jogos`;
      labelW = Math.min(this.label.offsetWidth, 420) + 40;
      this.label.style.transform = `translate(${big + 26}px, ${big / 2 - this.label.offsetHeight / 2}px)`;
    }
    this.label.classList.toggle('show', focused && !!item);

    const width = this.row.clientWidth || innerWidth;
    const from = Math.max(0, this.sel - 2);
    const to = Math.min(this.list.length - 1, this.sel + Math.ceil(width / stride) + 1);
    for (const [key, el] of this.tiles) {
      const idx = +el.dataset.idx;
      if (idx < from || idx > to || !this.list[idx] || this.list[idx].key !== key) {
        el.remove();
        this.tiles.delete(key);
      }
    }
    const fresh = [];
    for (let i = from; i <= to; i++) {
      const it = this.list[i];
      let el = this.tiles.get(it.key);
      if (!el) {
        el = this.makeTile(it, i);
        this.track.appendChild(el);
        this.tiles.set(it.key, el);
        fresh.push(el);
      }
      el.dataset.idx = i;
      const x = (i - this.sel) * stride + (i > this.sel ? big - T + labelW : 0);
      el.style.transform = `translate3d(${x}px,0,0) scale(${i === this.sel ? s : 1})`;
      el.style.opacity = i < this.sel ? 0.25 : 1;
      el.classList.toggle('sel', i === this.sel);
      if (instant) el.classList.add('no-anim');
    }
    void this.track.offsetWidth;
    requestAnimationFrame(() => {
      for (const el of fresh) el.classList.remove('no-anim');
      if (instant) for (const el of this.tiles.values()) el.classList.remove('no-anim');
    });
  },

  updateHero: function (instant) {
    clearTimeout(this.heroTimer);
    const run = () => {
      const item = this.current();
      const hero = $('#hero');
      hero.classList.remove('swap');
      void hero.offsetWidth;
      hero.classList.add('swap');
      const play = $('[data-cmd="play"]', hero);
      const fav = $('[data-cmd="favorite"]', hero);
      const opt = $('[data-cmd="options"]', hero);
      if (!item) {
        App.setBackground(null);
        return;
      }
      if (item.kind === 'library') {
        hero.style.setProperty('--sys', '#555');
        $('.hero-badge', hero).textContent = 'BIBLIOTECA';
        $('.hero-title', hero).textContent = 'Biblioteca de jogos';
        $('.hero-meta', hero).innerHTML = `<span>${App.games.length} jogos instalados</span>`;
        play.textContent = 'Abrir';
        fav.classList.add('hidden');
        opt.classList.add('hidden');
        $('.hero-cards', hero).innerHTML = '';
        App.setBackground(null);
        return;
      }
      const g = item.game;
      const st = App.gs(g.id);
      const sys = App.system(g.system);
      hero.style.setProperty('--sys', sys ? sys.color : '#555');
      $('.hero-badge', hero).textContent = sys ? sys.name.toUpperCase() : g.system;
      $('.hero-title', hero).textContent = g.title;
      $('.hero-meta', hero).innerHTML = [
        st.favorite ? `<span class="star">★ Favorito</span>` : '',
        g.region ? `<span>${esc(g.region)}</span>` : '',
        st.lastPlayed || !st.playTime ? `<span>${esc(fmtAgo(st.lastPlayed))}</span>` : '',
      ].join('');
      play.textContent = 'Jogar';
      fav.classList.remove('hidden');
      opt.classList.remove('hidden');
      fav.innerHTML = st.favorite ? Icons.starFill : Icons.star;
      fav.classList.toggle('on', !!st.favorite);
      const emu = App.emulatorFor(g);
      const played = st.playTime > 0;
      $('.hero-cards', hero).innerHTML = [
        ['Tempo de jogo', played ? fmtDuration(st.playTime) : 'Nunca jogado'],
        ['Última sessão', st.lastSessionMs ? fmtDuration(st.lastSessionMs) : '—'],
        ['Sessões', st.playCount || 0],
        ['Emulador', emu ? emu.name : '—'],
      ]
        .map(([k, v]) => `<div class="card"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`)
        .join('');
      App.setBackground(g);
    };
    if (instant) run();
    else this.heroTimer = setTimeout(run, 70);
  },

  // Atualiza a arte de um jogo cujo download de capa terminou.
  updateArt(id) {
    const el = this.tiles.get(id);
    const g = App.byId.get(id);
    if (!el || !g) return;
    el.innerHTML = this.tileInner(g, App.system(g.system));
    el.classList.toggle('has-img', !!g.cover);
    const item = this.current();
    if (item && item.key === id) App.setBackground(g);
  },
};
