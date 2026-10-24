/* Configurações: páginas montadas a partir de descritores de linha, navegáveis pelo controle. */
const PALETTE = ['#8c96a8', '#2f62e0', '#5b6b8a', '#d64545', '#7a5af0', '#1fa37a', '#e08a2f', '#e0c22f', '#d6458f', '#2fb8e0', '#6b8e23', '#a0522d'];
// Combinações disponíveis para os atalhos do launcher (nomes de botão do XInput).
const COMBOS = ['back+start', 'back+lb', 'back+rb', 'lb+rb+start', 'lb+rb+back', 'ls+rs', 'back+ls', 'start+rs', 'guide'].map((v) => ({ v }));
const HOLD_TIMES = [0, 500, 800, 1000, 1500, 2000, 3000];
// Valores recomendados da classificação dos troféus (mesmos de src/main/defaults.js).
const TROPHY_DEFAULTS = { tierMode: 'points', silverPoints: 10, goldPoints: 25, silverPct: 30, goldPct: 10, ultraRarePct: 5, veryRarePct: 15, rarePct: 50 };
const NAV_PAGES = [
  { id: 'general', label: 'Geral', icon: Icons.gear },
  { id: 'appearance', label: 'Aparência', icon: Icons.palette },
  { id: 'systems', label: 'Sistemas e emuladores', icon: Icons.chip },
  { id: 'setup', label: 'Instalação', icon: Icons.folder },
  { id: 'shortcuts', label: 'Atalhos', icon: Icons.bolt },
  { id: 'optimize', label: 'Otimização', icon: Icons.gauge },
  { id: 'retroachievements', label: 'RetroAchievements', icon: Icons.trophy },
  { id: 'controls', label: 'Controles', icon: Icons.gamepad },
  { id: 'covers', label: 'Capas', icon: Icons.image },
  { id: 'library', label: 'Biblioteca', icon: Icons.library },
  { id: 'about', label: 'Sobre', icon: Icons.info },
];

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 16) || 'item';

