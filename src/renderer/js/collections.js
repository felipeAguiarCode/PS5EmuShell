/* Coleções: "pastas" de jogos criadas pelo usuário (ex.: todos os Need for Speed). */
const Collections = {
  el: $('#view-collections'),
  body: $('#coll-body'),
  list: [],
  openId: null,

  async init() {
    this.list = (await api.invoke('collections:get')) || [];
    this.body.addEventListener('click', (e) => this.onClick(e));
    $('#coll-tools').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cmd]');
      if (b) this.command(b.dataset.cmd);
    });
    this.body.addEventListener('navfocus', (e) => {
      const c = e.target.closest('.gcard, .ccard');
      if (!c) return;
      const g = c.classList.contains('gcard') ? App.byId.get(c.dataset.id) : this.games(this.get(c.dataset.id))[0];
      App.setBackground(g || null);
    });
    $('.coll-back').innerHTML = Icons.chevL;
    $('.coll-back').addEventListener('click', () => this.close());
  },

  get(id) {
    return this.list.find((c) => c.id === id);
  },

  // Jogos da coleção que ainda existem na biblioteca, na ordem em que foram adicionados.
  games(col) {
    return col ? col.games.map((id) => App.byId.get(id)).filter(Boolean) : [];
  },

  save() {
    api.invoke('collections:save', this.list);
  },

  // ---------- renderização ----------

  render(focusId) {
    if (this.openId && !this.get(this.openId)) this.openId = null;
    return this.openId ? this.renderDetail(focusId) : this.renderList(focusId);
  },

  renderList(focusId) {
    $('.coll-back').classList.add('hidden');
    $('#coll-heading').textContent = 'Coleções';
    $('#coll-count').textContent = `${this.list.length} ${this.list.length === 1 ? 'coleção' : 'coleções'}`;
    $('#coll-tools').innerHTML = `<button class="btn-pill focusable" data-group="colltools" data-cmd="new"><span class="ico">${Icons.plus}</span>Nova coleção</button>`;
    const cards = this.list.map((c) => this.cardHtml(c)).join('');
    this.body.innerHTML =
      `<div class="coll-grid">${cards}` +
      `<button class="ccard new focusable" data-group="cgrid" data-cmd="new"><div class="stack"><div class="mosaic empty">${Icons.plus}</div></div>` +
      `<div class="t">Nova coleção</div><div class="s">Agrupe jogos de uma saga</div></button></div>`;
    this.refocus(focusId ? `.ccard[data-id="${focusId}"]` : null);
  },

  cardHtml(c) {
    const games = this.games(c);
    const covers = App.config.appearance.coverArt === false ? [] : games.filter((g) => g.cover).slice(0, 4);
    const mosaic = covers.length
      ? `<div class="mosaic n${covers.length}">${covers.map((g) => `<img src="${esc(g.cover)}" alt="" decoding="async" loading="lazy">`).join('')}</div>`
      : `<div class="mosaic empty">${Icons.library}</div>`;
    const systems = [...new Set(games.map((g) => (App.system(g.system) || {}).shortName).filter(Boolean))].join(' · ');
    return (
      `<button class="ccard focusable" data-group="cgrid" data-id="${esc(c.id)}"><div class="stack">${mosaic}</div>` +
      `<div class="t">${esc(c.name)}</div><div class="s">${games.length} ${games.length === 1 ? 'jogo' : 'jogos'}${systems ? ' · ' + esc(systems) : ''}</div></button>`
    );
  },

  renderDetail(focusId) {
    const col = this.get(this.openId);
    const games = this.games(col);
    $('.coll-back').classList.remove('hidden');
    $('#coll-heading').textContent = col.name;
    $('#coll-count').textContent = `${games.length} ${games.length === 1 ? 'jogo' : 'jogos'}`;
    $('#coll-tools').innerHTML =
      `<button class="btn-pill focusable" data-group="colltools" data-cmd="add"><span class="ico">${Icons.plus}</span>Adicionar jogos</button>` +
      `<button class="btn-pill focusable" data-group="colltools" data-cmd="rename"><span class="ico">${Icons.gear}</span>Renomear</button>` +
      `<button class="btn-pill focusable" data-group="colltools" data-cmd="delete"><span class="ico">${Icons.trash}</span>Excluir</button>`;
    this.body.innerHTML = games.length
      ? `<div class="coll-games">${games.map((g) => Library.cardHtml(g).replace('data-group="grid"', 'data-group="cgames"')).join('')}</div>`
      : `<div class="lib-empty">Esta coleção está vazia. Use “Adicionar jogos” ou, em qualquer jogo, ${glyph('y')} Opções › Adicionar à coleção.</div>`;
    this.refocus(focusId ? `.gcard[data-id="${focusId}"]` : null, games.length ? null : '[data-cmd="add"]');
  },

  refocus(sel, fallback) {
    if (App.view !== 'collections' || Modal.top) return;
    const el = (sel && $(sel, this.el)) || (fallback && $(fallback, this.el)) || $('.gcard, .ccard', this.body) || $('[data-cmd]', this.el);
    if (el) Nav.focus(el, { silent: true, instant: true });
  },

  updateArt(id) {
    if (App.view !== 'collections') return;
    const c = $(`.gcard[data-id="${id}"]`, this.body);
    if (c) {
      const tmp = document.createElement('div');
      tmp.innerHTML = Library.cardHtml(App.byId.get(id)).replace('data-group="grid"', 'data-group="cgames"');
      const focused = c.classList.contains('focused');
      c.replaceWith(tmp.firstChild);
      if (focused) Nav.focus($(`.gcard[data-id="${id}"]`, this.body), { silent: true, noScroll: true });
    }
  },

  // ---------- ações ----------

  onClick(e) {
    const card = e.target.closest('.ccard, .gcard');
    if (!card) return;
    Sound.select();
    if (card.dataset.cmd === 'new') return this.create();
    if (card.classList.contains('ccard')) return this.open(card.dataset.id);
    const g = App.byId.get(card.dataset.id);
    if (g) App.launch(g, $('.art', card));
  },

  command(cmd) {
    Sound.select();
    if (cmd === 'new') this.create();
    else if (cmd === 'add') this.pickGames(this.get(this.openId));
    else if (cmd === 'rename') this.rename(this.get(this.openId));
    else if (cmd === 'delete') this.remove(this.get(this.openId));
  },

  open(id) {
    this.openId = id;
    this.body.classList.remove('entering');
    void this.body.offsetWidth;
    this.body.classList.add('entering');
    this.render();
  },

  close() {
    const id = this.openId;
    this.openId = null;
    Sound.back();
    this.render(id);
  },

  // Cria uma coleção (opcionalmente já com um jogo) e sugere jogos com o mesmo nome.
  async create(withGame) {
    const name = (await Modal.keyboard({ title: 'Nome da coleção', value: '' })) || '';
    if (!name.trim()) return null;
    const col = { id: 'c' + Date.now().toString(36), name: name.trim(), games: withGame ? [withGame.id] : [], created: Date.now() };
    this.list.push(col);
    const q = col.name.toLowerCase();
    const matches = App.games.filter((g) => !col.games.includes(g.id) && (g.title.toLowerCase().includes(q) || g.base.toLowerCase().includes(q)));
    if (matches.length) {
      const ok = await Modal.confirm(
        `Adicionar ${matches.length} ${matches.length === 1 ? 'jogo' : 'jogos'}?`,
        `Encontrados na biblioteca com “${col.name}” no nome: ${matches.slice(0, 6).map((g) => g.title).join(', ')}${matches.length > 6 ? '…' : ''}`,
        { ok: 'Adicionar', cancel: 'Agora não' }
      );
      if (ok) col.games.push(...matches.map((g) => g.id));
    }
    this.save();
    Toast.show('Coleção criada', `${col.name} · ${col.games.length} ${col.games.length === 1 ? 'jogo' : 'jogos'}`, { kind: 'collectionNew', image: (this.games(col).find((g) => g.cover) || {}).cover });
    this.show(col.id, withGame && withGame.id);
    return col;
  },

  // Vai para a aba Coleções e abre a coleção (usado ao criar/adicionar a partir de qualquer tela).
  show(id, focusGameId) {
    this.openId = id;
    if (App.view !== 'collections') App.setView('collections');
    else this.render();
    if (focusGameId) this.refocus(`.gcard[data-id="${focusGameId}"]`);
  },

  async rename(col) {
    const name = await Modal.keyboard({ title: 'Renomear coleção', value: col.name });
    if (!name || !name.trim()) return;
    col.name = name.trim();
    this.save();
    this.render();
  },

  async remove(col) {
    if (!(await Modal.confirm('Excluir coleção?', `“${col.name}” será excluída. Os jogos continuam na biblioteca.`, { ok: 'Excluir' }))) return;
    this.list = this.list.filter((c) => c !== col);
    this.openId = null;
    this.save();
    this.render();
  },

  toggleGame(col, game, on) {
    const has = col.games.includes(game.id);
    if (on === undefined) on = !has;
    if (on && !has) col.games.push(game.id);
    if (!on && has) col.games = col.games.filter((id) => id !== game.id);
    this.save();
  },

  // Lista de todos os jogos com marcação; ✕/A marca ou desmarca, Options/Start conclui.
  async pickGames(col) {
    const games = [...App.games].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' }));
    const selected = new Set(col.games);
    const row = (g) => {
      const sys = App.system(g.system);
      return (
        `<button class="menu-item pick focusable${selected.has(g.id) ? ' checked' : ''}" data-group="pick" data-id="${g.id}">` +
        `<span class="pick-art" style="--c:${esc(sys ? sys.color : '#444')}">${g.cover ? `<img src="${esc(g.cover)}" alt="" loading="lazy">` : ''}</span>` +
        `<span class="pick-t">${esc(g.title)}</span><span class="r">${esc(sys ? sys.shortName : '')}<span class="check">${Icons.check}</span></span></button>`
      );
    };
    const res = await Modal.open({
      className: 'pick-games',
      html:
        `<h3>Adicionar jogos a “${esc(col.name)}”</h3><div class="sub"><span class="pick-count"></span> · ${glyph('a')} marcar · ${glyph('start')} concluir</div>` +
        `<div class="pick-list">${games.map(row).join('')}</div>` +
        `<div class="modal-buttons"><button class="btn-pill focusable" data-group="mb" data-done="1">Concluir</button></div>`,
      hints: [['a', 'Marcar'], ['start', 'Concluir'], ['b', 'Cancelar']],
      onMount: (box) => {
        const count = () => ($('.pick-count', box).textContent = `${selected.size} selecionados`);
        count();
        box.addEventListener('click', (e) => {
          if (e.target.closest('[data-done]')) return Modal.close(true);
          const it = e.target.closest('.pick');
          if (!it) return;
          const id = it.dataset.id;
          if (selected.has(id)) selected.delete(id);
          else selected.add(id);
          it.classList.toggle('checked', selected.has(id));
          Sound.toggle();
          count();
        });
      },
      onButton: (btn) => {
        if (btn !== 'start') return false;
        Modal.close(true);
        return true;
      },
    });
    if (!res) return;
    // Mantém a ordem dos já existentes e acrescenta os novos no fim.
    col.games = [...col.games.filter((id) => selected.has(id)), ...[...selected].filter((id) => !col.games.includes(id))];
    this.save();
    Sound.select();
    this.render();
  },

  // Menu "Adicionar à coleção" vindo das opções de um jogo.
  async addGameMenu(game) {
    const items = this.list.map((c) => ({ label: c.name, icon: Icons.library, value: c.id, checked: c.games.includes(game.id), right: `${this.games(c).length}` }));
    items.push({ label: 'Nova coleção…', icon: Icons.plus, value: '__new' });
    const v = await Modal.menu({ title: 'Adicionar à coleção', sub: `${game.title} · as marcadas já contêm este jogo`, items });
    if (!v) return;
    if (v === '__new') return this.create(game);
    const col = this.get(v);
    const had = col.games.includes(game.id);
    this.toggleGame(col, game);
    Toast.show(had ? 'Removido da coleção' : 'Adicionado à coleção', `${game.title} → ${col.name}`, { kind: had ? 'collectionRemove' : 'collectionAdd', ms: 2400, image: game.cover });
    if (!had) this.show(col.id, game.id);
    else if (App.view === 'collections') this.render(game.id);
  },

  handleButton(btn) {
    if (btn === 'b' && this.openId) {
      this.close();
      return true;
    }
    return false;
  },

  hints() {
    const cur = Nav.current;
    if (cur && cur.classList.contains('gcard')) return [['a', 'Jogar'], ['y', 'Opções'], ['b', 'Voltar']];
    return [['a', 'Abrir'], ['b', 'Voltar']];
  },
};
