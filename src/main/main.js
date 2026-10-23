const { app, BrowserWindow, ipcMain, dialog, shell, screen, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const paths = require('./paths');

// Mantém todos os dados do Electron dentro da pasta portable.
app.setPath('userData', paths.ensure(paths.file('electron')));

const config = require('./config');
const scanner = require('./scanner');
const covers = require('./covers');
const runner = require('./runner');
const setup = require('./setup');
const perf = require('./perf');
const optimize = require('./optimize');
const ra = require('./retroachievements');
const playtime = require('./playtime');
const { Controllers } = require('./controllers');

if (!app.requestSingleInstanceLock()) app.quit();

let win = null;
let library = [];
const pads = new Controllers();

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function withArt(games) {
  return games.map((g) => ({ ...g, ...covers.resolveArt(g) }));
}

function coverCallbacks() {
  return {
    onUpdate: (id, art) => send('cover', { id, ...art }),
    onProgress: (p) => send('covers:progress', p),
  };
}

function autoCovers() {
  if (config.get().coverDownload) covers.enqueue(library, coverCallbacks());
}

async function rescan() {
  library = await scanner.scan();
  send('library', withArt(library));
  autoCovers();
  return library;
}

function createWindow() {
  const cfg = config.get();
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width: Math.min(1600, width),
    height: Math.min(900, height),
    fullscreen: cfg.fullscreen,
    frame: false,
    show: false,
    backgroundColor: '#04060c',
    title: 'PlayDeck',
    icon: path.join(__dirname, '..', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  if (process.env.EMU_SNAPSHOT) require('./devsnap')(win, app, { pads });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.show());
  // Janela escondida/minimizada ou página recarregada: para de medir.
  win.on('hide', () => perf.stop());
  win.on('minimize', () => perf.stop());
  win.webContents.on('did-start-loading', () => perf.stop());

  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    } else if (input.key === 'F12') {
      win.webContents.toggleDevTools();
      e.preventDefault();
    }
  });
}

function restoreWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  if (config.get().fullscreen) win.setFullScreen(true);
  win.setAlwaysOnTop(true);
  win.focus();
  setTimeout(() => win && win.setAlwaysOnTop(false), 400);
}

// ---- controle ----

// Com um jogo aberto, o launcher pode ser trazido por cima dele ("overlay") sem fechá-lo.
let overlay = false;

function showOverlay() {
  if (!runner.isRunning() || overlay) return;
  overlay = true;
  restoreWindow();
  send('game:overlay', { open: true });
}

function resumeGame() {
  if (!overlay) return;
  overlay = false;
  send('game:overlay', { open: false });
  // Ao esconder a janela, o Windows devolve o foco para a janela do emulador.
  if (win) {
    if (config.get().hideOnLaunch) win.hide();
    else win.minimize();
  }
}

function setupInput() {
  pads.on('press', (button, repeat) => {
    if ((runner.isRunning() && !overlay) || !win || !win.isVisible() || win.isMinimized()) return;
    send('input', { button, repeat });
  });
  pads.on('connect', (p) => send('pad', { ...p, connected: true }));
  pads.on('disconnect', (p) => send('pad', { ...p, connected: false }));
  pads.on('change', () => send('pads:changed', pads.list()));
  pads.on('active', (type) => send('pads:active', type));
  pads.on('state', (st) => send('pads:state', st));

  // Combos segurados durante o jogo: fechar o emulador / mostrar o launcher.
  const shortcuts = [
    { key: 'killCombo', run: () => runner.kill() },
    { key: 'homeCombo', run: () => (overlay ? resumeGame() : showOverlay()) },
  ].map((s) => ({ ...s, since: 0, fired: false }));
  setInterval(() => {
    const sets = pads.heldSets();
    for (const s of shortcuts) {
      const combo = config.get()[s.key] || {};
      const buttons = combo.buttons || [];
      const all = buttons.length && sets.some((held) => buttons.every((b) => held.has(b)));
      if (!all || !runner.isRunning()) {
        s.since = 0;
        s.fired = false;
        continue;
      }
      if (!s.since) s.since = Date.now();
      if (!s.fired && Date.now() - s.since >= (combo.holdMs ?? 1000)) {
        s.fired = true;
        s.run();
      }
    }
  }, 40);
  pads.start();
}

