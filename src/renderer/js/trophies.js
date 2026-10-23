/* Troféus: progresso do RetroAchievements no layout de troféus do PS5.
 * Tiers: platina = jogo dominado (100%); ouro ≥ 25 pontos; prata 10–24; bronze < 10.
 * Detalhe do jogo em lista ou grade, ordenado por raridade por padrão. */
const TIER_NAMES = { platinum: 'Platina', gold: 'Ouro', silver: 'Prata', bronze: 'Bronze' };
const TIER_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
// Regras configuráveis em Configurações › RetroAchievements (config.trophies).
const trophyRules = () => (App.config && App.config.trophies) || {};

// Tipo do troféu: por pontos da conquista ou pela % de jogadores que obtiveram.
function tierOf(points, pct) {
  const t = trophyRules();
  if (t.tierMode === 'rarity' && pct !== undefined && pct !== null) {
    return pct <= (t.goldPct ?? 10) ? 'gold' : pct <= (t.silverPct ?? 30) ? 'silver' : 'bronze';
  }
  return points >= (t.goldPoints ?? 25) ? 'gold' : points >= (t.silverPoints ?? 10) ? 'silver' : 'bronze';
}

// Ícones dos troféus (SVG em img/trophies/): taças de ouro/prata/bronze e a platina.
function trophyIcon(tier, extra = '') {
  return `<span class="trophy t-${tier} ${extra}"><img src="img/trophies/${tier}.svg" alt="${TIER_NAMES[tier]}" draggable="false"></span>`;
}

// Pirâmide de raridade do PS4/PS5: 4 faixas; a faixa acesa indica o nível
// (Comum = base, Raro, Muito raro, Ultra raro = topo).
const RARITY_LEVEL = { 'Comum': 3, 'Raro': 2, 'Muito raro': 1, 'Ultra raro': 0 };
function rarityPyramid(label) {
  const active = RARITY_LEVEL[label];
  const top = 1;
  const base = 21;
  const xAt = (y) => (12 * (y - top)) / (base - top);
  const bands = [
    [top, 5.6],
    [6.6, 10.6],
    [11.6, 15.6],
    [16.6, base],
  ];
  const shapes = bands
    .map(([y1, y2], i) => {
      const a = xAt(y1);
      const b = xAt(y2);
      const on = i === active;
      const pts = i === 0 ? `12,${y1} ${12 + b},${y2} ${12 - b},${y2}` : `${12 - a},${y1} ${12 + a},${y1} ${12 + b},${y2} ${12 - b},${y2}`;
      return `<polygon points="${pts}" class="${on ? 'on' : 'off'}"/>`;
    })
    .join('');
  return `<svg viewBox="0 0 24 22" class="rar-ico lvl-${active}">${shapes}</svg>`;
}
const DATE_ICON =
  '<svg viewBox="0 0 24 24" class="date-ico"><rect x="3" y="6" width="15" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7 3.5h13a1 1 0 0 1 1 1v9" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="10.5" cy="11.5" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

// Raridade no padrão do PS5 a partir da % de jogadores que obtiveram.
function rarity(pct) {
  const t = trophyRules();
  if (pct <= (t.ultraRarePct ?? 5)) return 'Ultra raro';
  if (pct <= (t.veryRarePct ?? 15)) return 'Muito raro';
  if (pct <= (t.rarePct ?? 50)) return 'Raro';
  return 'Comum';
}