const Settings = {
  el: $('#view-settings'),
  content: $('#set-content'),
  page: 'general',
  rows: [],
  systemsDirty: false,
  exists: {},
  prevView: 'home',

  init() {
    $('#set-nav').innerHTML = NAV_PAGES.map(
      (p) => `<button class="side-item focusable" data-group="setnav" data-page="${p.id}"><span class="ico">${p.icon}</span><span>${esc(p.label)}</span></button>`
    ).join('');
    $('#set-nav').addEventListener('navfocus', (e) => {
      const it = e.target.closest('.side-item');
      if (it && this.pageRoot(this.page) !== it.dataset.page) this.go(it.dataset.page);
    });
    $('#set-nav').addEventListener('click', (e) => {
      const it = e.target.closest('.side-item');
      if (!it) return;
      if (this.pageRoot(this.page) !== it.dataset.page) this.go(it.dataset.page);
      this.focusContent();
    });
    this.content.addEventListener('click', (e) => this.onRowClick(e));
    this.el.addEventListener('navfocus', () => App.updateHints());
    api.on('setup:progress', (p) => this.onProgress(p));
    api.on('perf', (d) => this.onPerf(d));
    // O main para o monitor ao minimizar/esconder; ao voltar com a aba aberta, religa.
    window.addEventListener('focus', () => this.syncPerf());
    this.content.addEventListener('change', (e) => {
      const input = e.target.closest('input');
      const row = e.target.closest('.set-row');
      if (!input || !row) return;
      const r = this.rows[+row.dataset.i];
      if (r.type === 'range') return this.setRange(row, r, +input.value);
      this.apply(r, input.value);
    });
    // Arrastar o slider com o mouse atualiza o valor ao vivo.
    this.content.addEventListener('input', (e) => {
      const row = e.target.closest('.set-row');
      if (!row || e.target.type !== 'range') return;
      this.setRange(row, this.rows[+row.dataset.i], +e.target.value);
    });
    this.content.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' && (e.key === 'Enter' || e.key === 'Escape')) e.target.blur();
    });
  },

  pageRoot(page) {
    return page.startsWith('system:') ? 'systems' : page;
  },

  get cfg() {
    return App.config;
  },

  async open(page = 'general') {
    if (App.view === 'settings') return;
    this.prevView = App.view;
    this.systemsDirty = false;
    App.setView('settings');
    await this.go(page, true);
    Nav.setScope(this.el, $(`#set-nav .side-item[data-page="${page}"]`) || $('#set-nav .side-item'));
  },

  async close() {
    App.setView(this.prevView);
    this.syncPerf();
    if (this.systemsDirty) {
      this.systemsDirty = false;
      await App.rescan();
    }
  },

  save: debounce(function () {
    api.invoke('config:save', App.config);
  }, 300),

  changed(systems) {
    if (systems) this.systemsDirty = true;
    this.save();
    this.render();
  },

  async go(page, instant) {
    this.page = page;
    const root = this.pageRoot(page);
    $$('#set-nav .side-item').forEach((n) => n.classList.toggle('active', n.dataset.page === root));
    this.content.classList.remove('entering');
    void this.content.offsetWidth;
    if (!instant) this.content.classList.add('entering');
    this.content.scrollTop = 0;
    await this.refreshExists();
    if (root === 'setup') {
      this.setupStatus = await api.invoke('setup:status');
      this.loadVersions(false);
    }
    if (root === 'retroachievements') await this.loadRa();
    this.render();
    this.syncPerf();
  },

  // ---------- RetroAchievements ----------

  raForm: { username: '', password: '', apiKey: '' },

  async loadRa() {
    this.raStatus = await api.invoke('ra:status');
    if (!this.raForm.username && this.raStatus.username) this.raForm.username = this.raStatus.username;
    if (this.raStatus.avatar && !this.raAvatar) {
      const imgs = await api.invoke('ra:images', [this.raStatus.avatar]);
      this.raAvatar = imgs[this.raStatus.avatar];
    }
  },

  // Regras da aba Troféus: tipo (por pontos ou por % de jogadores) e raridade, tudo por sliders.
  // Cada slider respeita os vizinhos (ex.: ouro sempre acima da prata).
  trophyRules() {
    const t = this.cfg.trophies;
    const D = TROPHY_DEFAULTS;
    const pct = (v) => `${v}%`;
    const pts = (v) => `${v} pts`;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const tierSummary =
      t.tierMode === 'points'
        ? `Bronze: até ${t.silverPoints - 1} pts · Prata: ${t.silverPoints}–${t.goldPoints - 1} pts · Ouro: ${t.goldPoints}+ pts`
        : `Ouro: até ${t.goldPct}% dos jogadores · Prata: até ${t.silverPct}% · Bronze: acima de ${t.silverPct}%`;
    const rows = [
      { type: 'section', label: 'Classificação dos troféus' },
      {
        type: 'select',
        label: 'Tipo de troféu definido por',
        desc: tierSummary + '\nPlatina: jogo com todas as conquistas obtidas.',
        options: [
          { v: 'points', l: 'Pontos da conquista' },
          { v: 'rarity', l: '% de jogadores que obtiveram' },
        ],
        get: () => t.tierMode,
        set: (v) => (t.tierMode = v),
      },
    ];
    if (t.tierMode === 'points') {
      rows.push(
        { type: 'range', label: 'Prata a partir de', desc: 'Conquistas com menos pontos que isso são bronze.', min: 1, max: 99, def: D.silverPoints, get: () => t.silverPoints, set: (v) => (t.silverPoints = clamp(v, 1, t.goldPoints - 1)), format: pts },
        { type: 'range', label: 'Ouro a partir de', desc: 'Conquistas com essa pontuação ou mais são ouro.', min: 2, max: 100, def: D.goldPoints, get: () => t.goldPoints, set: (v) => (t.goldPoints = clamp(v, t.silverPoints + 1, 100)), format: pts }
      );
    } else {
      rows.push(
        { type: 'range', label: 'Ouro: obtido por até', desc: 'Conquistas mais raras que isso são ouro.', min: 1, max: 98, def: D.goldPct, get: () => t.goldPct, set: (v) => (t.goldPct = clamp(v, 1, t.silverPct - 1)), format: pct },
        { type: 'range', label: 'Prata: obtido por até', desc: 'Entre o limite do ouro e este valor: prata. Acima: bronze.', min: 2, max: 99, def: D.silverPct, get: () => t.silverPct, set: (v) => (t.silverPct = clamp(v, t.goldPct + 1, 99)), format: pct }
      );
    }
    rows.push(
      { type: 'section', label: 'Raridade (% de jogadores que obtiveram)' },
      {
        type: 'info',
        label: 'Faixas atuais',
        desc: `Ultra raro: até ${t.ultraRarePct}% · Muito raro: até ${t.veryRarePct}% · Raro: até ${t.rarePct}% · Comum: acima de ${t.rarePct}%`,
      },
      { type: 'range', label: 'Ultra raro: até', min: 1, max: 97, def: D.ultraRarePct, get: () => t.ultraRarePct, set: (v) => (t.ultraRarePct = clamp(v, 1, t.veryRarePct - 1)), format: pct },
      { type: 'range', label: 'Muito raro: até', min: 2, max: 98, def: D.veryRarePct, get: () => t.veryRarePct, set: (v) => (t.veryRarePct = clamp(v, t.ultraRarePct + 1, t.rarePct - 1)), format: pct },
      { type: 'range', label: 'Raro: até', min: 3, max: 99, def: D.rarePct, get: () => t.rarePct, set: (v) => (t.rarePct = clamp(v, t.veryRarePct + 1, 99)), format: pct },
      {
        type: 'button',
        icon: Icons.refresh,
        label: 'Restaurar todos os valores recomendados',
        desc: 'Volta o tipo de troféu e todos os sliders acima ao padrão.',
        run: () => {
          Object.assign(t, TROPHY_DEFAULTS);
          this.changed();
          Toast.show('Valores recomendados restaurados', 'Classificação dos troféus', { kind: 'success', ms: 2200, sound: false });
        },
      }
    );
    // Cada slider mostra o valor recomendado na descrição.
    for (const r of rows) if (r.type === 'range') r.desc = `${r.desc ? r.desc + ' ' : ''}Recomendado: ${r.format(r.def)}.`;
    return rows;
  },

  // Volta um slider ao valor recomendado (os vizinhos ainda limitam: a prata não passa do ouro).
  resetRange(el, r) {
    if (r.def === undefined || r.get() === r.def) return;
    this.setRange(el, r, r.def);
    Sound.back();
  },

  raStatusLine(e) {
    if (!e.hasScript) return 'Sem script';
    if (!e.supported) return e.alternative ? `Sem suporte · use ${e.alternative}` : 'Sem suporte';
    if (!e.installed) return 'Não instalado';
    if (e.enabled && e.user) return `✓ Conectado como ${e.user}`;
    return 'Não configurado';
  },

  // Resultado do script de cada emulador, num modal com uma linha por emulador.
  showRaResults(title, results) {
    const icon = { ok: Icons.checkCircle, unsupported: Icons.info, missing: Icons.download, noscript: Icons.info, error: Icons.xCircle };
    const label = { ok: 'Configurado', unsupported: 'Sem suporte', missing: 'Não instalado', noscript: 'Sem script', error: 'Erro' };
    return Modal.open({
      className: 'ra-results',
      html:
        `<h3>${esc(title)}</h3><div class="sub">Resultado dos scripts de cada emulador.</div>` +
        results
          .map(
            (r) =>
              `<div class="menu-item ra-res st-${r.status}"><span class="ico">${icon[r.status] || Icons.info}</span>` +
              `<span class="rr"><b>${esc(r.name)}</b><small>${esc(r.systems.join(', '))}${r.message ? ' · ' + esc(r.message) : r.file ? ' · ' + esc(r.file) : ''}</small></span>` +
              `<span class="r">${label[r.status] || r.status}</span></div>`
          )
          .join('') +
        `<div class="modal-buttons"><button class="btn-pill focusable" data-group="mb">OK</button></div>`,
      onMount: (box) => box.addEventListener('click', (e) => e.target.closest('.btn-pill') && Modal.close()),
    });
  },

  async raLogin() {
    const f = this.raForm;
    if (!f.username || !f.password) {
      Toast.show('Informe usuário e senha', 'A senha é usada só para obter o token de acesso e não fica salva.', { kind: 'raError' });
      return;
    }
    Toast.show('Entrando no RetroAchievements…', f.username, { kind: 'raBusy', ms: 2500 });
    const res = await api.invoke('ra:login', f.username.trim(), f.password, f.apiKey.trim(), this.raStatus && this.raStatus.hardcore);
    f.password = '';
    if (!res.ok) {
      Toast.show('Não foi possível entrar', res.error, { kind: 'raError', ms: 6000 });
      return this.render();
    }
    this.raAvatar = null;
    await this.loadRa();
    this.render();
    const okCount = res.results.filter((r) => r.status === 'ok').length;
    Toast.show(`Conectado como ${res.user}`, `${res.points} pontos · ${okCount} ${okCount === 1 ? 'emulador configurado' : 'emuladores configurados'}`, { kind: 'raLogin' });
    await this.showRaResults('Emuladores configurados', res.results);
  },

  async raAction(channel, arg, title) {
    const res = await api.invoke(channel, arg);
    if (!res.ok) return Toast.show('RetroAchievements', res.error, { kind: 'raError', ms: 6000 });
    await this.loadRa();
    this.render();
    if (res.results && res.results.length && title) await this.showRaResults(title, res.results);
    return res;
  },

  // ---------- otimização ----------

  perfOn: false,

  // Mede só com a aba Otimização visível; em qualquer outro lugar o monitor fica desligado.
  syncPerf() {
    const want = App.view === 'settings' && this.page === 'optimize' && document.visibilityState === 'visible';
    this.perfOn = want;
    if (!want) this.lastPerf = null;
    api.invoke(want ? 'perf:start' : 'perf:stop');
  },

  perfPanelHtml() {
    const card = (k, label) =>
      `<div class="perf-card" data-k="${k}"><div class="pk">${label}</div><div class="pv"><b>—</b></div>` +
      `<div class="pbar"><i></i></div><div class="ps">Medindo…</div>${k === 'cpu' ? '<div class="cores"></div>' : ''}</div>`;
    return (
      `<div class="perf-grid">${card('cpu', 'CPU')}${card('ram', 'Memória RAM')}${card('gpu', 'GPU')}${card('vram', 'Memória de vídeo')}${card('disk', 'Disco')}</div>` +
      `<div class="perf-top"><div class="pk">Programas que mais usam memória</div><div class="perf-list"></div></div>`
    );
  },

  onPerf(d) {
    if (!this.perfOn) return;
    this.lastPerf = d;
    const panel = $('.perf-grid', this.content);
    if (!panel) return;
    const GB = 1073741824;
    const MB = 1048576;
    const set = (k, pct, value, sub) => {
      const c = $(`.perf-card[data-k="${k}"]`, panel);
      if (!c) return;
      const p = Math.max(0, Math.min(100, pct || 0));
      $('.pv', c).innerHTML = value;
      $('.ps', c).textContent = sub;
      const bar = $('.pbar i', c);
      bar.style.transform = `scaleX(${p / 100})`;
      c.dataset.level = p < 60 ? 'ok' : p < 85 ? 'warn' : 'high';
    };
    set('cpu', d.cpu.total, `<b>${d.cpu.total}</b>%`, d.cpu.model);
    $('.perf-card[data-k="cpu"] .cores', panel).innerHTML = d.cpu.per.map((v) => `<span style="--v:${v / 100}" title="${v}%"></span>`).join('');
    const ramPct = Math.round((100 * d.ram.used) / d.ram.total);
    set('ram', ramPct, `<b>${(d.ram.used / GB).toFixed(1)}</b> / ${(d.ram.total / GB).toFixed(1)} GB`, `${ramPct}% em uso · ${((d.ram.total - d.ram.used) / GB).toFixed(1)} GB livres`);
    const info = d.gpuInfo || {};
    if (d.gpu) {
      set('gpu', d.gpu.load, `<b>${d.gpu.load}</b>%`, info.name || 'Uso 3D');
      const used = (d.gpu.dedicated || 0) + (d.gpu.shared || 0);
      // Limite aproximado: VRAM dedicada + até metade da RAM que o Windows pode compartilhar com a GPU.
      const total = info.vram > 0 ? info.vram + d.ram.total / 2 : 0;
      set('vram', total ? (100 * used) / total : 0, `<b>${Math.round(used / MB)}</b> MB`, `Dedicada ${Math.round((d.gpu.dedicated || 0) / MB)} MB · compartilhada ${Math.round((d.gpu.shared || 0) / MB)} MB`);
      set('disk', d.gpu.disk, `<b>${d.gpu.disk}</b>%`, 'Atividade do disco');
    } else {
      for (const k of ['gpu', 'vram', 'disk']) set(k, 0, '<b>…</b>', 'Lendo contadores do Windows…');
    }
    const max = Math.max(1, ...d.top.map((t) => t.memMB));
    $('.perf-list', this.content).innerHTML = d.top
      .map((t) => `<div class="perf-proc"><span class="n">${esc(t.image)}${t.count > 1 ? ` <em>×${t.count}</em>` : ''}</span><span class="b"><i style="transform:scaleX(${t.memMB / max})"></i></span><span class="m">${t.memMB} MB</span></div>`)
      .join('');
  },

  async optimizeNow() {
    const items = await api.invoke('optimize:preview');
    const trim = this.cfg.optimize.trimOthers !== false;
    let names = [];
    if (!items.length) {
      const ok = await Modal.confirm(
        'Nenhum programa da lista está aberto',
        trim ? 'Deseja apenas compactar a memória dos programas abertos?' : 'Ative "Compactar memória dos outros programas" ou adicione programas à lista.',
        { ok: trim ? 'Compactar' : 'OK' }
      );
      if (!ok || !trim) return;
    } else {
      const selected = new Set(items.map((i) => i.name));
      const total = () => items.filter((i) => selected.has(i.name)).reduce((a, i) => a + i.memMB, 0);
      const res = await Modal.open({
        className: 'pick-games',
        html:
          `<h3>Otimizar memória</h3><div class="sub">Estes programas da lista estão abertos e serão fechados. <b class="opt-total"></b>` +
          `<br>Salve seu trabalho antes. ${glyph('a')} marcar · ${glyph('start')} otimizar</div>` +
          `<div class="pick-list">${items
            .map(
              (i) =>
                `<button class="menu-item pick checked focusable" data-group="pick" data-name="${esc(i.name)}"><span class="pick-art opt">${Icons.chip}</span>` +
                `<span class="pick-t">${esc(i.image)}${i.count > 1 ? ` <em class="faint">×${i.count}</em>` : ''}</span><span class="r">${i.memMB} MB<span class="check">${Icons.check}</span></span></button>`
            )
            .join('')}</div>` +
          `<div class="modal-buttons"><button class="btn-pill focusable" data-group="mb" data-done="1">Otimizar agora</button></div>`,
        hints: [['a', 'Marcar'], ['start', 'Otimizar'], ['b', 'Cancelar']],
        onMount: (box) => {
          const upd = () => ($('.opt-total', box).textContent = `Libera até ~${total()} MB.`);
          upd();
          box.addEventListener('click', (e) => {
            if (e.target.closest('[data-done]')) return Modal.close(true);
            const it = e.target.closest('.pick');
            if (!it) return;
            const n = it.dataset.name;
            if (selected.has(n)) selected.delete(n);
            else selected.add(n);
            it.classList.toggle('checked', selected.has(n));
            Sound.toggle();
            upd();
          });
        },
        onButton: (btn) => {
          if (btn !== 'start') return false;
          Modal.close(true);
          return true;
        },
      });
      if (!res) return;
      names = [...selected];
      if (!names.length && !trim) return;
    }
    Toast.show('Otimizando…', names.length ? `Fechando ${names.length} ${names.length === 1 ? 'programa' : 'programas'}.` : 'Compactando memória.', { kind: 'optimizing', ms: 1600 });
    const r = await api.invoke('optimize:run', names, trim);
    Sound.select();
    Toast.show(
      `${r.freedMB} MB liberados`,
      `${r.closed} ${r.closed === 1 ? 'programa fechado' : 'programas fechados'}${trim ? ` · memória de ${r.trimmed} processos compactada` : ''}`,
      { kind: 'optimized', ms: 5000 }
    );
  },

  // ---------- instalação ----------

  progress: {},

  // Versões instalada/última (a última vem da fonte oficial; carrega sem travar a página).
  async loadVersions(force) {
    this.versionsLoading = true;
    const res = await api.invoke('setup:versions', force);
    this.versionsLoading = false;
    if (res.ok) this.versions = res.items;
    if (App.view === 'settings' && this.page === 'setup') this.render();
  },

  versionOf(e) {
    return (this.versions || []).find((v) => v.system === e.system && v.id === e.id) || null;
  },

  // Tags "contínuas" (latest/release) não dizem nada: mostra a data do build.
  fmtVersion(v) {
    if (!v) return '';
    // "release_0_9_13" → "0.9.13", "fceux-2.7.0" → "2.7.0", "v2.8.2" → "2.8.2"
    if (v.version && /\d/.test(v.version)) return v.version.replace(/^[a-z]+[_-]?(?=\d)/i, '').replace(/(\d)_(?=\d)/g, '$1.');
    return v.published ? `build de ${new Date(v.published + 'T12:00').toLocaleDateString('pt-BR')}` : v.version || '';
  },

  emuDesc(e) {
    const v = this.versionOf(e);
    const lines = [`${e.systemName}${v && v.source ? ` · Fonte: ${v.source}` : e.downloadable ? '' : ' · sem download automático'}`];
    const inst = e.installed ? (v && v.installed ? this.fmtVersion(v.installed) || 'versão não identificada' : '…') : 'não instalado';
    const latest = v && v.latest ? (v.latest.error && !v.latest.version ? 'indisponível' : this.fmtVersion(v.latest)) : this.versionsLoading ? 'consultando…' : '—';
    lines.push(e.downloadable ? `Instalada: ${inst} · Última: ${latest}` : `Instalada: ${inst}`);
    return lines.join('\n');
  },

  async syncFolders() {
    Toast.show('Sincronizando emuladores…', 'Procurando executáveis nas pastas dos emuladores.', { kind: 'scan', ms: 1800 });
    const report = await api.invoke('setup:sync');
    await this.reloadSetup();
    await this.loadVersions(true);
    const found = report.filter((r) => r.status === 'found');
    const missing = report.filter((r) => r.status === 'missing');
    Toast.show(
      'Pastas sincronizadas',
      `${report.length - missing.length} instalados${found.length ? ` · ${found.length} encontrados (${found.map((r) => r.name).join(', ')})` : ''}${missing.length ? ` · ${missing.length} sem executável` : ''}`,
      { kind: 'folders', ms: 5000 }
    );
  },

  async updateAll() {
    const st = await api.invoke('setup:status');
    const outdated = st.emulators.filter((e) => {
      const v = this.versionOf(e);
      return e.installed && e.downloadable && v && v.state === 'old';
    });
    if (!outdated.length) return Toast.show('Tudo atualizado', 'Todos os emuladores estão na última versão.', { kind: 'success' });
    const seen = new Set();
    for (const e of outdated) {
      if (seen.has(e.id)) continue; // mGBA/RAVBA/Mesen podem aparecer em mais de um sistema
      seen.add(e.id);
      await this.installEmulator(e, { confirm: false });
    }
  },

  progressText(e) {
    const p = this.progress[e.id];
    if (p) {
      if (p.phase === 'resolve') return 'Consultando…';
      if (p.phase === 'download') return p.pct ? `Baixando ${Math.round(p.pct * 100)}%` : `Baixando ${fmtSize(p.bytes)}`;
      if (p.phase === 'extract') return 'Extraindo…';
      if (p.phase === 'install') return 'Instalando…';
      if (p.phase === 'done') return `✓ Instalado ${p.version || ''}`.trim();
      if (p.phase === 'error') return 'Erro — tente de novo';
    }
    if (!e.downloadable) return e.installed ? 'Instalado' : 'Sem download automático';
    const v = this.versionOf(e);
    const latest = v && v.latest && v.latest.version ? this.fmtVersion(v.latest) : '';
    if (!e.installed) return latest ? `Baixar ${latest}` : 'Baixar';
    if (v && v.state === 'ok') return '✓ Atualizado';
    if (v && v.state === 'old') return latest ? `Atualizar para ${latest}` : 'Atualizar';
    return 'Reinstalar última versão';
  },

  onProgress(p) {
    this.progress[p.id] = p;
    // Um mesmo emulador pode aparecer em mais de um sistema (ex.: mGBA no GBA e no GBC).
    const e = this.setupStatus && this.setupStatus.emulators.find((x) => x.id === p.id);
    if (e) $$(`.set-row[data-id="emu-${p.id}"] .val`, this.content).forEach((row) => (row.innerHTML = `<span>${esc(this.progressText(e))}</span>`));
  },

  async addCatalogSystem(item) {
    if (item.added) return Toast.show(`${item.name} já foi adicionado`, 'Veja em Sistemas e emuladores.', { kind: 'info' });
    const how = await Modal.menu({
      title: `Adicionar ${item.name}`,
      sub: `Cria a pasta roms/${item.id}. Emulador padrão: ${item.emulators[0]}${item.source ? ` (${item.source})` : ''}.`,
      items: [
        { label: `Adicionar e baixar o ${item.emulators[0]}`, icon: Icons.download, right: 'última versão', value: 'download' },
        { label: 'Adicionar e apontar o meu emulador', icon: Icons.folder, right: '.exe já instalado', value: 'point' },
        { label: 'Só adicionar o sistema', icon: Icons.plus, value: 'add' },
      ],
    });
    if (!how) return;
    let exe = null;
    if (how === 'point') {
      exe = await FileBrowser.open({ mode: 'exe', title: `Executável do ${item.emulators[0]} (ou de outro emulador de ${item.name})` });
      if (!exe) return;
    }
    await api.invoke('setup:addSystem', item.id);
    App.config = await api.invoke('config:get');
    const sys = App.config.systems.find((s) => s.id === item.id);
    if (exe) {
      const emuDef = sys.emulators.find((e) => e.id === sys.defaultEmulator) || sys.emulators[0];
      emuDef.exe = await api.invoke('path:portable', exe);
      await api.invoke('config:save', App.config);
    }
    this.systemsDirty = true;
    await this.reloadSetup();
    Toast.show(`${item.name} adicionado`, `Coloque as ROMs em roms/${item.id}.`, { kind: 'systemAdd' });
    const emu = this.setupStatus.emulators.find((e) => e.system === item.id && e.id === sys.defaultEmulator);
    if (how === 'download' && emu && !emu.installed) await this.installEmulator(emu, { confirm: false });
  },

  async reloadSetup() {
    // A instalação pode ter atualizado o caminho do executável no config.json.
    App.config = await api.invoke('config:get');
    this.setupStatus = await api.invoke('setup:status');
    await this.refreshExists();
    if (App.view === 'settings' && this.page === 'setup') this.render();
  },

  async createDirs() {
    const before = (this.setupStatus || (await api.invoke('setup:status'))).dirs.filter((d) => !d.exists).length;
    await api.invoke('setup:createDirs');
    await this.reloadSetup();
    Toast.show('Estrutura de pastas pronta', before ? `${before} pastas criadas em ${App.paths.base}.` : 'Todas as pastas já existiam.', { kind: 'folders' });
  },

  async installEmulator(e, { confirm = true } = {}) {
    if (!e.downloadable) {
      Toast.show('Sem download automático', `${e.name}: escolha o executável em Sistemas e emuladores.`, { kind: 'info' });
      return false;
    }
    const p = this.progress[e.id];
    if (p && !['done', 'error'].includes(p.phase)) return false;
    const v = this.versionOf(e);
    const latest = v && v.latest ? this.fmtVersion(v.latest) : 'mais recente';
    if (
      confirm &&
      e.installed &&
      !(await Modal.confirm(
        `Atualizar ${e.name}?`,
        `Instalada: ${v && v.installed ? this.fmtVersion(v.installed) || '—' : '—'} · Última: ${latest} (${v ? v.source : ''}). Os arquivos do programa serão substituídos; configurações, saves e BIOS são mantidos.`,
        { ok: 'Atualizar' }
      ))
    )
      return false;
    this.onProgress({ id: e.id, phase: 'resolve' });
    const res = await api.invoke('setup:install', e.system, e.id);
    if (res.ok) Toast.show(`${e.name} instalado`, `Versão ${res.version || 'mais recente'} em ${res.exe}`, { kind: 'install' });
    else Toast.show(`Falha ao instalar ${e.name}`, res.error, { kind: 'installFail', ms: 7000 });
    await this.reloadSetup();
    await this.loadVersions(false);
    return res.ok;
  },

  async installMissing() {
    const st = await api.invoke('setup:status');
    const list = st.emulators.filter((e) => !e.installed && e.downloadable);
    if (!list.length) return Toast.show('Nada para baixar', 'Todos os emuladores com download automático já estão instalados.', { kind: 'success' });
    if (st.dirs.some((d) => !d.exists)) await api.invoke('setup:createDirs');
    for (const e of list) await this.installEmulator(e, { confirm: false });
  },

  // Verifica quais executáveis/pastas existem (para o indicador verde/vermelho).
  async refreshExists() {
    const list = [];
    for (const s of this.cfg.systems) {
      list.push(...s.romDirs);
      for (const e of s.emulators) list.push(e.exe);
    }
    const res = await Promise.all(list.map((p) => api.invoke('path:exists', p)));
    this.exists = {};
    list.forEach((p, i) => (this.exists[p] = res[i]));
  },

  focusContent() {
    const first = $('.set-row', this.content);
    if (first) Nav.focus(first);
  },

  // ---------- páginas ----------

  pages: {
    general() {
      const c = this.cfg;
      return [
        { type: 'title', label: 'Geral' },
        { type: 'text', label: 'Nome do perfil', desc: 'Exibido na tela de boas-vindas.', get: () => c.profileName, set: (v) => (c.profileName = v || 'Jogador'), after: () => App.applyProfile() },
        {
          type: 'button',
          label: 'Avatar',
          desc: 'Escolha entre os avatares incluídos ou use uma imagem sua.',
          leadHtml: `<span class="avatar-thumb">${App.avatarUrl ? `<img src="${esc(App.avatarUrl)}" alt="">` : esc((c.profileName || 'J').charAt(0).toUpperCase())}</span>`,
          right: !c.avatar ? 'Inicial do nome' : c.avatar.startsWith('custom:') ? 'Imagem personalizada' : 'Alterar',
          run: () => this.pickAvatar(),
        },
        { type: 'toggle', label: 'Tela cheia', desc: 'Também pode ser alternado com F11.', get: () => c.fullscreen, set: (v) => (c.fullscreen = v) },
        { type: 'toggle', label: 'Tela de boas-vindas', desc: 'Mostra o perfil ao abrir o launcher.', get: () => c.showWelcome, set: (v) => (c.showWelcome = v) },
        { type: 'toggle', label: 'Ocultar launcher durante o jogo', desc: 'Desativado, o launcher apenas minimiza.', get: () => c.hideOnLaunch, set: (v) => (c.hideOnLaunch = v) },
        { type: 'link', label: 'Aparência', desc: 'Tema, animações, imagem de fundo, miniaturas e ícones dos botões.', go: 'appearance' },
        { type: 'section', label: 'Som' },
        { type: 'toggle', label: 'Sons da interface', get: () => c.sounds, set: (v) => (c.sounds = v) },
        {
          type: 'select',
          label: 'Volume',
          options: Array.from({ length: 11 }, (_, i) => ({ v: i * 10, l: `${i * 10}%` })),
          get: () => c.volume,
          set: (v) => (c.volume = v),
          after: () => Sound.select(),
        },
        { type: 'section', label: 'Pastas' },
        {
          type: 'path',
          kind: 'folder',
          relativeTo: 'root',
          label: 'Pasta base',
          desc: `Caminhos relativos partem daqui. Padrão ".." (pasta acima do launcher). Atual: ${App.paths.base}`,
          get: () => c.baseDir,
          set: (v) => (c.baseDir = v || '..'),
          systems: true,
          noCheck: true,
        },
      ];
    },

    systems() {
      const counts = {};
      for (const g of App.games) counts[g.system] = (counts[g.system] || 0) + 1;
      return [
        { type: 'title', label: 'Sistemas e emuladores' },
        ...this.cfg.systems.map((s) => ({
          type: 'link',
          label: s.name,
          swatch: s.color,
          desc: `${s.shortName} · ${counts[s.id] || 0} jogos · ${s.native ? 'executáveis do Windows' : s.emulators.map((e) => e.name).join(', ') || 'sem emulador'}${s.enabled === false ? ' · desativado' : ''}`,
          ok: s.native ? null : s.emulators.length > 0 && s.emulators.every((e) => this.exists[e.exe]),
          go: 'system:' + s.id,
        })),
        { type: 'button', style: 'action', icon: Icons.plus, label: 'Adicionar sistema', run: () => this.addSystem() },
      ];
    },

    system(id) {
      const s = this.cfg.systems.find((x) => x.id === id);
      if (!s) return this.pages.systems.call(this);
      if (s.native) return AddGames.settingsRows(s, this);
      const rows = [
        { type: 'title', label: s.name },
        { type: 'toggle', label: 'Ativado', desc: 'Sistemas desativados não aparecem na biblioteca.', get: () => s.enabled !== false, set: (v) => (s.enabled = v), systems: true },
        { type: 'text', label: 'Nome', get: () => s.name, set: (v) => (s.name = v || s.name) },
        { type: 'text', label: 'Sigla', desc: 'Usada nos filtros e etiquetas (ex.: PS2).', get: () => s.shortName, set: (v) => (s.shortName = v || s.shortName) },
        { type: 'select', label: 'Cor', swatch: true, options: PALETTE.map((p) => ({ v: p, l: p })), get: () => s.color, set: (v) => (s.color = v) },
        { type: 'section', label: 'Jogos' },
        ...s.romDirs.map((d, i) => ({
          type: 'path',
          kind: 'folder',
          label: s.romDirs.length > 1 ? `Pasta de ROMs ${i + 1}` : 'Pasta de ROMs',
          desc: s.romDirs.length > 1 ? 'Subpastas também são lidas. △/Y remove esta pasta.' : 'Subpastas também são lidas.',
          get: () => s.romDirs[i],
          set: (v) => v && (s.romDirs[i] = v),
          remove: s.romDirs.length > 1 ? () => s.romDirs.splice(i, 1) : null,
          systems: true,
        })),
        {
          type: 'button',
          style: 'action',
          icon: Icons.plus,
          label: 'Adicionar pasta de ROMs',
          run: async () => {
            const p = await api.invoke('dialog:pick', { kind: 'folder', title: 'Pasta de ROMs' });
            if (p) {
              s.romDirs.push(p);
              await this.refreshExists();
              this.changed(true);
            }
          },
        },
        {
          type: 'text',
          label: 'Extensões',
          desc: 'Separadas por vírgula. Arquivos citados em .cue/.m3u são agrupados automaticamente.',
          get: () => s.extensions.join(', '),
          set: (v) => (s.extensions = v.split(/[,\s;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean).map((x) => (x.startsWith('.') ? x : '.' + x))),
          systems: true,
        },
        {
          type: 'text',
          label: 'Repositório de capas',
          desc: 'Pasta em thumbnails.libretro.com (ex.: Sony - PlayStation 2). Vazio desativa o download.',
          get: () => s.thumbnailsRepo || '',
          set: (v) => (s.thumbnailsRepo = v.trim()),
        },
        { type: 'section', label: 'Emuladores' },
      ];
      if (s.emulators.length) {
        rows.push({
          type: 'select',
          label: 'Emulador padrão',
          desc: 'Cada jogo pode usar outro emulador pelo menu de opções (△/Y).',
          options: s.emulators.map((e) => ({ v: e.id, l: e.name })),
          get: () => s.defaultEmulator,
          set: (v) => (s.defaultEmulator = v),
        });
      }
      s.emulators.forEach((e, i) => {
        rows.push(
          { type: 'section', label: `${e.name}${e.id === s.defaultEmulator ? ' · padrão' : ''}` },
          { type: 'text', label: 'Nome', get: () => e.name, set: (v) => (e.name = v || e.name) },
          {
            type: 'path',
            kind: 'file',
            label: 'Executável',
            desc: 'A/✕ escolhe o arquivo · □/X edita o caminho como texto.',
            get: () => e.exe,
            set: (v) => v && (e.exe = v),
          },
          {
            type: 'text',
            label: 'Argumentos',
            desc: 'Variáveis: {rom} {romDir} {romName} {baseDir} {exeDir}. Use aspas em caminhos.',
            get: () => e.args,
            set: (v) => (e.args = v),
          },
          { type: 'button', style: 'action', icon: Icons.play, label: 'Abrir emulador', desc: 'Abre sem jogo, para configurar BIOS, controles e vídeo.', run: () => this.openEmulator(e) },
          {
            type: 'button',
            style: 'danger',
            icon: Icons.trash,
            label: 'Remover emulador',
            run: async () => {
              if (!(await Modal.confirm('Remover emulador?', `${e.name} será removido de ${s.name}. Os arquivos não são apagados.`, { ok: 'Remover' }))) return;
              s.emulators.splice(i, 1);
              if (s.defaultEmulator === e.id) s.defaultEmulator = s.emulators[0] ? s.emulators[0].id : '';
              this.changed();
            },
          }
        );
      });
      rows.push(
        { type: 'button', style: 'action', icon: Icons.plus, label: 'Adicionar emulador', run: () => this.addEmulator(s) },
        { type: 'section', label: 'Zona de perigo' },
        {
          type: 'button',
          style: 'danger',
          icon: Icons.trash,
          label: 'Remover sistema',
          run: async () => {
            if (!(await Modal.confirm('Remover sistema?', `${s.name} e seus emuladores serão removidos da configuração. Nenhum arquivo é apagado.`, { ok: 'Remover' }))) return;
            this.cfg.systems = this.cfg.systems.filter((x) => x !== s);
            this.systemsDirty = true;
            this.save();
            this.go('systems');
            this.focusContent();
          },
        }
      );
      return rows;
    },

    setup() {
      const st = this.setupStatus || { dirs: [], emulators: [], base: '' };
      const missing = st.dirs.filter((d) => !d.exists);
      const missingEmus = st.emulators.filter((e) => !e.installed && e.downloadable);
      return [
        { type: 'title', label: 'Instalação' },
        { type: 'info', label: 'Pasta base', desc: st.base, right: 'Altere em Geral › Pasta base' },
        { type: 'section', label: 'Estrutura de pastas' },
        {
          type: 'info',
          label: 'bios · cores · roms · saves · screenshots',
          desc: 'Uma pasta por sistema e por emulador, conforme a configuração de Sistemas e emuladores.',
          leadHtml: `<span class="status-dot${missing.length ? '' : ' ok'}"></span>`,
          right: missing.length ? `${missing.length} de ${st.dirs.length} faltando` : `Completa (${st.dirs.length} pastas)`,
        },
        ...missing.map((d) => ({ type: 'info', label: d.rel, desc: d.label, right: 'Não existe' })),
        {
          type: 'button',
          style: 'action',
          icon: Icons.folder,
          label: missing.length ? 'Criar estrutura de pastas' : 'Recriar pastas que faltarem',
          run: () => this.createDirs(),
        },
        { type: 'button', icon: Icons.folder, label: 'Abrir pasta base', run: () => api.invoke('path:open', '.') },
        { type: 'section', label: 'Emuladores' },
        {
          type: 'button',
          style: 'action',
          icon: Icons.refresh,
          label: 'Sincronizar pastas dos emuladores',
          desc: 'Baixou ou atualizou um emulador por fora? Extraia na pasta dele em cores\\… e sincronize: o PS5 Emu Shell acha o executável e lê a versão.',
          run: () => this.syncFolders(),
        },
        ...st.emulators.map((e) => {
          const v = this.versionOf(e);
          const highlight = e.downloadable && (!e.installed || (v && v.state === 'old'));
          return {
            type: 'button',
            id: 'emu-' + e.id,
            leadHtml: `<span class="ico console-lead">${consoleIcon(e.system)}</span>`,
            label: e.name,
            desc: this.emuDesc(e),
            right: this.progressText(e),
            style: highlight ? 'action' : '',
            run: () => this.installEmulator(e),
          };
        }),
        {
          type: 'button',
          icon: Icons.download,
          label: 'Atualizar todos os desatualizados',
          desc: 'Baixa a última versão de cada emulador que estiver atrás. Configurações, saves e BIOS são mantidos.',
          run: () => this.updateAll(),
        },
        {
          type: 'button',
          style: 'action',
          icon: Icons.plus,
          label: missingEmus.length ? `Baixar os ${missingEmus.length} emuladores que faltam` : 'Todos os emuladores estão instalados',
          desc: 'Baixa a versão mais recente do site oficial / GitHub de cada emulador e instala em modo portable.',
          run: () => this.installMissing(),
        },
        { type: 'section', label: 'Adicionar mais sistemas' },
        {
          type: 'info',
          label: 'Baixe a última versão ou use o seu emulador',
          desc: 'Cada sistema pode baixar o emulador oficial (sempre a versão mais recente) ou apontar para um executável que você já tem. Depois dá para trocar em Sistemas e emuladores.',
        },
        ...(st.catalog || []).map((c) => ({
          type: 'button',
          leadHtml: `<span class="ico console-lead">${consoleIcon(c.id)}</span>`,
          label: c.added ? c.name : `Adicionar ${c.name}`,
          desc: `${c.shortName} · emuladores: ${c.emulators.join(', ')}${c.source ? ` · ${c.source}` : ''}`,
          right: c.added ? '✓ Adicionado' : 'Adicionar',
          style: c.added ? '' : 'action',
          run: () => this.addCatalogSystem(c),
        })),
      ];
    },

    appearance() {
      const c = this.cfg;
      const a = c.appearance;
      const apply = () => App.applyAppearance();
      return [
        { type: 'title', label: 'Aparência' },
        {
          type: 'select',
          label: 'Tema',
          desc: 'Escuro (padrão, como o PS5) ou claro.',
          options: [
            { v: 'dark', l: 'Escuro' },
            { v: 'light', l: 'Claro' },
          ],
          get: () => a.theme,
          set: (v) => (a.theme = v),
          after: apply,
        },
        {
          type: 'toggle',
          label: 'Animações (Motion)',
          desc: 'Seleção deslizante, transições e efeitos. Desligado, tudo muda na hora — mais leve em PCs modestos.',
          get: () => a.motion !== false,
          set: (v) => (a.motion = v),
          after: apply,
        },
        {
          type: 'select',
          label: 'Menu do topo',
          desc: 'Ícones (como no PS5, com L2/R2 nas pontas) ou os nomes Jogos, Biblioteca, Coleções e Troféus.',
          options: [
            { v: 'icons', l: 'Ícones' },
            { v: 'labels', l: 'Nomes' },
          ],
          get: () => (a.topNav === 'labels' ? 'labels' : 'icons'),
          set: (v) => (a.topNav = v),
          after: apply,
        },
        { type: 'section', label: 'Imagens' },
        {
          type: 'toggle',
          label: 'Imagem de fundo do jogo',
          desc: 'Mostra a arte do jogo selecionado no fundo da tela inicial. Desligado, usa um fundo neutro.',
          get: () => a.heroBackground !== false,
          set: (v) => (a.heroBackground = v),
          after: apply,
        },
        {
          type: 'toggle',
          label: 'Miniaturas dos jogos',
          desc: 'Capas baixadas nos cards da tela inicial, Biblioteca e Coleções. Desligado, mostra o nome sobre a cor do sistema.',
          get: () => a.coverArt !== false,
          set: (v) => (a.coverArt = v),
          after: apply,
        },
        {
          type: 'toggle',
          label: 'Partículas de fundo',
          desc: 'Pontos de luz flutuando no fundo (só no tema escuro).',
          get: () => c.particles,
          set: (v) => (c.particles = v),
          after: apply,
        },
        { type: 'section', label: 'Controle' },
        {
          type: 'select',
          label: 'Ícones dos botões',
          desc: 'Como os botões aparecem nas dicas da tela.',
          options: [
            { v: 'auto', l: 'Automático (segue o controle)' },
            { v: 'playstation', l: 'PlayStation', html: `${glyphPreview('playstation')}<span>PlayStation</span>` },
            { v: 'xbox', l: 'Xbox', html: `${glyphPreview('xbox')}<span>Xbox</span>` },
          ],
          get: () => c.buttonGlyphs,
          set: (v) => (c.buttonGlyphs = v),
          after: () => {
            apply();
            App.updateHints();
          },
        },
      ];
    },

    optimize() {
      const o = this.cfg.optimize;
      return [
        { type: 'title', label: 'Otimização' },
        { type: 'panel', html: this.perfPanelHtml() },
        {
          type: 'button',
          style: 'action',
          icon: Icons.gauge,
          label: 'Otimizar memória',
          desc: 'Fecha os programas da lista abaixo que estiverem abertos (você confirma antes) e libera RAM para o jogo.',
          run: () => this.optimizeNow(),
        },
        {
          type: 'toggle',
          label: 'Compactar memória dos outros programas',
          desc: 'Pede ao Windows para devolver a memória ociosa dos programas que continuam abertos. Não fecha nada.',
          get: () => o.trimOthers !== false,
          set: (v) => (o.trimOthers = v),
        },
        { type: 'section', label: `Programas que podem ser fechados (${o.killList.length})` },
        ...o.killList.map((name, i) => ({
          type: 'info',
          label: name,
          desc: name.includes('*') ? 'Coringa: qualquer programa que comece assim' : `${name}.exe`,
          right: '△/Y remove',
          remove: () => o.killList.splice(i, 1),
        })),
        {
          type: 'button',
          style: 'action',
          icon: Icons.plus,
          label: 'Adicionar programa',
          desc: 'Nome do executável sem .exe (veja em "Programas que mais usam memória"). Use * como coringa.',
          run: async () => {
            const v = await Modal.keyboard({ title: 'Programa a fechar (sem .exe)' });
            const name = (v || '').trim().toLowerCase().replace(/\.exe$/, '');
            if (!name || o.killList.includes(name)) return;
            o.killList.push(name);
            this.changed();
          },
        },
        {
          type: 'button',
          icon: Icons.refresh,
          label: 'Restaurar lista padrão',
          run: async () => {
            if (!(await Modal.confirm('Restaurar lista?', 'A lista de programas volta ao padrão do PS5 Emu Shell.', { ok: 'Restaurar' }))) return;
            o.killList = clone(App.defaultOptimize.killList);
            this.changed();
          },
        },
      ];
    },

    retroachievements() {
      const st = this.raStatus || { connected: false, emulators: [] };
      const f = this.raForm;
      const head = st.connected
        ? `<div class="ra-head"><div class="ra-avatar">${this.raAvatar ? `<img src="${esc(this.raAvatar)}" alt="">` : Icons.user}</div>` +
          `<div><div class="ra-k">Conectado</div><div class="ra-user">${esc(st.username)}</div><div class="ra-pts">${st.points} pontos${st.hardcore ? ' · hardcore' : ''}${st.hasApiKey ? '' : ' · sem chave da Web API (aba Troféus desativada)'}</div></div></div>`
        : `<div class="ra-head off"><div class="ra-avatar">${Icons.trophy}</div><div><div class="ra-k">Não conectado</div>` +
          `<div class="ra-pts">Entre com sua conta do retroachievements.org: o PS5 Emu Shell configura e loga a conta em todos os emuladores compatíveis.</div></div></div>`;
      const rows = [
        { type: 'title', label: 'RetroAchievements' },
        { type: 'panel', html: head },
        { type: 'section', label: 'Conta' },
        {
          type: 'text',
          label: 'Usuário',
          get: () => f.username,
          set: (v) => {
            f.username = v.trim();
            // Sem login, o usuário já fica salvo para a aba Troféus (que usa usuário + chave da Web API).
            if (!st.connected && f.username) api.invoke('ra:update', { username: f.username });
          },
        },
        {
          type: 'button',
          label: 'Senha',
          desc: 'Usada só para obter o token de acesso; não é salva.',
          right: f.password ? '•'.repeat(Math.min(12, f.password.length)) : st.connected ? 'Já conectado' : 'Toque para digitar',
          run: async () => {
            const v = await Modal.keyboard({ title: 'Senha do RetroAchievements', mask: true });
            if (v !== null) {
              f.password = v;
              this.render();
            }
          },
        },
        {
          type: 'text',
          label: 'Chave da Web API',
          desc: `Usada pela aba Troféus e salva na hora (não precisa de login). Em retroachievements.org › Settings › Keys › Web API Key.${st.hasApiKey ? `\nSalva: ${st.apiKeyHint}` : ''}`,
          get: () => f.apiKey || (st.hasApiKey ? '••••••••••••••••' : ''),
          set: async (v) => {
            if (!v || /^•+$/.test(v)) return;
            f.apiKey = v.trim();
            const patch = { apiKey: f.apiKey };
            if (!st.connected && f.username) patch.username = f.username;
            await this.raAction('ra:update', patch);
            f.apiKey = '';
            Toast.show('Chave da Web API salva', 'A aba Troféus já pode sincronizar.', { kind: 'raLogin' });
          },
        },
        {
          type: 'toggle',
          label: 'Modo hardcore',
          desc: 'Conquistas valem pontos completos, mas save states, slow-motion e cheats ficam bloqueados nos emuladores.',
          get: () => !!st.hardcore,
          set: (v) => {
            st.hardcore = v;
            if (st.connected) this.raAction('ra:update', { hardcore: v }, v ? 'Hardcore ativado' : 'Hardcore desativado');
          },
        },
        {
          type: 'button',
          style: 'action',
          icon: Icons.trophy,
          label: st.connected ? 'Entrar novamente e reconfigurar' : 'Entrar e configurar emuladores',
          desc: 'Faz login no RetroAchievements e roda o script de cada emulador.',
          run: () => this.raLogin(),
        },
      ];
      if (st.connected) {
        rows.push(
          { type: 'button', icon: Icons.refresh, label: 'Reaplicar nos emuladores', desc: 'Útil depois de instalar ou atualizar um emulador.', run: () => this.raAction('ra:apply', null, 'Emuladores configurados') },
          {
            type: 'button',
            style: 'danger',
            icon: Icons.exit,
            label: 'Sair da conta',
            desc: 'Remove o login de todos os emuladores e apaga o token salvo.',
            run: async () => {
              if (!(await Modal.confirm('Sair do RetroAchievements?', 'O login será removido de todos os emuladores.', { ok: 'Sair' }))) return;
              this.raAvatar = null;
              await this.raAction('ra:logout', null, 'Login removido dos emuladores');
            },
          }
        );
      }
      rows.push(...this.trophyRules());
      rows.push(
        { type: 'section', label: 'Emuladores (um script para cada)' },
        ...st.emulators.map((e) => ({
          type: 'info',
          leadHtml: `<span class="ra-dot ${e.enabled && e.user ? 'on' : e.supported ? '' : 'na'}"></span>`,
          label: e.name,
          desc: e.systems.join(', '),
          right: this.raStatusLine(e),
        }))
      );
      return rows;
    },

    shortcuts() {
      const c = this.cfg;
      const comboRows = (key, label, desc) => {
        const id = (c[key].buttons || []).join('+');
        const other = (c[key === 'killCombo' ? 'homeCombo' : 'killCombo'].buttons || []).join('+');
        return [
          {
            type: 'select',
            label,
            desc: id === other ? '⚠ Igual ao outro atalho — escolha combinações diferentes.' : desc,
            options: (COMBOS.some((o) => o.v === id) ? COMBOS : [...COMBOS, { v: id }]).map((o) => ({ v: o.v, l: buttonName(o.v), html: glyph(o.v) })),
            get: () => id,
            set: (v) => (c[key].buttons = v.split('+')),
          },
          {
            type: 'select',
            label: 'Tempo segurando',
            desc: 'Quanto tempo os botões precisam ficar pressionados juntos.',
            options: HOLD_TIMES.map((ms) => ({ v: ms, l: ms ? `${ms / 1000} s` : 'Imediato' })),
            get: () => c[key].holdMs,
            set: (v) => (c[key].holdMs = v),
          },
        ];
      };
      return [
        { type: 'title', label: 'Atalhos' },
        { type: 'info', label: 'Funcionam durante o jogo', desc: 'O launcher continua lendo o controle mesmo escondido atrás do emulador.' },
        { type: 'section', label: 'Fechar jogo e voltar ao launcher' },
        ...comboRows('killCombo', 'Combinação', 'Encerra o emulador e volta para o launcher.'),
        { type: 'section', label: 'Voltar ao launcher (sem fechar o jogo)' },
        ...comboRows('homeCombo', 'Combinação', 'Mostra o launcher por cima do jogo, com as opções Retomar e Fechar. Repita para voltar ao jogo.'),
        { type: 'section', label: 'Teclado' },
        {
          type: 'toggle',
          label: 'Atalhos de teclado durante o jogo',
          desc: 'Ctrl+Shift+Q fecha o jogo · Ctrl+Shift+L volta ao launcher. Desative se conflitar com algum emulador.',
          get: () => c.keyboardShortcuts !== false,
          set: (v) => (c.keyboardShortcuts = v),
        },
      ];
    },

    controls() {
      const p = App.pads || { slots: [], unassigned: [], sources: { xinput: {}, hid: {} } };
      const connected = [...p.slots.filter((s) => s.connected), ...p.unassigned];
      const connName = (s) => ({ usb: 'USB', bt: 'Bluetooth', xinput: 'XInput' })[s.conn] || '';
      return [
        { type: 'title', label: 'Controles' },
        { type: 'section', label: 'Jogadores' },
        ...p.slots.map((s) => ({
          type: 'button',
          id: `slot-${s.slot}`,
          leadHtml: `<span class="slot-badge${s.connected ? ' on' : ''}" style="--c:${PLAYER_COLORS[s.slot]}">${s.slot + 1}</span>`,
          label: s.empty ? `Jogador ${s.slot + 1} · livre` : `Jogador ${s.slot + 1} · ${s.name}`,
          desc: s.empty
            ? 'Conecte um controle: ele entra sozinho no próximo slot livre. Ou use Autodetectar.'
            : s.connected
              ? `${PAD_TYPES[s.type] ? PAD_TYPES[s.type].name : s.type} · conectado por ${connName(s)}`
              : 'Desconectado · o slot fica reservado; um controle novo só o ocupa se não houver slot vazio.',
          right: s.empty ? '' : s.connected ? '● Conectado' : '○ Desconectado',
          remove: s.empty ? null : () => api.invoke('pads:clear', s.slot).then((l) => (App.pads = l)),
          removeLabel: 'Liberar slot',
          xLabel: s.connected ? 'Testar' : null,
          xRun: s.connected ? () => PadTest.open(s) : null,
          run: () => this.slotMenu(s),
        })),
        ...p.unassigned.map((d) => ({
          type: 'button',
          leadHtml: `<span class="slot-badge">–</span>`,
          label: `${d.name} · sem slot`,
          desc: `Conectado por ${connName(d)}. Todos os slots estão ocupados: escolha um para ele.`,
          run: () => this.slotMenu({ ...d, slot: -1, connected: true }),
        })),
        {
          type: 'button',
          style: 'action',
          icon: Icons.gamepad,
          label: 'Autodetectar controle',
          desc: 'Pressione um botão no controle: ele é reconhecido e colocado no próximo slot livre (ou no que já tinha).',
          run: () => this.detectPad(),
        },
        {
          type: 'button',
          icon: Icons.bolt,
          label: 'Testar controle',
          desc: connected.length ? 'Mostra o diagrama do controle e acende cada botão, direcional, gatilho e analógico pressionado.' : 'Nenhum controle conectado.',
          run: () => this.testPad(),
        },
        {
          type: 'toggle',
          label: 'Associar automaticamente ao conectar',
          desc: 'Todo controle conectado entra sozinho no próximo slot livre. A barra de luz do DualShock 4/DualSense acende na cor do jogador.',
          get: () => p.autoAssign !== false,
          set: (v) => {
            p.autoAssign = v;
            api.invoke('pads:autoAssign', v).then((l) => (App.pads = l));
          },
        },
        {
          type: 'select',
          label: 'Ícones dos botões',
          desc: 'Automático segue o controle em uso: Xbox mostra A/B/X/Y; DualShock 4 e DualSense mostram ✕/○/□/△.',
          options: [
            { v: 'auto', l: 'Automático' },
            { v: 'playstation', l: 'PlayStation', html: `${glyphPreview('playstation')}<span>PlayStation</span>` },
            { v: 'xbox', l: 'Xbox', html: `${glyphPreview('xbox')}<span>Xbox</span>` },
          ],
          get: () => this.cfg.buttonGlyphs,
          set: (v) => (this.cfg.buttonGlyphs = v),
          after: () => {
            App.applyAppearance();
            App.updateHints();
          },
        },
        { type: 'section', label: 'Compatibilidade' },
        {
          type: 'info',
          label: 'Xbox e compatíveis (XInput)',
          desc: p.sources.xinput.available ? 'Leitura direta, inclusive com o launcher oculto atrás do jogo.' : `Indisponível (${p.sources.xinput.error || 'erro'}).`,
          right: p.sources.xinput.available ? 'Ativo' : 'Indisponível',
        },
        {
          type: 'info',
          label: 'DualShock 4 e DualSense (PS4 e PS5)',
          desc: p.sources.hid.available
            ? 'Nativo, por USB ou Bluetooth, sem Steam nem DS4Windows. Os atalhos de fechar/voltar ao launcher também funcionam durante o jogo.'
            : `Indisponível (${p.sources.hid.error || 'erro'}).`,
          right: p.sources.hid.available ? 'Ativo' : 'Indisponível',
        },
        {
          type: 'info',
          label: 'Dentro dos emuladores',
          desc: 'Cada emulador lê o controle por conta própria: DuckStation, PCSX2, PPSSPP e Dolphin aceitam DualShock 4/DualSense nativamente (SDL). A ordem dos jogadores é configurada em cada emulador.',
        },
        {
          type: 'link',
          label: 'Atalhos do launcher',
          desc: 'Fechar o jogo, voltar ao launcher durante o jogo e atalhos de teclado.',
          go: 'shortcuts',
        },
        { type: 'section', label: 'Comandos' },
        ...[
          ['a', 'Confirmar / Jogar'],
          ['b', 'Voltar'],
          ['y', 'Opções do jogo'],
          ['x', 'Favoritar'],
          ['lb+rb', 'Sistema anterior / próximo'],
          ['lt+rt', 'Aba anterior / próxima (Jogos, Biblioteca, Coleções, Troféus)'],
          ['start', 'Configurações'],
          ['back', 'Buscar'],
        ].map(([b, l]) => ({ type: 'info', label: l, glyph: b })),
        { type: 'section', label: 'Teclado e mouse' },
        { type: 'info', label: 'Setas · Enter · Esc', right: 'Navegar · Confirmar · Voltar' },
        { type: 'info', label: 'Q / E · F · O', right: 'Sistema · Favoritar · Opções' },
        { type: 'info', label: 'Ctrl+F · F1 · F11', right: 'Buscar · Configurações · Tela cheia' },
        { type: 'info', label: 'Mouse', right: 'O cursor só aparece ao mexer o mouse' },
      ];
    },

    covers() {
      const c = this.cfg;
      const p = App.coverProgress;
      return [
        { type: 'title', label: 'Capas' },
        { type: 'toggle', label: 'Baixar capas automaticamente', desc: 'Busca capas e imagens de fundo no libretro-thumbnails (requer internet).', get: () => c.coverDownload, set: (v) => (c.coverDownload = v) },
        {
          type: 'info',
          id: 'cover-progress',
          label: 'Status',
          right: p && p.total && p.done < p.total ? `Baixando… ${p.done}/${p.total}` : 'Ocioso',
        },
        {
          type: 'button',
          style: 'action',
          icon: Icons.image,
          label: 'Baixar capas que faltam',
          run: async () => {
            const n = await api.invoke('covers:fetch', null, false);
            Toast.show('Buscando capas', `${n} jogos na fila.`, { kind: 'cover' });
          },
        },
        {
          type: 'button',
          icon: Icons.refresh,
          label: 'Baixar todas novamente',
          run: async () => {
            const n = await api.invoke('covers:fetch', null, true);
            Toast.show('Rebaixando capas', `${n} jogos na fila.`, { kind: 'cover' });
          },
        },
        {
          type: 'button',
          style: 'danger',
          icon: Icons.trash,
          label: 'Limpar cache de capas',
          run: async () => {
            if (!(await Modal.confirm('Limpar cache?', 'As capas baixadas serão apagadas. Imagens manuais são mantidas.', { ok: 'Limpar' }))) return;
            await api.invoke('covers:clear');
            Toast.show('Cache de capas limpo', '', { kind: 'coverClear' });
          },
        },
        { type: 'section', label: 'Imagens manuais' },
        {
          type: 'button',
          icon: Icons.folder,
          label: 'Abrir pasta de capas manuais',
          desc: 'Salve como data/covers/<sistema>/<nome do arquivo da ROM>.png (ou .jpg). Têm prioridade sobre o download.',
          run: () => api.invoke('data:open', 'covers'),
        },
        {
          type: 'button',
          icon: Icons.folder,
          label: 'Abrir pasta de fundos manuais',
          desc: 'data/backgrounds/<sistema>/<nome do arquivo da ROM>.png — usada como fundo da tela inicial.',
          run: () => api.invoke('data:open', 'backgrounds'),
        },
      ];
    },

    library() {
      const counts = {};
      for (const g of App.games) counts[g.system] = (counts[g.system] || 0) + 1;
      return [
        { type: 'title', label: 'Biblioteca' },
        { type: 'info', label: 'Total de jogos', right: String(App.games.length) },
        ...this.cfg.systems.map((s) => ({ type: 'info', label: s.name, swatch: s.color, right: `${counts[s.id] || 0} jogos` })),
        { type: 'section', label: 'Ações' },
        { type: 'button', style: 'action', icon: Icons.refresh, label: 'Buscar jogos novamente', run: () => App.rescan() },
        { type: 'button', icon: Icons.folder, label: 'Abrir pasta de dados do launcher', desc: 'config.json, histórico, cache de capas.', run: () => api.invoke('data:open') },
        {
          type: 'button',
          style: 'danger',
          icon: Icons.trash,
          label: 'Restaurar configuração padrão de sistemas',
          desc: 'Volta os 5 sistemas e 7 emuladores originais.',
          run: async () => {
            if (!(await Modal.confirm('Restaurar sistemas?', 'Suas alterações em sistemas e emuladores serão perdidas.', { ok: 'Restaurar' }))) return;
            this.cfg.systems = clone(App.defaultSystems);
            await this.refreshExists();
            this.changed(true);
          },
        },
      ];
    },

    about() {
      return [
        { type: 'title', label: 'Sobre' },
        { type: 'info', label: 'PS5 Emu Shell', right: `Versão ${App.version}` },
        { type: 'info', label: 'Pasta do launcher', desc: App.paths.root },
        { type: 'info', label: 'Pasta de dados', desc: App.paths.data },
        { type: 'info', label: 'Pasta base dos emuladores', desc: App.paths.base },
        { type: 'info', label: 'Ícones de botões', desc: 'Input Prompts por Kenney (kenney.nl) — licença CC0.' },
        { type: 'section', label: 'Janela' },
        { type: 'button', icon: Icons.expand, label: 'Alternar tela cheia', run: () => api.invoke('window:fullscreen') },
        { type: 'button', style: 'danger', icon: Icons.exit, label: 'Sair do launcher', run: () => App.quit() },
      ];
    },
  },

  // ---------- renderização ----------

  render() {
    const focusedIdx = Nav.current && Nav.current.classList.contains('set-row') ? +Nav.current.dataset.i : null;
    const [kind, arg] = this.page.split(':');
    this.rows = (kind === 'system' ? this.pages.system.call(this, arg) : this.pages[kind].call(this)) || [];
    const crumbs = kind === 'system' ? `Sistemas e emuladores  ›  ${esc((this.cfg.systems.find((s) => s.id === arg) || {}).name || '')}` : '';
    $('#set-crumbs').innerHTML = crumbs;
    this.content.innerHTML = this.rows.map((r, i) => this.rowHtml(r, i)).join('');
    if (focusedIdx != null && !Nav.current.isConnected) {
      const again = $(`.set-row[data-i="${Math.min(focusedIdx, this.rows.length - 1)}"]`, this.content) || $('.set-row', this.content);
      if (again) Nav.focus(again, { silent: true, noScroll: true });
    }
    $$('.set-row', this.content).forEach((el) => {
      const r = this.rows[+el.dataset.i];
      if (r.type === 'select' || r.type === 'toggle') el.navHandler = (dir) => this.adjust(r, dir);
      if (r.type === 'range') el.navHandler = (dir) => this.slide(el, r, dir);
    });
    // Repõe os últimos valores medidos para o painel não piscar vazio após um re-render.
    if (this.lastPerf) this.onPerf(this.lastPerf);
    App.updateHints();
  },

  rowHtml(r, i) {
    if (r.type === 'title') return `<h1 class="set-title">${esc(r.label)}</h1>`;
    if (r.type === 'section') return `<div class="set-section">${esc(r.label)}</div>`;
    if (r.type === 'panel') return `<div class="set-panel">${r.html}</div>`;
    const cls = ['set-row', 'focusable', r.style || ''].join(' ');
    const lead = r.leadHtml ? r.leadHtml : r.glyph ? glyph(r.glyph) : r.icon ? `<span class="ico" style="width:22px;height:22px;flex:none">${r.icon}</span>` : r.swatch && r.type !== 'select' ? `<span class="swatch" style="--c:${esc(r.swatch)}"></span>` : '';
    let val = '';
    switch (r.type) {
      case 'toggle':
        val = `<div class="toggle${r.get() ? ' on' : ''}"></div>`;
        break;
      case 'select': {
        const cur = r.options.find((o) => o.v === r.get()) || { l: String(r.get() ?? '—') };
        const shown = r.swatch ? `<span class="swatch" style="--c:${esc(cur.v)}"></span>` : cur.html || `<span>${esc(cur.l)}</span>`;
        val = `<div class="select-val"><span class="chev">${Icons.chevL}</span>${shown}<span class="chev">${Icons.chevR}</span></div>`;
        break;
      }
      case 'range': {
        const v = r.get();
        val =
          (r.def !== undefined ? `<span class="rng-reset${v === r.def ? ' hidden' : ''}" title="Voltar ao recomendado (${esc(r.format ? r.format(r.def) : r.def)})">${Icons.refresh}</span>` : '') +
          `<span class="rng-val">${esc(r.format ? r.format(v) : v)}</span>` +
          `<input type="range" min="${r.min}" max="${r.max}" step="${r.step || 1}" value="${v}" tabindex="-1" style="--p:${((v - r.min) * 100) / (r.max - r.min)}%">`;
        break;
      }
      case 'text':
        val = `<input type="text" spellcheck="false" value="${esc(r.get())}" tabindex="-1">`;
        break;
      case 'path': {
        const v = r.get();
        const ok = r.noCheck ? null : this.exists[v];
        val = `${ok == null ? '' : `<span class="status-dot${ok ? ' ok' : ''}" title="${ok ? 'Encontrado' : 'Não encontrado'}"></span>`}<span class="text">${esc(v || '—')}</span><span class="arrow">${Icons.folder}</span>`;
        break;
      }
      case 'link':
        val = `${r.ok == null ? '' : `<span class="status-dot${r.ok ? ' ok' : ''}"></span>`}<span class="arrow">${Icons.chevR}</span>`;
        break;
      default:
        val = r.right ? `<span>${esc(r.right)}</span>` : '';
    }
    return (
      `<button class="${cls}" data-group="setrow" data-i="${i}"${r.id ? ` data-id="${r.id}"` : ''}>${lead}` +
      `<div class="lbl"><div class="l">${esc(r.label)}</div>${r.desc ? `<div class="d">${esc(r.desc)}</div>` : ''}</div><div class="val">${val}</div></button>`
    );
  },

  apply(r, v) {
    r.set(v);
    if (r.after) r.after();
    this.changed(!!r.systems);
  },

  adjust(r, dir) {
    if (dir !== 'left' && dir !== 'right') return false;
    if (r.type === 'toggle') {
      const want = dir === 'right';
      if (r.get() !== want) {
        Sound.toggle();
        this.apply(r, want);
      }
      return true;
    }
    const opts = r.options;
    const i = opts.findIndex((o) => o.v === r.get());
    const n = (i + (dir === 'right' ? 1 : -1) + opts.length) % opts.length;
    Sound.toggle();
    this.apply(r, opts[n].v);
    return true;
  },

  // Sliders: ←/→ no controle (com repetição ao segurar) ou arrastar com o mouse.
  slide(el, r, dir) {
    if (dir !== 'left' && dir !== 'right') return false;
    const step = r.step || 1;
    const next = Math.min(r.max, Math.max(r.min, r.get() + (dir === 'right' ? step : -step)));
    this.setRange(el, r, next);
    Sound.toggle();
    return true;
  },

  setRange(el, r, value) {
    r.set(value);
    const v = r.get(); // o set pode ajustar o valor para respeitar os outros limites
    const input = $('input[type="range"]', el);
    if (input) {
      input.value = v;
      input.style.setProperty('--p', `${((v - r.min) * 100) / (r.max - r.min)}%`);
    }
    $('.rng-val', el).textContent = r.format ? r.format(v) : v;
    const reset = $('.rng-reset', el);
    if (reset) reset.classList.toggle('hidden', v === r.def);
    this.save();
    // Re-renderiza só depois que o usuário para de mexer (atualiza resumos e limites dependentes).
    clearTimeout(this.rangeTimer);
    this.rangeTimer = setTimeout(() => this.render(), 450);
  },

  async onRowClick(e) {
    const row = e.target.closest('.set-row');
    if (!row) return;
    const r = this.rows[+row.dataset.i];
    if (!r) return;
    if (Nav.current !== row) Nav.focus(row, { silent: true, noScroll: true });
    switch (r.type) {
      case 'toggle':
        Sound.toggle();
        this.apply(r, !r.get());
        break;
      case 'range':
        if (e.target.closest('.rng-reset')) this.resetRange(row, r);
        break; // ajuste por ←/→ ou arrastando
      case 'select':
        this.adjust(r, 'right');
        break;
      case 'text':
        if (e.target.tagName === 'INPUT') return; // edição direta com mouse/teclado
        await this.editText(r);
        break;
      case 'path': {
        Sound.select();
        const p = await api.invoke('dialog:pick', { kind: r.kind, title: r.label, defaultPath: r.get(), relativeTo: r.relativeTo });
        if (p) {
          r.set(p);
          await this.refreshExists();
          this.changed(!!r.systems);
        }
        break;
      }
      case 'link':
        Sound.select();
        await this.go(r.go);
        this.focusContent();
        break;
      case 'button':
        Sound.select();
        await r.run();
        break;
    }
  },

  async editText(r) {
    const v = await Modal.keyboard({ title: r.label, value: r.get() || '' });
    if (v === null) return;
    if (r.type === 'path') {
      r.set(v);
      await this.refreshExists();
      this.changed(!!r.systems);
    } else this.apply(r, v);
  },

  async pickAvatar() {
    const { base, items } = await api.invoke('avatars:list');
    const cur = this.cfg.avatar || '';
    const initial = esc((this.cfg.profileName || 'J').trim().charAt(0).toUpperCase());
    const opt = (v, inner, extra = '') =>
      `<button class="avatar-opt focusable${extra}${v === cur ? ' current' : ''}" data-group="av" data-v="${esc(v)}">${inner}</button>`;
    const html =
      `<div class="avatar-head"><div class="avatar-preview"></div><div><h3>Escolha seu avatar</h3>` +
      `<div class="sub">${items.length} avatares em launcher\\assets\\avatars — adicione imagens nessa pasta para ter mais opções.</div>` +
      `<div class="avatar-state"></div></div></div>` +
      `<div class="avatar-grid">` +
      items.map((f) => opt(f, `<img src="${esc(base + encodeURIComponent(f))}" alt="" loading="lazy" decoding="async" draggable="false">`)).join('') +
      opt('__custom', Icons.image, ` custom${cur.startsWith('custom:') ? ' current' : ''}`) +
      opt('', `<span style="font-size:34px;font-weight:600">${initial}</span>`, ' custom') +
      `</div>`;
    const v = await Modal.open({
      className: 'avatars',
      html,
      initial: '.avatar-opt.current',
      onMount: (box) => {
        box.addEventListener('click', (e) => {
          const b = e.target.closest('.avatar-opt');
          if (!b) return;
          Sound.select();
          Modal.close(b.dataset.v);
        });
        // Prévia do avatar em foco no cabeçalho.
        box.addEventListener('navfocus', (e) => {
          const b = e.target.closest('.avatar-opt');
          if (!b) return;
          $('.avatar-preview', box).innerHTML = b.innerHTML;
          $('.avatar-state', box).textContent = b.classList.contains('current')
            ? 'Avatar atual'
            : b.dataset.v === '__custom'
              ? 'Escolher uma imagem do computador'
              : b.dataset.v === ''
                ? 'Usar a inicial do nome'
                : 'Pressione para usar este avatar';
        });
      },
    });
    if (v === null) return;
    const value = v === '__custom' ? await api.invoke('avatar:pickCustom') : v;
    if (value === null) return;
    this.cfg.avatar = value;
    this.save();
    await App.applyProfile();
    this.render();
    Toast.show('Avatar atualizado', '', { kind: 'avatar', ms: 2000 });
  },

  // ---------- controles ----------

  async slotMenu(s) {
    const others = [0, 1, 2, 3].filter((i) => i !== s.slot);
    const items = [];
    if (s.connected) items.push({ label: 'Testar controle', icon: Icons.bolt, value: 'test' }, { label: 'Vibrar (identificar)', icon: Icons.gamepad, value: 'rumble' });
    if (s.slot >= 0) items.push({ label: 'Autodetectar para este slot', icon: Icons.refresh, value: 'detect' });
    if (!s.empty) {
      const slots = App.pads.slots;
      items.push(
        ...others.map((i) => ({
          label: s.slot >= 0 ? `Mover para Jogador ${i + 1}` : `Usar como Jogador ${i + 1}`,
          icon: Icons.chevR,
          right: slots[i].empty ? 'livre' : `troca com ${slots[i].name}`,
          value: 'to:' + i,
        }))
      );
    }
    if (s.slot >= 0 && !s.empty) items.push({ label: 'Liberar slot', icon: Icons.trash, value: 'clear' });
    const title = s.slot >= 0 ? `Jogador ${s.slot + 1}` : s.name;
    const v = await Modal.menu({ title, sub: s.empty ? 'Slot livre' : s.name, items });
    if (!v) return;
    if (v === 'test') PadTest.open(s);
    else if (v === 'rumble') api.invoke('pads:rumble', s.key);
    else if (v === 'detect') this.detectPad(s.slot);
    else if (v === 'clear') App.pads = await api.invoke('pads:clear', s.slot);
    else if (v.startsWith('to:')) {
      App.pads = await api.invoke('pads:assign', +v.slice(3), s.key);
      Toast.show('Controle movido', `${s.name} agora é o Jogador ${+v.slice(3) + 1}.`, { kind: 'padOn', ms: 2400 });
    }
    this.render();
  },

  // Sem slot: mantém o que o controle já tinha ou usa o próximo livre.
  async detectPad(slot = null) {
    const dev = await PadTest.detect(slot == null ? 'Autodetectar controle' : `Controle do Jogador ${slot + 1}`, 'Pressione qualquer botão no controle que você quer usar.');
    if (!dev) return Toast.show('Nenhum controle detectado', 'Nenhum botão foi pressionado.', { kind: 'padOff', ms: 2600 });
    App.setPadType(dev.type);
    let target = slot;
    if (target == null) {
      target = dev.slot;
      if (target < 0) target = App.pads.slots.findIndex((s) => s.empty);
      if (target < 0) target = App.pads.slots.findIndex((s) => !s.connected);
    }
    if (target >= 0 && target !== dev.slot) App.pads = await api.invoke('pads:assign', target, dev.key);
    const conn = { usb: 'USB', bt: 'Bluetooth', xinput: 'XInput' }[dev.conn];
    Toast.show('Controle detectado', `${dev.name} · ${conn} · ${target >= 0 ? `Jogador ${target + 1}` : 'todos os slots ocupados'}`, { kind: 'padOn', ms: 3200 });
    this.render();
    const row = target >= 0 && $(`.set-row[data-id="slot-${target}"]`, this.content);
    if (row) Nav.focus(row, { silent: true });
  },

  // Com um só controle conectado, testa direto; com vários, pergunta qual (apertando um botão nele).
  async testPad() {
    const p = App.pads;
    const list = [...p.slots.filter((s) => s.connected), ...p.unassigned];
    if (!list.length) return Toast.show('Nenhum controle conectado', 'Conecte um controle por USB ou Bluetooth.', { kind: 'padOff' });
    if (list.length === 1) return PadTest.open(list[0]);
    const dev = await PadTest.detect('Qual controle testar?', 'Pressione um botão no controle que você quer testar.');
    if (dev) PadTest.open(dev);
  },

  async openEmulator(e) {
    const ok = await api.invoke('emu:open', e.exe);
    if (!ok) Toast.show('Executável não encontrado', e.exe, { kind: 'emuMissing' });
  },

  async addSystem() {
    const name = await Modal.keyboard({ title: 'Nome do novo sistema' });
    if (!name) return;
    let id = slug(name);
    while (this.cfg.systems.some((s) => s.id === id)) id += '2';
    this.cfg.systems.push({
      id,
      name,
      shortName: name.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() || id.toUpperCase(),
      color: PALETTE[this.cfg.systems.length % PALETTE.length],
      enabled: true,
      romDirs: ['roms/' + id],
      extensions: ['.iso', '.zip'],
      thumbnailsRepo: '',
      defaultEmulator: '',
      emulators: [],
    });
    this.systemsDirty = true;
    this.save();
    await this.go('system:' + id);
    this.focusContent();
  },

  async addEmulator(s) {
    const exe = await api.invoke('dialog:pick', { kind: 'file', title: 'Executável do emulador' });
    if (!exe) return;
    const base = exe.split(/[\\/]/).pop().replace(/\.(exe|bat|cmd)$/i, '');
    let id = slug(base);
    while (s.emulators.some((e) => e.id === id)) id += '2';
    s.emulators.push({ id, name: base, exe, args: '"{rom}"' });
    if (!s.defaultEmulator) s.defaultEmulator = id;
    await this.refreshExists();
    this.changed();
    Toast.show('Emulador adicionado', `${base} — confira os argumentos de linha de comando.`, { kind: 'emulator' });
  },

  updateProgress() {
    const row = $('.set-row[data-id="cover-progress"] .val', this.content);
    const p = App.coverProgress;
    if (row) row.innerHTML = `<span>${p && p.total && p.done < p.total ? `Baixando… ${p.done}/${p.total}` : 'Ocioso'}</span>`;
  },

  handleButton(btn) {
    const inContent = Nav.current && this.content.contains(Nav.current);
    const r = inContent ? this.rows[+Nav.current.dataset.i] : null;
    if (btn === 'b') {
      Sound.back();
      if (inContent && this.page.startsWith('system:')) {
        const id = this.page.split(':')[1];
        this.go('systems').then(() => {
          const idx = this.rows.findIndex((x) => x.go === 'system:' + id);
          const el = $(`.set-row[data-i="${idx}"]`, this.content);
          if (el) Nav.focus(el, { silent: true });
        });
      } else if (inContent) {
        Nav.focus($(`#set-nav .side-item[data-page="${this.pageRoot(this.page)}"]`), { silent: true });
      } else {
        this.close();
      }
      return true;
    }
    if (btn === 'y' && r && r.type === 'range' && r.def !== undefined) {
      this.resetRange(Nav.current, r);
      return true;
    }
    if (btn === 'y' && r && r.remove) {
      r.remove();
      Sound.back();
      this.changed(!!r.systems);
      return true;
    }
    if (btn === 'x' && r && r.xRun) {
      Sound.select();
      r.xRun();
      return true;
    }
    if (btn === 'x' && r && r.type === 'path') {
      this.editText(r);
      return true;
    }
    if (btn === 'lb' || btn === 'rb') {
      const i = NAV_PAGES.findIndex((p) => p.id === this.pageRoot(this.page));
      const next = NAV_PAGES[(i + (btn === 'rb' ? 1 : -1) + NAV_PAGES.length) % NAV_PAGES.length];
      Sound.move();
      this.go(next.id).then(() => Nav.focus($(`#set-nav .side-item[data-page="${next.id}"]`), { silent: true }));
      return true;
    }
    if (btn === 'start') {
      Sound.back();
      this.close();
      return true;
    }
    return false;
  },

  hints() {
    const inContent = Nav.current && this.content.contains(Nav.current);
    const r = inContent ? this.rows[+Nav.current.dataset.i] : null;
    const h = [];
    if (r && r.type === 'range') h.push(['lr', 'Ajustar'], ['y', 'Recomendado']);
    else if (r && (r.type === 'select' || r.type === 'toggle')) h.push(['a', 'Alterar']);
    else if (r && r.type === 'text') h.push(['a', 'Editar']);
    else if (r && r.type === 'path') h.push(['a', 'Procurar'], ['x', 'Editar texto']);
    else h.push(['a', 'Selecionar']);
    if (r && r.xRun) h.push(['x', r.xLabel]);
    if (r && r.remove) h.push(['y', r.removeLabel || 'Remover']);
    h.push(['lb+rb', 'Categoria'], ['b', 'Voltar']);
    return h;
  },
};
