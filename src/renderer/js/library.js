/* Biblioteca: grade com todos os jogos, filtro por sistema, favoritos, ordenação e busca. */
const SORTS = [
  { id: 'az', label: 'Nome (A–Z)' },
  { id: 'recent', label: 'Jogados recentemente' },
  { id: 'played', label: 'Mais jogados' },
  { id: 'added', label: 'Adicionados recentemente' },
];

const Library = {
  el: $('#view-library'),
  grid: $('#lib-grid'),
  filter: 'all',
  sort: 'az',
  query: '',

  init() {
    $('#lib-filters').addEventListener('navfocus', (e) => {
      const it = e.target.closest('.side-item');
      if (it && it.dataset.filter !== this.filter) {
        this.filter = it.dataset.filter;
        this.renderSide();
        this.renderGrid();
      }
    });
    $('#lib-filters').addEventListener('click', (e) => {
      const it = e.target.closest('.side-item');
      if (!it) return;
      this.filter = it.dataset.filter;
      this.renderSide();
      this.renderGrid();
      const first = $('.gcard', this.grid);
      if (first) Nav.focus(first);
    });
    this.grid.addEventListener('click', (e) => {
      const c = e.target.closest('.gcard');
      if (!c) return;
      const g = App.byId.get(c.dataset.id);
      if (!g) return;
      Sound.select();
      App.launch(g, $('.art', c));
    });
    this.grid.addEventListener('navfocus', (e) => {
      const c = e.target.closest('.gcard');
      if (c) App.setBackground(App.byId.get(c.dataset.id));
    });
    $('#lib-sort').addEventListener('click', () => this.chooseSort());
    $('#lib-search').addEventListener('click', () => this.search());
  },

  refresh() {
    this.renderSide();
    this.renderGrid();
  },

  filtered() {
    const q = this.query.trim().toLowerCase();
    let list = App.games.filter((g) => {
      const st = App.gs(g.id);
      if (this.filter === 'fav' && !st.favorite) return false;
      if (this.filter === 'recent' && !st.lastPlayed) return false;
      if (!['all', 'fav', 'recent'].includes(this.filter) && g.system !== this.filter) return false;
      if (q && !g.title.toLowerCase().includes(q) && !g.file.toLowerCase().includes(q)) return false;
      return true;
    });
    const byTitle = (a, b) => a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' });
    const key = {
      recent: (g) => App.gs(g.id).lastPlayed || 0,
      played: (g) => App.gs(g.id).playTime || 0,
      added: (g) => g.added || 0,
    }[this.filter === 'recent' && this.sort === 'az' ? 'recent' : this.sort];
    list.sort(key ? (a, b) => key(b) - key(a) || byTitle(a, b) : byTitle);
    return list;
  },

  renderSide() {
    const counts = {};
    let fav = 0;
    let recent = 0;
    for (const g of App.games) {
      counts[g.system] = (counts[g.system] || 0) + 1;
      const st = App.gs(g.id);
      if (st.favorite) fav++;
      if (st.lastPlayed) recent++;
    }
    const items = [
      { id: 'all', label: 'Todos os jogos', icon: Icons.grid, n: App.games.length },
      { id: 'fav', label: 'Favoritos', icon: Icons.star, n: fav },
      { id: 'recent', label: 'Jogados', icon: Icons.history, n: recent },
      ...App.config.systems.filter((s) => s.enabled !== false).map((s) => ({ id: s.id, label: s.name, icon: consoleIcon(s.id), console: true, n: counts[s.id] || 0 })),
    ];
    $('#lib-filters').innerHTML = items
      .map(
        (it) =>
          `<button class="side-item focusable${it.id === this.filter ? ' active' : ''}" data-group="libnav" data-filter="${esc(it.id)}">` +
          `<span class="ico${it.console ? ' console' : ''}">${it.icon}</span>` +
          `<span>${esc(it.label)}</span><span class="n">${it.n}</span></button>`
      )
      .join('');
    Nav.memory.libnav = $('#lib-filters .side-item.active');
    const cur = items.find((i) => i.id === this.filter);
    $('#lib-heading').textContent = this.query ? `Busca: “${this.query}”` : cur ? cur.label : '';
    $('#lib-sort').innerHTML = `<span class="ico">${Icons.sort}</span>${esc(SORTS.find((s) => s.id === this.sort).label)}`;
    $('#lib-search').innerHTML = `<span class="ico">${Icons.search}</span>${this.query ? 'Editar busca' : 'Buscar'}`;
  },

  renderGrid() {
    const focusedId = Nav.current && Nav.current.classList.contains('gcard') ? Nav.current.dataset.id : null;
    const list = this.filtered();
    $('#lib-count').textContent = `${list.length} ${list.length === 1 ? 'jogo' : 'jogos'}`;
    if (!list.length) {
      this.grid.innerHTML = `<div class="lib-empty">${this.query ? 'Nenhum jogo corresponde à busca.' : 'Nenhum jogo aqui ainda.'}</div>`;
      return;
    }
    this.grid.innerHTML = list.map((g) => this.cardHtml(g)).join('');
    this.grid.scrollTop = 0;
    if (focusedId) {
      const again = $(`.gcard[data-id="${focusedId}"]`, this.grid);
      if (again) Nav.focus(again, { silent: true, instant: true });
    }
  },

  cardHtml(g) {
    const sys = App.system(g.system);
    const st = App.gs(g.id);
    return (
      `<button class="gcard focusable${g.cover ? ' has-img' : ''}" data-group="grid" data-id="${g.id}">` +
      `<div class="art" style="--c:${esc(sys ? sys.color : '#444')}">${imgTag(g.cover, g.title)}<div class="ph">${esc(g.title)}</div>` +
      `${st.favorite ? `<span class="fav">${Icons.starFill}</span>` : ''}</div>` +
      `<div class="t">${esc(g.title)}</div><div class="s">${esc(sys ? sys.shortName : g.system)}${g.region ? ' · ' + esc(g.region) : ''}${st.playTime > 0 ? ' · ' + esc(fmtDuration(st.playTime)) : ''}</div></button>`
    );
  },

  updateArt(id) {
    const c = $(`.gcard[data-id="${id}"]`, this.grid);
    const g = App.byId.get(id);
    if (!c || !g) return;
    const focused = c.classList.contains('focused');
    const tmp = document.createElement('div');
    tmp.innerHTML = this.cardHtml(g);
    const fresh = tmp.firstChild;
    c.replaceWith(fresh);
    if (focused) Nav.focus(fresh, { silent: true, noScroll: true });
  },

  cycleFilter(delta) {
    const ids = $$('#lib-filters .side-item').map((c) => c.dataset.filter);
    const i = (ids.indexOf(this.filter) + delta + ids.length) % ids.length;
    this.filter = ids[i];
    Sound.move();
    this.renderSide();
    this.renderGrid();
  },

  // Pula uma "página" de linhas na grade (LT/RT).
  page(delta) {
    const cards = $$('.gcard', this.grid);
    if (!cards.length) return;
    const cur = cards.indexOf(Nav.current);
    const cols = Math.max(1, Math.round(this.grid.clientWidth / (cards[0].offsetWidth + 26)));
    const rows = Math.max(1, Math.floor(this.grid.clientHeight / (cards[0].offsetHeight + 30)));
    const next = Math.max(0, Math.min(cards.length - 1, (cur < 0 ? 0 : cur) + delta * cols * rows));
    Nav.focus(cards[next]);
  },

  async chooseSort() {
    const v = await Modal.menu({
      title: 'Ordenar por',
      items: SORTS.map((s) => ({ label: s.label, value: s.id, checked: s.id === this.sort, icon: Icons.sort })),
    });
    if (!v) return;
    this.sort = v;
    this.refresh();
  },

  async search() {
    if (App.view !== 'library') App.setView('library');
    const before = this.query;
    const res = await Modal.keyboard({
      title: 'Buscar jogos',
      value: this.query,
      onChange: debounce((t) => {
        this.query = t;
        this.renderSide();
        this.renderGrid();
      }, 120),
    });
    this.query = res === null ? before : res;
    this.refresh();
    const first = $('.gcard', this.grid);
    if (res !== null && first) Nav.focus(first, { silent: true });
  },

  handleButton(btn) {
    if (btn === 'lb' || btn === 'rb') {
      this.cycleFilter(btn === 'rb' ? 1 : -1);
      return true;
    }
    if (btn === 'lt' || btn === 'rt') {
      this.page(btn === 'rt' ? 1 : -1);
      return true;
    }
    if (btn === 'b' && this.query) {
      this.query = '';
      Sound.back();
      this.refresh();
      return true;
    }
    return false;
  },
};