const fmtPct = (v) => `${(Math.round(v * 10) / 10).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%`;
const fmtDateTime = (s) => {
  if (!s) return '';
  const d = new Date(String(s).replace(' ', 'T'));
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

// Sigla do console (a "etiqueta" ao lado do título, como o PS4/PS5 na tela de troféus).
const CONSOLE_TAGS = {
  'PlayStation': 'PS1', 'PlayStation 2': 'PS2', 'PlayStation Portable': 'PSP', 'Nintendo DS': 'NDS', 'GameCube': 'GC',
  'Game Boy Advance': 'GBA', 'Game Boy Color': 'GBC', 'Game Boy': 'GB', 'NES/Famicom': 'NES', 'SNES/Super Famicom': 'SNES',
  'Nintendo 64': 'N64', 'Genesis/Mega Drive': 'MD', 'Atari 2600': '2600', 'Master System': 'SMS', 'Dreamcast': 'DC',
};
const consoleTag = (name) => CONSOLE_TAGS[name] || (name || '').split(/[\s/]+/).map((w) => w[0]).join('').slice(0, 4).toUpperCase();

const TR_SORTS = [
  { id: 'recent', label: 'Jogados recentemente' },
  { id: 'progress', label: 'Progresso' },
  { id: 'az', label: 'Nome (A–Z)' },
  { id: 'za', label: 'Nome (Z–A)' },
];

// Console do RetroAchievements → id do sistema no PlayDeck (para achar a ROM na biblioteca).
const RA_SYSTEMS = {
  'PlayStation': 'psx', 'PlayStation 2': 'ps2', 'PlayStation Portable': 'psp', 'Nintendo DS': 'nds', 'GameCube': 'gc',
  'Game Boy Advance': 'gba', 'Game Boy Color': 'gbc', 'Game Boy': 'gbc', 'NES/Famicom': 'nes', 'SNES/Super Famicom': 'snes',
};
// Título comparável: sem tags (USA), artigos, pontuação e acentos ("Legend of Zelda, The" = "The Legend of Zelda").
const titleKey = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s*[([][^)\]]*[)\]]/g, '')
    .replace(/~[^~]*~/g, '')
    .replace(/,\s*(the|a|an)\b/g, '')
    .replace(/^(the|a|an)\s+/, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');
const ACH_SORTS = [
  { id: 'rarity', label: 'Raridade' },
  { id: 'default', label: 'Padrão do jogo' },
  { id: 'earned', label: 'Data obtida' },
  { id: 'type', label: 'Tipo de troféu' },
];
const ACH_FILTERS = [
  { id: 'all', label: 'Todos os troféus' },
  { id: 'earned', label: 'Obtidos' },
  { id: 'locked', label: 'Não obtidos' },
];

function pref(key, fallback) {
  try {
    return localStorage.getItem('trophies.' + key) || fallback;
  } catch {
    return fallback;
  }
}
function setPref(key, value) {
  try {
    localStorage.setItem('trophies.' + key, value);
  } catch {}
}

const Trophies = {
  el: $('#view-trophies'),
  body: $('#tr-body'),
  data: null,
  error: null,
  gameId: null,
  game: null,
  sort: pref('gameSort', 'recent'),
  sysFilter: pref('sys', 'all'), // 'all' ou nome do console do RA
  romOnly: pref('romOnly', '0') === '1',
  query: '',
  achSort: pref('sort', 'rarity'),
  mode: pref('mode', 'list'),
  filter: 'all',
  imgs: {},
  tiers: {}, // contagem de troféus por jogo (vinda dos detalhes já carregados)
  loading: false,

  init() {
    this.body.addEventListener('click', (e) => this.onClick(e));
    this.body.addEventListener('navfocus', () => App.updateHints());
  },

  // Chamado ao abrir a aba.
  async show() {
    // Regras de classificação mudaram nas Configurações: recalcula as contagens por tier.
    const sig = JSON.stringify(trophyRules());
    if (this.rulesSig && this.rulesSig !== sig) {
      this.tiers = {};
      if (this.data) this.loadTiers();
    }
    this.rulesSig = sig;
    if (this.gameId) return this.renderDetail();
    this.render();
    if (!this.data || Date.now() - (this.data.cachedAt || 0) > 5 * 60 * 1000) await this.load(false);
  },

  async load(force) {
    if (this.loading) return;
    this.loading = true;
    if (force) Toast.show('Sincronizando troféus…', 'RetroAchievements', { kind: 'raSync', ms: 2000, sound: false });
    const res = await api.invoke('ra:overview', force);
    this.loading = false;
    if (!res.ok) {
      this.error = res.error;
      if (force) Toast.show('Não foi possível sincronizar', res.error, { kind: 'raError', ms: 6000 });
    } else {
      this.error = null;
      this.data = res;
    }
    if (App.view === 'trophies' && !this.gameId) this.render();
    if (this.data) this.loadTiers();
  },

  // Busca em segundo plano os detalhes de cada jogo para preencher ouro/prata/bronze das linhas.
  async loadTiers() {
    const games = (this.data.games || []).filter((g) => !this.tiers[g.GameID]);
    let i = 0;
    const worker = async () => {
      while (i < games.length) {
        const g = games[i++];
        const res = await api.invoke('ra:game', g.GameID, false);
        if (!res.ok) continue;
        this.tiers[g.GameID] = this.countTiers(res);
        const cell = $(`.trow[data-id="${g.GameID}"] .tr-tiers`, this.body);
        if (cell) cell.innerHTML = this.tiersHtml(this.tiers[g.GameID]);
        this.updateHeader();
      }
    };
    await Promise.all([worker(), worker()]);
  },

  countTiers(game) {
    const c = { gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
    const players = game.NumDistinctPlayersCasual || game.NumDistinctPlayers || 0;
    for (const a of Object.values(game.Achievements || {})) {
      const t = tierOf(a.Points, players ? (100 * (a.NumAwarded || 0)) / players : null);
      c[t][1]++;
      if (a.DateEarned || a.DateEarnedHardcore) c[t][0]++;
    }
    return c;
  },

  isMastered(g) {
    return /mastered|completed/i.test(g.HighestAwardKind || '') || (g.MaxPossible > 0 && g.NumAwarded >= g.MaxPossible);
  },

  // Índice "sistema + título" das ROMs da biblioteca, para saber quais jogos do RA você tem.
  romIndex() {
    if (this._romIdx && this._romIdxGames === App.games) return this._romIdx;
    const idx = new Map();
    for (const g of App.games) {
      const k = titleKey(g.title.replace(/\s*\(Disco \d+\)$/, ''));
      if (!idx.has(g.system)) idx.set(g.system, new Set());
      idx.get(g.system).add(k);
    }
    this._romIdx = idx;
    this._romIdxGames = App.games;
    return idx;
  },

  hasRom(g) {
    const set = this.romIndex().get(RA_SYSTEMS[g.ConsoleName]);
    if (!set) return false;
    const k = titleKey(g.Title);
    if (set.has(k)) return true;
    // Títulos do RA às vezes trazem subtítulo extra (ou a ROM traz): aceita prefixo com tamanho razoável.
    for (const local of set) if (k.length > 5 && local.length > 5 && (k.startsWith(local) || local.startsWith(k))) return true;
    return false;
  },

  allGames() {
    return (this.data && this.data.games) || [];
  },

  // Lista exibida: filtro de sistema + "com ROM" + busca, depois a ordenação escolhida.
  sorted() {
    const q = titleKey(this.query);
    let list = this.allGames().filter(
      (g) => (this.sysFilter === 'all' || g.ConsoleName === this.sysFilter) && (!this.romOnly || this.hasRom(g)) && (!q || titleKey(g.Title).includes(q))
    );
    const pct = (g) => (g.MaxPossible ? g.NumAwarded / g.MaxPossible : 0);
    const byTitle = (a, b) => a.Title.localeCompare(b.Title, 'pt-BR', { sensitivity: 'base' });
    if (this.sort === 'progress') list.sort((a, b) => pct(b) - pct(a) || byTitle(a, b));
    else if (this.sort === 'az') list.sort(byTitle);
    else if (this.sort === 'za') list.sort((a, b) => byTitle(b, a));
    else list.sort((a, b) => String(b.MostRecentAwardedDate || '').localeCompare(String(a.MostRecentAwardedDate || '')));
    return list;
  },

  filtersHtml() {
    const all = this.allGames();
    const counts = {};
    for (const g of all) counts[g.ConsoleName] = (counts[g.ConsoleName] || 0) + 1;
    const withRom = all.filter((g) => this.hasRom(g)).length;
    const chip = (attr, label, active, n) =>
      `<button class="chip focusable${active ? ' active' : ''}" data-group="trchips" ${attr}>${esc(label)}${n !== undefined ? `<span class="count">${n}</span>` : ''}</button>`;
    return (
      `<div class="tr-filterbar"><div class="tr-chips">` +
      chip('data-sys="all"', 'Todos', this.sysFilter === 'all', all.length) +
      chip('data-rom="1"', 'Com ROM', this.romOnly, withRom) +
      `<span class="tr-sep"></span>` +
      Object.keys(counts)
        .sort()
        .map((c) => chip(`data-sys="${esc(c)}"`, consoleTag(c), this.sysFilter === c, counts[c]))
        .join('') +
      `</div><div class="lib-tools">` +
      `<button class="btn-pill focusable" data-group="trtools" data-cmd="search"><span class="ico">${Icons.search}</span>${this.query ? `“${esc(this.query)}”` : 'Buscar'}</button>` +
      `<button class="btn-pill focusable" data-group="trtools" data-cmd="sort"><span class="ico">${Icons.sort}</span>${esc(TR_SORTS.find((s) => s.id === this.sort).label)}</button>` +
      `</div></div>`
    );
  },

  setFilters(patch) {
    Object.assign(this, patch);
    setPref('sys', this.sysFilter);
    setPref('romOnly', this.romOnly ? '1' : '0');
    setPref('gameSort', this.sort);
    const focused = Nav.current && (Nav.current.dataset.sys || Nav.current.dataset.rom || Nav.current.dataset.cmd);
    this.render();
    // Mantém o foco no mesmo controle de filtro após re-renderizar.
    if (focused) {
      const el = $(`[data-sys="${focused}"], [data-rom="${focused}"], [data-cmd="${focused}"]`, this.body);
      if (el) Nav.focus(el, { silent: true, noScroll: true });
    }
  },

  cycleSystem(delta) {
    const ids = ['all', ...[...new Set(this.allGames().map((g) => g.ConsoleName))].sort()];
    const i = (ids.indexOf(this.sysFilter) + delta + ids.length) % ids.length;
    Sound.move();
    this.setFilters({ sysFilter: ids[i] });
  },

  async search() {
    const before = this.query;
    const res = await Modal.keyboard({
      title: 'Buscar jogos com troféus',
      value: this.query,
      onChange: debounce((t) => {
        this.query = t;
        this.render();
      }, 150),
    });
    this.query = res === null ? before : res.trim();
    this.render();
  },

  // ---------- imagens (baixadas e cacheadas pelo processo principal) ----------

  async resolveImages(rels) {
    const missing = [...new Set(rels.filter((r) => r && !(r in this.imgs)))];
    if (!missing.length) return;
    Object.assign(this.imgs, await api.invoke('ra:images', missing));
    for (const el of $$('img[data-ra]', this.el)) {
      const url = this.imgs[el.dataset.ra];
      if (url && el.getAttribute('src') !== url) el.src = url;
    }
  },

  img(rel) {
    const url = this.imgs[rel];
    return `<img data-ra="${esc(rel || '')}" ${url ? `src="${esc(url)}"` : ''} alt="" decoding="async">`;
  },

  // ---------- lista de jogos ----------

  render() {
    if (this.gameId) return this.renderDetail();
    if (!this.data) {
      const notConfigured = this.error && /Configurações|conta|chave/i.test(this.error);
      this.body.innerHTML =
        `<div class="tr-empty">${trophyIcon('gold', 'big')}<h1>Troféus</h1>` +
        `<p>${esc(this.loading ? 'Carregando seus troféus do RetroAchievements…' : this.error || 'Carregando…')}</p>` +
        (this.error
          ? `<div class="hero-actions">${notConfigured ? `<button class="btn-play focusable" data-group="tr" data-cmd="settings">Configurar RetroAchievements</button>` : `<button class="btn-play focusable" data-group="tr" data-cmd="sync">Tentar novamente</button>`}</div>`
          : '<div class="spinner"></div>') +
        `</div>`;
      this.refocus();
      return;
    }
    const games = this.sorted();
    const filtered = this.sysFilter !== 'all' || this.romOnly || this.query;
    this.body.innerHTML =
      `<div class="tr-top"><h1 class="tr-h1">Troféus</h1><div class="tr-summary">${this.summaryHtml(this.allGames())}</div></div>` +
      this.filtersHtml() +
      `<div class="tr-bar"><span>${games.length} de ${this.allGames().length} ${this.allGames().length === 1 ? 'jogo' : 'jogos'}${this.data.stale ? ' · <em>offline (dados em cache)</em>' : ''}</span></div>` +
      (games.length
        ? `<div class="tr-games">${games.map((g) => this.rowHtml(g)).join('')}</div>`
        : filtered
          ? `<div class="lib-empty">Nenhum jogo corresponde aos filtros.<div class="hero-actions" style="margin-top:18px"><button class="btn-pill focusable" data-group="tr" data-cmd="clear">Limpar filtros</button></div></div>`
          : `<div class="lib-empty">Nenhum jogo com conquistas ainda. Jogue algo com o RetroAchievements ativo nos emuladores.</div>`);
    this.resolveImages(games.map((g) => g.ImageIcon));
    this.refocus(this.lastFocus ? `.trow[data-id="${this.lastFocus}"]` : null);
  },

  summaryHtml(games) {
    const p = (this.data && this.data.profile) || {};
    const plat = games.filter((g) => this.isMastered(g)).length;
    const sum = { gold: 0, silver: 0, bronze: 0 };
    for (const t of Object.values(this.tiers)) for (const k of Object.keys(sum)) sum[k] += t[k][0];
    const total = games.reduce((a, g) => a + (g.NumAwarded || 0), 0);
    return (
      `<div class="tr-level" title="Pontos no RetroAchievements"><span class="hex">${trophyIcon('silver')}</span><b>${(p.TotalPoints || 0).toLocaleString('pt-BR')}</b></div>` +
      `<div class="tr-total"><span>Total</span><b>${total.toLocaleString('pt-BR')}</b></div>` +
      [['platinum', plat], ['gold', sum.gold], ['silver', sum.silver], ['bronze', sum.bronze]]
        .map(([t, n]) => `<div class="tr-sum">${trophyIcon(t, 'xl')}<b>${n.toLocaleString('pt-BR')}</b></div>`)
        .join('')
    );
  },

  updateHeader() {
    const s = $('.tr-summary', this.body);
    if (s && this.data && !this.gameId) s.innerHTML = this.summaryHtml(this.allGames());
  },

  tiersHtml(t) {
    if (!t) return ['gold', 'silver', 'bronze'].map((k) => `<span class="tr-tier">${trophyIcon(k)}<b>–</b></span>`).join('');
    return ['gold', 'silver', 'bronze'].map((k) => `<span class="tr-tier">${trophyIcon(k)}<b>${t[k][0]}</b></span>`).join('');
  },

  rowHtml(g) {
    const pct = g.MaxPossible ? Math.floor((100 * g.NumAwarded) / g.MaxPossible) : 0;
    return (
      `<button class="trow focusable" data-group="trows" data-id="${g.GameID}">` +
      `<span class="tr-icon">${this.img(g.ImageIcon)}</span>` +
      `<span class="tr-info"><span class="tr-game">${esc(g.Title)}</span><span class="tr-tags"><span class="tr-tag">${esc(consoleTag(g.ConsoleName))}</span>${this.hasRom(g) ? '<span class="tr-tag rom">Installed</span>' : ''}</span></span>` +
      `<span class="tr-plat">${this.isMastered(g) ? trophyIcon('platinum', 'xl') : ''}</span>` +
      `<span class="tr-pct"><b>${pct}%</b><i><s style="transform:scaleX(${pct / 100})"></s></i></span>` +
      `<span class="tr-tiers">${this.tiersHtml(this.tiers[g.GameID])}</span></button>`
    );
  },

  // ---------- troféus de um jogo ----------

  async open(id) {
    this.lastFocus = id;
    this.gameId = id;
    this.filter = 'all';
    this.game = null;
    this.renderDetail();
    const res = await api.invoke('ra:game', id, false);
    if (this.gameId !== id) return;
    if (!res.ok) {
      Toast.show('Não foi possível carregar o jogo', res.error, { kind: 'raError' });
      return this.close();
    }
    this.game = res;
    this.tiers[id] = this.countTiers(res);
    this.renderDetail();
  },

  close() {
    this.gameId = null;
    this.game = null;
    Sound.back();
    this.render();
  },

  players() {
    return (this.game && (this.game.NumDistinctPlayersCasual || this.game.NumDistinctPlayers)) || 0;
  },

  // Lista de troféus: a platina (dominar o jogo) vem primeiro, como no PS5.
  trophies() {
    const g = this.game;
    const players = this.players();
    const list = Object.values(g.Achievements || {}).map((a) => {
      const pct = players ? (100 * (a.NumAwarded || 0)) / players : 100;
      return { ...a, tier: tierOf(a.Points, players ? pct : null), earned: a.DateEarnedHardcore || a.DateEarned, pct };
    });
    const by = {
      rarity: (a, b) => a.pct - b.pct,
      default: (a, b) => (a.DisplayOrder || 0) - (b.DisplayOrder || 0) || a.ID - b.ID,
      earned: (a, b) => (a.earned && b.earned ? String(b.earned).localeCompare(String(a.earned)) : a.earned ? -1 : b.earned ? 1 : 0),
      type: (a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.pct - b.pct,
    }[this.achSort];
    list.sort(by);
    const total = list.length;
    const got = list.filter((a) => a.earned).length;
    const mastered = total > 0 && got === total;
    const plat = {
      platinum: true,
      tier: 'platinum',
      Title: `${g.Title}`,
      Description: 'Obtenha todas as conquistas deste jogo.',
      earned: mastered ? list.reduce((m, a) => (String(a.earned) > String(m) ? a.earned : m), '') : null,
      pct: players ? (100 * Math.min(...list.map((a) => a.NumAwarded || 0))) / players : 0,
    };
    let out = total ? [plat, ...list] : list;
    if (this.filter === 'earned') out = out.filter((a) => a.earned);
    if (this.filter === 'locked') out = out.filter((a) => !a.earned);
    return { list: out, total, got, mastered };
  },

  renderDetail() {
    const g = this.game;
    const summary = ((this.data && this.data.games) || []).find((x) => x.GameID === this.gameId) || {};
    if (!g) {
      this.body.innerHTML = `<div class="tr-empty"><div class="spinner"></div><p>Carregando troféus de ${esc(summary.Title || 'jogo')}…</p></div>`;
      return;
    }
    const { list, total, got, mastered } = this.trophies();
    const pct = total ? Math.floor((100 * got) / total) : 0;
    const t = this.countTiers(g);
    const players = this.players();
    const filterLabel = ACH_FILTERS.find((f) => f.id === this.filter).label;
    this.body.innerHTML =
      `<div class="td-top">` +
      `<span class="td-icon">${this.img(g.ImageIcon)}</span><h1 class="td-title">${esc(g.Title)}</h1>` +
      `<div class="td-stats">${trophyIcon('platinum', 'xl' + (mastered ? '' : ' dim'))}` +
      `<div class="td-stat"><span>Progresso</span><b>${pct}%</b><i><s style="transform:scaleX(${pct / 100})"></s></i></div>` +
      `<div class="td-stat"><span>Obtidos</span><b>${got}/${total}</b></div>` +
      ['gold', 'silver', 'bronze'].map((k) => `<div class="td-tier">${trophyIcon(k, 'lg')}<b>${t[k][0]}</b></div>`).join('') +
      `</div></div>` +
      `<div class="td-bar"><button class="td-filter focusable" data-group="tdtools" data-cmd="filter">${esc(filterLabel)}: ${list.length}</button>` +
      `<div class="td-tools"><button class="td-sort focusable" data-group="tdtools" data-cmd="sort">Ordenar por: ${esc(ACH_SORTS.find((s) => s.id === this.achSort).label)}</button>` +
      `<button class="td-mode focusable" data-group="tdtools" data-cmd="mode" title="Lista / Grade">${this.mode === 'grid' ? Icons.library : Icons.grid}</button></div></div>` +
      (list.length
        ? `<div class="td-${this.mode}">${list.map((a) => (this.mode === 'grid' ? this.cardHtml(a, players) : this.achRowHtml(a, players))).join('')}</div>`
        : `<div class="lib-empty">Nenhum troféu neste filtro.</div>`);
    this.resolveImages([g.ImageIcon, ...list.filter((a) => !a.platinum).map((a) => this.badgeRel(a))]);
    this.refocus('.ach');
  },

  // Sempre o ícone colorido; os não obtidos ficam em preto e branco via CSS (.ach.locked).
  badgeRel(a) {
    return `/Badge/${a.BadgeName}.png`;
  },

  badgeHtml(a) {
    if (a.platinum) return `<span class="a-badge plat">${trophyIcon('platinum', 'huge')}</span>`;
    return `<span class="a-badge">${this.img(this.badgeRel(a))}</span>`;
  },

  rarityLine(a, players) {
    if (!players) return '';
    const label = rarity(a.pct);
    return `${rarityPyramid(label)}<span>${label} | ${fmtPct(a.pct)} dos jogadores obtiveram</span>`;
  },

  achRowHtml(a, players) {
    return (
      `<div class="ach arow focusable${a.earned ? ' got' : ' locked'}" data-group="ach" tabindex="-1">` +
      this.badgeHtml(a) +
      `<div class="a-main"><div class="a-head"><span class="a-title">${esc(a.Title)}</span>` +
      (a.earned ? `<span class="a-date">${DATE_ICON}${esc(fmtDateTime(a.earned))}</span>` : `<span class="a-date lockd">Não obtido</span>`) +
      `</div><div class="a-line">${trophyIcon(a.tier, 'sm')}<span>${TIER_NAMES[a.tier]}${a.platinum ? '' : ` · ${a.Points} pts`}</span></div>` +
      `<div class="a-line rar">${this.rarityLine(a, players)}</div></div>` +
      `<div class="a-desc">${esc(a.Description || '')}</div></div>`
    );
  },

  cardHtml(a) {
    return (
      `<div class="ach acard focusable${a.earned ? ' got' : ' locked'}" data-group="ach" tabindex="-1">` +
      `<div class="ac-art">${this.badgeHtml(a)}</div>` +
      `<div class="ac-tier">${trophyIcon(a.tier, 'sm')}${TIER_NAMES[a.tier]}</div>` +
      `<div class="ac-title">${esc(a.Title)}</div><div class="ac-desc">${esc(a.Description || '')}</div></div>`
    );
  },

  // ---------- interação ----------

  refocus(sel) {
    if (App.view !== 'trophies' || Modal.top) return;
    const el = (sel && $(sel, this.el)) || $('.trow', this.body) || $('.ach', this.body) || $('.focusable', this.body);
    if (el) Nav.focus(el, { silent: true, instant: true });
  },

  cycleFilter(delta) {
    const ids = ACH_FILTERS.map((f) => f.id);
    this.filter = ids[(ids.indexOf(this.filter) + delta + ids.length) % ids.length];
    Sound.move();
    this.renderDetail();
  },

  toggleMode() {
    this.mode = this.mode === 'grid' ? 'list' : 'grid';
    setPref('mode', this.mode);
    Sound.toggle();
    this.renderDetail();
  },

  async chooseSort() {
    if (this.gameId) {
      const v = await Modal.menu({ title: 'Ordenar troféus por', items: ACH_SORTS.map((s) => ({ label: s.label, value: s.id, checked: s.id === this.achSort, icon: Icons.sort })) });
      if (!v) return;
      this.achSort = v;
      setPref('sort', v);
      this.renderDetail();
    } else {
      const v = await Modal.menu({ title: 'Ordenar jogos por', items: TR_SORTS.map((s) => ({ label: s.label, value: s.id, checked: s.id === this.sort, icon: Icons.sort })) });
      if (!v) return;
      this.setFilters({ sort: v });
    }
  },

  async onClick(e) {
    const b = e.target.closest('[data-cmd], [data-sys], [data-rom], .trow');
    if (!b) return;
    Sound.select();
    if (b.classList.contains('trow')) return this.open(+b.dataset.id);
    if (b.dataset.sys) return this.setFilters({ sysFilter: b.dataset.sys });
    if (b.dataset.rom) return this.setFilters({ romOnly: !this.romOnly });
    const cmd = b.dataset.cmd;
    if (cmd === 'search') return this.search();
    if (cmd === 'clear') return this.setFilters({ sysFilter: 'all', romOnly: false, query: '' });
    if (cmd === 'sync') this.load(true);
    else if (cmd === 'settings') Settings.open('retroachievements');
    else if (cmd === 'sort') this.chooseSort();
    else if (cmd === 'mode') this.toggleMode();
    else if (cmd === 'filter') this.cycleFilter(1);
  },

  handleButton(btn) {
    if (btn === 'b' && this.gameId) {
      this.close();
      return true;
    }
    if (!this.gameId && this.data) {
      if (btn === 'b' && this.query) {
        Sound.back();
        this.setFilters({ query: '' });
        return true;
      }
      if (btn === 'lb' || btn === 'rb') {
        this.cycleSystem(btn === 'rb' ? 1 : -1);
        return true;
      }
      if (btn === 'y') {
        Sound.toggle();
        this.setFilters({ romOnly: !this.romOnly });
        return true;
      }
      if (btn === 'back') {
        this.search();
        return true;
      }
    }
    if (btn === 'start') {
      this.chooseSort();
      return true;
    }
    if (btn === 'x') {
      if (this.gameId) api.invoke('ra:game', this.gameId, true).then((r) => r.ok && ((this.game = r), this.renderDetail()));
      else this.load(true);
      return true;
    }
    if (this.gameId && this.game) {
      if (btn === 'y') {
        this.toggleMode();
        return true;
      }
      if (btn === 'lb' || btn === 'rb') {
        this.cycleFilter(btn === 'rb' ? 1 : -1);
        return true;
      }
    }
    return false;
  },

  hints() {
    if (this.gameId) return [['y', this.mode === 'grid' ? 'Lista' : 'Grade'], ['lb+rb', 'Filtro'], ['start', 'Ordenar'], ['b', 'Voltar']];
    return [['a', 'Ver troféus'], ['lb+rb', 'Sistema'], ['y', this.romOnly ? 'Todos os jogos' : 'Só com ROM'], ['back', 'Buscar'], ['start', 'Ordenar'], ['b', this.query ? 'Limpar busca' : 'Voltar']];
  },
};
