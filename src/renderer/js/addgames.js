/* Botão "+": adicionar jogo de PC (executável) ou pasta de ROMs; opções e capas dos jogos de PC. */
const AddGames = {
  async menu() {
    const v = await Modal.menu({
      title: 'Adicionar',
      sub: 'Escolha o que você quer colocar no launcher.',
      items: [
        { label: 'Jogo de PC (executável .exe)', icon: Icons.gamepad, value: 'pc' },
        { label: 'Pasta de ROMs (emuladores)', icon: Icons.folder, value: 'roms' },
      ],
    });
    if (v === 'pc') return this.addPc();
    if (v === 'roms') return this.addRomDir();
  },

  // ---------- jogo de PC ----------

  async addPc() {
    const exe = await FileBrowser.open({ mode: 'exe', title: 'Escolha o executável do jogo' });
    if (!exe) return;
    const info = await api.invoke('pcgames:info', exe);
    const title = await Modal.keyboard({ title: 'Nome do jogo no launcher', value: info.suggestedTitle });
    if (title === null || !title.trim()) return;
    const busy = Toast.show('Adicionando jogo de PC…', title.trim(), { kind: 'scan', ms: 8000, sound: false });
    const res = await api.invoke('pcgames:add', exe, title.trim());
    Toast.dismiss(busy, true);
    if (!res.ok) return Toast.show('Não foi possível adicionar', res.error, { kind: 'error' });
    await this.makeCover(res.id);
    const g = App.byId.get(res.id);
    Toast.show(res.existed ? 'Jogo de PC atualizado' : 'Jogo de PC adicionado', title.trim(), { kind: 'pcAdd', image: g && g.cover });
    this.focusGame(res.id);
  },

  // Leva o foco para o jogo na tela inicial (filtro "PC").
  focusGame(id) {
    if (App.view === 'settings') return;
    App.setView('home');
    Home.setFilter('pc');
    const i = Home.list.findIndex((it) => it.key === id);
    if (i >= 0) Home.select(i);
    Nav.focus(Home.row, { silent: true });
  },

  // Capa quadrada gerada do ícone do .exe: ícone desfocado ao fundo e nítido no centro.
  async makeCover(id) {
    const url = await api.invoke('pcgames:icon', id);
    if (!url) return false;
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      return false;
    }
    const S = 600;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.fillStyle = '#10131c';
    x.fillRect(0, 0, S, S);
    x.filter = 'blur(46px) saturate(1.5)';
    x.drawImage(img, -160, -160, S + 320, S + 320);
    x.filter = 'none';
    x.fillStyle = 'rgba(6, 8, 14, 0.42)';
    x.fillRect(0, 0, S, S);
    const v = x.createRadialGradient(S / 2, S * 0.45, S * 0.1, S / 2, S / 2, S * 0.78);
    v.addColorStop(0, 'rgba(255,255,255,0.10)');
    v.addColorStop(1, 'rgba(0,0,0,0.5)');
    x.fillStyle = v;
    x.fillRect(0, 0, S, S);
    // Ícones pequenos (sem versão 256 px) não são esticados demais.
    const n = img.naturalWidth >= 128 ? 300 : 200;
    x.shadowColor = 'rgba(0,0,0,0.55)';
    x.shadowBlur = 42;
    x.shadowOffsetY = 16;
    x.drawImage(img, (S - n) / 2, (S - n) / 2, n, n);
    await api.invoke('pcgames:saveCover', id, c.toDataURL('image/png'));
    return true;
  },

  // Opções (△) de um jogo de PC.
  async options(game) {
    const st = App.gs(game.id);
    const inCount = Collections.list.filter((c) => c.games.includes(game.id)).length;
    const v = await Modal.menu({
      title: game.title,
      sub: `PC (Windows) · ${game.path}`,
      items: [
        { label: 'Jogar', icon: Icons.play, value: 'play' },
        { label: st.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos', icon: Icons.star, value: 'fav' },
        { label: 'Adicionar à coleção…', icon: Icons.library, right: inCount ? `em ${inCount}` : null, value: 'collection' },
        { label: 'Renomear', icon: Icons.edit || Icons.gear, value: 'rename' },
        { label: 'Trocar executável', icon: Icons.folder, value: 'exe' },
        { label: 'Recriar imagem do ícone', icon: Icons.image, value: 'icon' },
        { label: 'Mostrar arquivo no Explorer', icon: Icons.folder, value: 'folder' },
        { label: 'Informações', icon: Icons.info, value: 'info' },
        { label: 'Remover do launcher', icon: Icons.trash, value: 'remove' },
      ],
    });
    if (v === 'play') App.launch(game, App.view === 'home' ? Home.tiles.get(game.id) : null);
    else if (v === 'fav') App.toggleFavorite(game);
    else if (v === 'collection') Collections.addGameMenu(game);
    else if (v === 'folder') api.invoke('path:open', game.path, true);
    else if (v === 'info') App.gameInfo(game);
    else if (v) await this.manage(game, v);
  },

  async manage(game, v) {
    if (v === 'rename') {
      const t = await Modal.keyboard({ title: 'Nome do jogo no launcher', value: game.title });
      if (t === null || !t.trim() || t.trim() === game.title) return;
      await api.invoke('pcgames:update', game.id, { title: t.trim() });
      Toast.show('Jogo renomeado', t.trim(), { kind: 'pcAdd', image: game.cover });
    } else if (v === 'exe') {
      const exe = await FileBrowser.open({ mode: 'exe', title: `Novo executável de “${game.title}”` });
      if (!exe) return;
      await api.invoke('pcgames:update', game.id, { exe });
      await this.makeCover(game.id);
      Toast.show('Executável trocado', game.title, { kind: 'pcAdd', image: game.cover });
    } else if (v === 'icon') {
      await api.invoke('pcgames:refreshIcon', game.id);
      await this.makeCover(game.id);
      Toast.show('Imagem recriada', game.title, { kind: 'cover', ms: 2200, image: (App.byId.get(game.id) || game).cover });
    } else if (v === 'remove') {
      const ok = await Modal.confirm(`Remover “${game.title}”?`, 'O jogo sai do launcher. Nenhum arquivo do jogo é apagado.', { ok: 'Remover' });
      if (!ok) return;
      await api.invoke('pcgames:remove', game.id);
      Toast.show('Jogo removido do launcher', game.title, { kind: 'collectionRemove' });
    }
    if (App.view === 'settings') Settings.render();
  },

  // Configurações › Sistemas › PC (Windows): os jogos cadastrados e o botão de adicionar.
  settingsRows(s, settings) {
    const games = App.games.filter((g) => g.system === s.id);
    return [
      { type: 'title', label: s.name },
      { type: 'info', label: 'Jogos de PC', desc: 'Executáveis do Windows adicionados pelo botão + (no topo do launcher). O launcher acompanha o jogo até o último processo da pasta dele fechar.' },
      { type: 'select', label: 'Cor', swatch: true, options: PALETTE.map((p) => ({ v: p, l: p })), get: () => s.color, set: (v) => (s.color = v) },
      { type: 'section', label: `Jogos (${games.length})` },
      ...games.map((g) => ({
        type: 'button',
        leadHtml: `<span class="pc-thumb">${g.cover ? `<img src="${esc(g.cover)}" alt="">` : Icons.gamepad}</span>`,
        label: g.title,
        desc: g.path,
        right: '△/Y remove',
        remove: () => this.manage(g, 'remove'),
        run: async () => {
          const v = await Modal.menu({
            title: g.title,
            sub: g.path,
            items: [
              { label: 'Renomear', icon: Icons.gear, value: 'rename' },
              { label: 'Trocar executável', icon: Icons.folder, value: 'exe' },
              { label: 'Recriar imagem do ícone', icon: Icons.image, value: 'icon' },
              { label: 'Remover do launcher', icon: Icons.trash, value: 'remove' },
            ],
          });
          if (v) await this.manage(g, v);
        },
      })),
      { type: 'button', style: 'action', icon: Icons.plus, label: 'Adicionar jogo de PC', run: () => this.addPc() },
    ];
  },

  // ---------- pasta de ROMs ----------

  async addRomDir() {
    const dir = await FileBrowser.open({ mode: 'dir', title: 'Escolha a pasta de ROMs' });
    if (!dir) return;
    const list = await api.invoke('roms:detect', dir);
    const already = list.find((s) => s.already);
    if (already) return Toast.show('Pasta já cadastrada', `Ela já é lida pelo sistema ${already.name}.`, { kind: 'info' });
    // Só recomenda quando há certeza: o nome da pasta bate ou há mais arquivos daquele sistema.
    const [a, b] = list;
    const best = a && a.files && (a.hint > 0 || !b || a.files > b.files) ? a.id : null;
    const v = await Modal.menu({
      title: 'Para qual sistema?',
      sub: dir,
      items: list.map((s) => ({
        label: s.id === best ? `${s.name} (recomendado)` : s.name,
        icon: consoleIcon(s.id),
        right: s.files ? `${s.files} ${s.files === 1 ? 'arquivo' : 'arquivos'} ${s.exts.slice(0, 2).map((e) => e.ext).join(' ')}` : '—',
        value: s.id,
      })),
    });
    if (!v) return;
    const sys = App.system(v);
    sys.romDirs.push(await api.invoke('path:portable', dir));
    await api.invoke('config:save', App.config);
    const before = App.games.filter((g) => g.system === v).length;
    const games = await api.invoke('library:rescan');
    App.setGames(games);
    const now = App.games.filter((g) => g.system === v).length;
    Toast.show('Pasta de ROMs adicionada', `${sys.name} · ${now - before} ${now - before === 1 ? 'jogo novo' : 'jogos novos'}`, { kind: 'library' });
  },
};