// Atalhos de teclado globais, ativos só enquanto um jogo está aberto.
const KEYBOARD_SHORTCUTS = {
  'CommandOrControl+Shift+Q': () => runner.kill(),
  'CommandOrControl+Shift+L': () => (overlay ? resumeGame() : showOverlay()),
};

function setKeyboardShortcuts(on) {
  for (const [accel, fn] of Object.entries(KEYBOARD_SHORTCUTS)) {
    if (on && config.get().keyboardShortcuts !== false) {
      if (!globalShortcut.isRegistered(accel)) globalShortcut.register(accel, fn);
    } else if (globalShortcut.isRegistered(accel)) globalShortcut.unregister(accel);
  }
}

// ---- IPC ----

function setupIpc() {
  ipcMain.handle('app:init', () => ({
    config: config.get(),
    stats: config.getStats(),
    library: withArt(library),
    xinput: { available: pads.available, error: pads.xinput.error, count: pads.connectedCount() },
    pads: pads.list(),
    paths: { root: paths.root, data: paths.data, base: config.baseDir() },
    defaultSystems: require('./defaults')().systems,
    defaultOptimize: require('./defaults')().optimize,
    version: app.getVersion(),
  }));

  ipcMain.handle('library:rescan', async () => withArt(await rescan()));

  // Controles: slots de jogador, autodetectar, teste e vibração.
  ipcMain.handle('pads:list', () => pads.list());
  ipcMain.handle('pads:assign', (e, slot, key) => pads.assign(slot, key));
  ipcMain.handle('pads:clear', (e, slot) => pads.clear(slot));
  ipcMain.handle('pads:autoAssign', (e, on) => pads.setAutoAssign(on));
  ipcMain.handle('pads:detect', () => pads.detect());
  ipcMain.handle('pads:cancelDetect', () => pads.cancelDetect());
  ipcMain.handle('pads:watch', (e, key) => pads.watch(key));
  ipcMain.handle('pads:rumble', (e, key) => pads.rumble(key));

  // Avatares: imagens em launcher/assets/avatars, mais uma imagem personalizada em data/.
  ipcMain.handle('avatars:list', () => {
    const dir = path.join(paths.root, 'assets', 'avatars');
    let items = [];
    try {
      items = fs.readdirSync(dir).filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f)).sort();
    } catch {}
    return { base: pathToFileURL(dir + path.sep).href, items };
  });

  ipcMain.handle('avatar:pickCustom', async () => {
    const res = await dialog.showOpenDialog(win, {
      title: 'Escolher imagem de avatar',
      properties: ['openFile'],
      filters: [{ name: 'Imagens', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
    });
    if (res.canceled || !res.filePaths[0]) return null;
    const ext = path.extname(res.filePaths[0]).toLowerCase();
    paths.ensure(paths.data);
    for (const f of fs.readdirSync(paths.data)) if (f.startsWith('avatar-custom.')) fs.rmSync(paths.file(f), { force: true });
    const dest = paths.file('avatar-custom' + ext);
    fs.copyFileSync(res.filePaths[0], dest);
    return 'custom:avatar-custom' + ext;
  });

  ipcMain.handle('avatar:url', (_e, value) => {
    if (!value) return null;
    const file = value.startsWith('custom:')
      ? paths.file(value.slice(7))
      : path.join(paths.root, 'assets', 'avatars', value);
    if (!fs.existsSync(file)) return null;
    return pathToFileURL(file).href + '?v=' + Math.round(fs.statSync(file).mtimeMs);
  });

  ipcMain.handle('config:get', () => config.get());

  // Coleções: [{ id, name, games: [gameId], created }]
  ipcMain.handle('collections:get', () => config.readJson(paths.file('collections.json'), []));
  ipcMain.handle('collections:save', (_e, list) => {
    config.writeJson(paths.file('collections.json'), list);
    return true;
  });

  ipcMain.handle('config:save', (_e, next) => {
    const prevFullscreen = config.get().fullscreen;
    config.save(next);
    if (win && next.fullscreen !== prevFullscreen) win.setFullScreen(!!next.fullscreen);
    return true;
  });

  ipcMain.handle('stats:update', (_e, id, patch) => config.updateGameStats(id, patch));

  ipcMain.handle('game:launch', (_e, id) => {
    const game = library.find((g) => g.id === id);
    if (!game) return { ok: false, error: 'Jogo não encontrado na biblioteca.' };
    const override = (config.getStats().games[id] || {}).emulator;
    const res = runner.start(game, override, (info) => {
      const stats = playtime.finish(id, info.duration);
      overlay = false;
      setKeyboardShortcuts(false);
      restoreWindow();
      send('game:state', { running: false, id, code: info.code, duration: info.duration, error: info.error, stats });
    });
    if (!res.ok) return res;
    perf.stop();
    setKeyboardShortcuts(true);
    const prev = config.getStats().games[id] || {};
    config.updateGameStats(id, { lastPlayed: Date.now(), playCount: (prev.playCount || 0) + 1 });
    playtime.start(id);
    const stats = config.getStats().games[id];
    send('game:state', { running: true, id, stats });
    setTimeout(() => {
      if (!runner.isRunning() || !win) return;
      if (config.get().hideOnLaunch) win.hide();
      else win.minimize();
    }, 1100);
    return { ...res, stats };
  });

  ipcMain.handle('setup:status', () => ({
    dirs: setup.expectedDirs(),
    emulators: setup.emulatorStatus(),
    catalog: setup.catalogStatus(),
    base: config.baseDir(),
  }));
  ipcMain.handle('setup:addSystem', (_e, id) => setup.addCatalogSystem(id));
  ipcMain.handle('setup:versions', async (_e, force) => {
    try {
      return { ok: true, items: await setup.versionReport(force) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
  // Instalações feitas por fora: acha os executáveis nas pastas e, com RA conectado, já configura o login.
  ipcMain.handle('setup:sync', async () => {
    const report = await setup.syncEmulators();
    const acc = ra.account();
    if (acc && acc.token && !runner.isRunning()) {
      for (const r of report.filter((x) => x.status === 'found')) {
        try {
          ra.applyOne(r.id);
        } catch {}
      }
    }
    return report;
  });
  ipcMain.handle('setup:createDirs', () => setup.createStructure());
  ipcMain.handle('setup:install', async (_e, systemId, emulatorId) => {
    if (runner.isRunning()) return { ok: false, error: 'Feche o jogo antes de instalar emuladores.' };
    try {
      const res = await setup.installEmulator(systemId, emulatorId, (p) => send('setup:progress', { id: emulatorId, ...p }));
      // Com conta do RetroAchievements conectada, já deixa o emulador novo logado.
      const acc = ra.account();
      if (res.ok && acc && acc.token) {
        try {
          res.ra = ra.applyOne(emulatorId);
        } catch {}
      }
      return res;
    } catch (e) {
      send('setup:progress', { id: emulatorId, phase: 'error', error: e.message });
      return { ok: false, error: e.message };
    }
  });

  // Monitor de recursos: só roda enquanto a aba Otimização está aberta.
  ipcMain.handle('perf:start', () => perf.start(send));
  ipcMain.handle('perf:stop', () => perf.stop());
  ipcMain.handle('optimize:preview', () => optimize.preview(config.get().optimize.killList, [runner.pid()].filter(Boolean)));
  ipcMain.handle('optimize:run', (_e, names, trim) =>
    optimize.run(names, { trim, protectPids: [runner.pid()].filter(Boolean) })
  );

  // RetroAchievements: conta, scripts dos emuladores e dados da aba Troféus.
  const safe = (fn) => async (...args) => {
    try {
      return { ok: true, ...(await fn(...args)) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };
  ipcMain.handle('ra:status', () => ra.status());
  ipcMain.handle('ra:login', safe((_e, u, p, key, hardcore) => ra.login(u, p, key, hardcore)));
  ipcMain.handle('ra:apply', safe(() => ({ results: ra.applyAll() })));
  ipcMain.handle('ra:logout', safe(() => ({ results: ra.logout() })));
  ipcMain.handle('ra:update', safe((_e, patch) => ({ results: ra.update(patch) })));
  ipcMain.handle('ra:overview', safe((_e, force) => ra.overview(force)));
  ipcMain.handle('ra:game', safe((_e, id, force) => ra.game(id, force)));
  ipcMain.handle('ra:images', (_e, rels) => ra.images(rels));

  ipcMain.handle('game:kill', () => runner.kill());
  ipcMain.handle('game:resume', () => resumeGame());
  ipcMain.handle('game:overlay', () => showOverlay());

  ipcMain.handle('covers:fetch', (_e, ids, force) => {
    const set = ids ? new Set(ids) : null;
    const games = set ? library.filter((g) => set.has(g.id)) : library;
    covers.enqueue(games, { force: !!force, ...coverCallbacks() });
    return games.length;
  });

  ipcMain.handle('covers:clear', async () => {
    await covers.clearCache();
    send('library', withArt(library));
    return true;
  });

  ipcMain.handle('dialog:pick', async (_e, { kind, title, defaultPath, filters, relativeTo }) => {
    const fromRoot = relativeTo === 'root';
    const res = await dialog.showOpenDialog(win, {
      title,
      defaultPath: defaultPath
        ? fromRoot ? path.resolve(paths.root, defaultPath) : config.resolve(defaultPath)
        : config.baseDir(),
      properties: [kind === 'folder' ? 'openDirectory' : 'openFile'],
      filters: kind === 'folder' ? undefined : filters || [{ name: 'Executáveis', extensions: ['exe', 'bat', 'cmd'] }],
    });
    if (res.canceled || !res.filePaths[0]) return null;
    const picked = res.filePaths[0];
    // A pasta base é guardada relativa à pasta do launcher, para continuar portable.
    if (fromRoot) return path.relative(paths.root, picked).split(path.sep).join('/') || '.';
    return config.toPortable(picked);
  });

  ipcMain.handle('path:exists', (_e, p) => !!p && fs.existsSync(config.resolve(p)));

  ipcMain.handle('path:open', (_e, p, select) => {
    const full = config.resolve(p);
    if (select) shell.showItemInFolder(full);
    else shell.openPath(fs.existsSync(full) ? full : path.dirname(full));
    return true;
  });

  ipcMain.handle('data:open', (_e, sub) => {
    const dir = paths.ensure(sub ? paths.file(sub) : paths.data);
    shell.openPath(dir);
    return true;
  });

  ipcMain.handle('emu:open', (_e, exe) => {
    const full = config.resolve(exe);
    if (!fs.existsSync(full)) return false;
    spawn(full, [], { cwd: path.dirname(full), detached: true, stdio: 'ignore' }).unref();
    return true;
  });

  ipcMain.handle('args:preview', (_e, template) =>
    runner.buildArgs(template, { rom: 'C:\\...\\jogo.iso', romDir: 'C:\\...', romName: 'jogo', baseDir: config.baseDir(), exeDir: '...' })
  );

  ipcMain.handle('window:fullscreen', () => {
    if (win) win.setFullScreen(!win.isFullScreen());
    return win && win.isFullScreen();
  });

  ipcMain.handle('app:quit', () => app.quit());
}

app.on('second-instance', () => restoreWindow());

app.whenReady().then(() => {
  config.load();
  config.getStats();
  playtime.recover();
  library = scanner.cached();
  setupIpc();
  setupInput();
  createWindow();
  // Rescan em segundo plano: a UI abre com o cache e recebe a lista atualizada.
  rescan().catch((e) => console.error(e));
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  perf.stop();
});

app.on('window-all-closed', () => {
  pads.stop();
  app.quit();
});
