// Estrutura de pastas (bios/cores/roms/saves/screenshots) e download/instalação dos emuladores.
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { once } = require('events');
const { execFile } = require('child_process');
const config = require('./config');
const paths = require('./paths');

const HEADERS = { 'User-Agent': 'PlayDeck-Launcher' };
// Sistemas que precisam de pasta de BIOS (os demais podem ativar com "bios": true no config.json).
const BIOS_SYSTEMS = ['psx', 'ps2', 'nds'];

// Onde baixar cada emulador conhecido (pelo id do emulador no config).
// exe: como reconhecer o executável dentro do pacote; portable: arquivos que ativam o modo portable.
const SOURCES = {
  duckstation: { github: 'stenzek/duckstation', asset: /windows-x64-release\.zip$/i, exe: /^duckstation-qt.*\.exe$/i, portable: ['portable.txt'] },
  pcsx2: { github: 'PCSX2/pcsx2', asset: /windows-x64-Qt\.7z$/i, exe: /^pcsx2-qt\.exe$/i, portable: ['portable.ini'] },
  ppsspp: { github: 'hrydgard/ppsspp', asset: /Windows-x64\.zip$/i, exe: /^PPSSPPWindows64\.exe$/i, portable: [] },
  melonds: { github: 'melonDS-emu/melonDS', asset: /windows-x86_64\.zip$/i, exe: /^melonDS\.exe$/i, portable: ['portable'] },
  desmume: { github: 'TASEmulators/desmume', asset: /win64\.zip$/i, exe: /^DeSmuME.*x64.*\.exe$/i, portable: [] },
  noods: { github: 'Hydr8gon/NooDS', asset: /windows\.zip$/i, exe: /^noods\.exe$/i, portable: [] },
  dolphin: { page: 'https://dolphin-emu.org/download/', link: /href="([^"]*x64\.7z)"/i, exe: /^Dolphin\.exe$/i, portable: ['portable.txt'] },
  mgba: { github: 'mgba-emu/mgba', asset: /win64\.7z$/i, exe: /^mGBA\.exe$/i, portable: ['portable.ini'] },
  mesen: { github: 'SourMesen/Mesen2', asset: /_Windows\.zip$/i, exe: /^Mesen\.exe$/i, portable: [] },
  fceux: { github: 'TASEmulators/fceux', asset: /win64\.zip$/i, exe: /^fceux(64)?\.exe$/i, portable: [] },
  snes9x: { github: 'snes9xgit/snes9x', asset: /win32-x64\.zip$/i, exe: /^snes9x-x64\.exe$/i, portable: [] },
  // Emuladores oficiais do RetroAchievements (ID do cliente no dorequest latestclient) + DLL RAIntegration.
  ranes: { ra: 5, exe: /^RANes\.exe$/i, portable: [], raIntegration: true },
  rasnes9x: { ra: 2, exe: /^RASnes9x\.exe$/i, portable: [], raIntegration: true },
  ravba: { ra: 3, exe: /^RAVisualBoyAdvance-M\.exe$/i, portable: [], raIntegration: true },
};

// Adiciona um sistema do catálogo (defaults.catalog) à configuração e cria suas pastas.
function addCatalogSystem(id) {
  const def = require('./defaults').catalog().find((s) => s.id === id);
  if (!def) throw new Error('Sistema desconhecido.');
  const cfg = config.get();
  if (!cfg.systems.some((s) => s.id === id)) {
    cfg.systems.push(def);
    config.save(cfg);
  }
  createStructure();
  return def;
}

function catalogStatus() {
  const have = new Set(config.get().systems.map((s) => s.id));
  return require('./defaults')
    .catalog()
    .map((s) => ({ id: s.id, name: s.name, shortName: s.shortName, emulators: s.emulators.map((e) => e.name), added: have.has(s.id) }));
}

function isRelative(p) {
  return p && !path.isAbsolute(p);
}

// Lista de pastas esperadas a partir da configuração atual.
function expectedDirs() {
  const cfg = config.get();
  const map = new Map();
  const add = (rel, label) => {
    const key = rel.replace(/\\/g, '/').replace(/\/+$/, '');
    if (!map.has(key)) map.set(key, label);
  };
  for (const sys of cfg.systems) {
    if (sys.enabled === false) continue;
    for (const d of sys.romDirs || []) if (isRelative(d)) add(d, `ROMs · ${sys.name}`);
    add(`saves/${sys.id}`, `Saves · ${sys.name}`);
    if (sys.bios ?? BIOS_SYSTEMS.includes(sys.id)) add(`bios/${sys.id}`, `BIOS · ${sys.name}`);
    for (const e of sys.emulators || []) if (isRelative(e.exe)) add(path.posix.dirname(e.exe.replace(/\\/g, '/')), `Emulador · ${e.name}`);
  }
  add('screenshots', 'Capturas de tela');
  return [...map].map(([rel, label]) => {
    const abs = config.resolve(rel);
    return { rel, label, exists: fs.existsSync(abs) };
  });
}

function createStructure() {
  for (const d of expectedDirs()) if (!d.exists) fs.mkdirSync(config.resolve(d.rel), { recursive: true });
  return expectedDirs();
}

// Estado de cada emulador: instalado? existe fonte de download?
function emulatorStatus() {
  const out = [];
  for (const sys of config.get().systems) {
    for (const e of sys.emulators || []) {
      out.push({
        system: sys.id,
        systemName: sys.name,
        id: e.id,
        name: e.name,
        exe: e.exe,
        installed: !!e.exe && fs.existsSync(config.resolve(e.exe)),
        downloadable: !!SOURCES[e.id],
      });
    }
  }
  return out;
}

// ---- download ----

async function resolveDownload(src) {
  if (src.ra) {
    const { version, url } = await require('./retroachievements/api').latest('client', src.ra);
    if (!url) throw new Error('Download não encontrado no RetroAchievements.');
    return { url, name: decodeURIComponent(url.split('/').pop()), version };
  }
  if (src.github) {
    const r = await fetch(`https://api.github.com/repos/${src.github}/releases/latest`, { headers: HEADERS });
    if (!r.ok) throw new Error(`GitHub respondeu ${r.status}`);
    const rel = await r.json();
    const asset = (rel.assets || []).find((a) => src.asset.test(a.name));
    if (!asset) throw new Error('Pacote para Windows não encontrado na última versão.');
    // Alguns projetos usam tags "contínuas" (ex.: "latest", "release"): a data identifica o build.
    return { url: asset.browser_download_url, name: asset.name, version: rel.tag_name, published: (asset.updated_at || rel.published_at || '').slice(0, 10) };
  }
  const r = await fetch(src.page, { headers: HEADERS });
  if (!r.ok) throw new Error(`Site respondeu ${r.status}`);
  const m = (await r.text()).match(src.link);
  if (!m) throw new Error('Link de download não encontrado no site oficial.');
  const url = new URL(m[1], src.page).href;
  const version = (url.match(/(\d[\w.-]*?)-x64/) || [])[1] || '';
  // Versões do Dolphin são AAMM (ex.: 2609a = set/2026): vira a data aproximada do lançamento.
  const ym = version.match(/^(\d{2})(\d{2})/);
  const published = ym && +ym[2] >= 1 && +ym[2] <= 12 ? `20${ym[1]}-${ym[2]}-01` : '';
  return { url, name: decodeURIComponent(url.split('/').pop()), version, published };
}

async function download(url, dest, onProgress) {
  const res = await fetch(url, { headers: HEADERS, redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`Download falhou (${res.status})`);
  const total = +res.headers.get('content-length') || 0;
  let got = 0;
  let last = 0;
  const out = fs.createWriteStream(dest);
  try {
    for await (const chunk of res.body) {
      got += chunk.length;
      if (!out.write(chunk)) await once(out, 'drain');
      if (Date.now() - last > 150) {
        last = Date.now();
        onProgress(total ? got / total : 0, got);
      }
    }
  } finally {
    out.end();
    await once(out, 'finish');
  }
}

function sevenZip() {
  // Empacotado, o binário fica em app.asar.unpacked.
  return require('7zip-bin').path7za.replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep);
}

function extract(archive, dir) {
  return new Promise((resolve, reject) => {
    execFile(sevenZip(), ['x', '-y', `-o${dir}`, archive], { windowsHide: true, maxBuffer: 1 << 26 }, (err) =>
      err ? reject(new Error('Falha ao extrair o pacote: ' + err.message)) : resolve()
    );
  });
}

async function findFile(dir, re) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const e of entries) if (e.isFile() && re.test(e.name)) return path.join(dir, e.name);
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const hit = await findFile(path.join(dir, e.name), re);
    if (hit) return hit;
  }
  return null;
}

// ---- versões: fonte, última disponível, instalada; sincronização de instalações manuais ----

const VERSION_FILE = 'playdeck-version.json';
const LATEST_TTL = 60 * 60 * 1000;
const latestCache = { at: 0, items: {} };

function sourceLabel(src) {
  if (!src) return '';
  if (src.ra) return 'retroachievements.org';
  if (src.github) return `github.com/${src.github}`;
  return new URL(src.page).hostname;
}

// Última versão de cada emulador conhecido, consultada na fonte oficial (cache de 1 h).
async function latestVersions(force) {
  const file = paths.file('cache', 'latest-versions.json');
  if (!latestCache.at) Object.assign(latestCache, config.readJson(file, { at: 0, items: {} }));
  const stale = force || Date.now() - latestCache.at > LATEST_TTL;
  const ids = Object.keys(SOURCES).filter((id) => stale || !latestCache.items[id]);
  let i = 0;
  const worker = async () => {
    while (i < ids.length) {
      const id = ids[i++];
      try {
        const r = await resolveDownload(SOURCES[id]);
        latestCache.items[id] = { version: r.version, published: r.published || '', file: r.name };
      } catch (e) {
        latestCache.items[id] = { ...(latestCache.items[id] || {}), error: e.message };
      }
    }
  };
  if (ids.length) {
    await Promise.all([worker(), worker(), worker()]);
    latestCache.at = Date.now();
    config.writeJson(file, latestCache);
  }
  return latestCache.items;
}

// Versão gravada no .exe (FileVersion/ProductVersion), lida de uma vez via PowerShell.
function exeVersions(files) {
  return new Promise((resolve) => {
    if (!files.length) return resolve({});
    const script =
      '$f = $env:PD_FILES | ConvertFrom-Json; $o = @{}; foreach ($p in $f) { try { $v = (Get-Item -LiteralPath $p).VersionInfo; ' +
      '$o[$p] = if ($v.ProductVersion) { $v.ProductVersion } else { $v.FileVersion } } catch {} }; $o | ConvertTo-Json -Compress';
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, env: { ...process.env, PD_FILES: JSON.stringify(files) } },
      (err, out) => {
        try {
          resolve(JSON.parse(out || '{}') || {});
        } catch {
          resolve({});
        }
      }
    );
  });
}

// Versão instalada: o registro do PlayDeck vale só se o .exe não foi trocado depois (instalação manual).
async function installedVersions() {
  const items = emulatorStatus().filter((e) => e.installed);
  const result = {};
  const needExe = [];
  for (const e of items) {
    const exe = config.resolve(e.exe);
    const rec = config.readJson(path.join(path.dirname(exe), VERSION_FILE), null);
    const mtime = fs.statSync(exe).mtimeMs;
    if (rec && rec.exe && rec.exe.toLowerCase() === path.basename(exe).toLowerCase() && mtime <= rec.installedAt + 120000) {
      result[e.system + '/' + e.id] = { version: rec.version, published: rec.published, by: 'playdeck' };
    } else {
      needExe.push({ key: e.system + '/' + e.id, exe, mtime });
    }
  }
  const versions = await exeVersions(needExe.map((n) => n.exe));
  for (const n of needExe) {
    const v = (versions[n.exe] || '').trim();
    result[n.key] = { version: v, published: new Date(n.mtime).toISOString().slice(0, 10), by: v ? 'exe' : 'date' };
  }
  return result;
}

const nums = (s) => (String(s || '').match(/\d+/g) || []).map(Number);

// 'ok' (atualizado), 'old' (há versão nova) ou 'unknown' (não dá para comparar).
function compare(inst, latest) {
  if (!inst || !latest || !latest.version) return 'unknown';
  if (inst.by === 'playdeck') {
    if (inst.version !== latest.version) return 'old';
    return !latest.published || !inst.published || inst.published >= latest.published ? 'ok' : 'old';
  }
  const a = nums(inst.version);
  const b = nums(latest.version);
  if (a.length >= 2 && b.length >= 2) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const x = a[i] || 0;
      const y = b[i] || 0;
      if (x !== y) return x > y ? 'ok' : 'old';
    }
    return 'ok';
  }
  // Sem números comparáveis (tags "latest"/"release" ou exe sem versão): compara a data do
  // executável com a data do último lançamento (1 dia de tolerância).
  if (inst.published && latest.published) {
    const diff = Date.parse(inst.published) - Date.parse(latest.published);
    return diff >= -864e5 ? 'ok' : 'old';
  }
  return 'unknown';
}

async function versionReport(force) {
  const [latest, installed] = await Promise.all([latestVersions(force), installedVersions()]);
  return emulatorStatus().map((e) => {
    const inst = installed[e.system + '/' + e.id] || null;
    const lat = latest[e.id] || null;
    return {
      system: e.system,
      id: e.id,
      source: sourceLabel(SOURCES[e.id]),
      installed: inst,
      latest: lat,
      state: !e.installed ? 'missing' : compare(inst, lat),
    };
  });
}

// Sincroniza instalações feitas por fora: procura o executável nas pastas dos emuladores
// (inclusive subpastas e nomes diferentes) e corrige o caminho no config.
async function syncEmulators() {
  const cfg = config.get();
  const report = [];
  let changed = false;
  for (const sys of cfg.systems) {
    for (const e of sys.emulators || []) {
      if (!e.exe) continue;
      const exe = config.resolve(e.exe);
      if (fs.existsSync(exe)) {
        report.push({ id: e.id, name: e.name, system: sys.name, status: 'ok', exe: e.exe });
        continue;
      }
      const dir = path.dirname(exe);
      const src = SOURCES[e.id];
      let found = null;
      if (fs.existsSync(dir)) {
        const byName = new RegExp(`^${path.basename(exe).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        found = (await findFile(dir, byName)) || (src && (await findFile(dir, src.exe)));
      }
      if (found) {
        e.exe = config.toPortable(found);
        changed = true;
        report.push({ id: e.id, name: e.name, system: sys.name, status: 'found', exe: e.exe });
      } else {
        report.push({ id: e.id, name: e.name, system: sys.name, status: 'missing', exe: e.exe });
      }
    }
  }
  if (changed) config.save(cfg);
  return report;
}

const busy = new Set();

async function installEmulator(systemId, emulatorId, onProgress) {
  const cfg = config.get();
  const sys = cfg.systems.find((s) => s.id === systemId);
  const emu = sys && sys.emulators.find((e) => e.id === emulatorId);
  const src = SOURCES[emulatorId];
  if (!emu || !src) throw new Error('Não há download automático para este emulador.');
  if (busy.has(emulatorId)) throw new Error('Este emulador já está sendo instalado.');
  busy.add(emulatorId);
  const work = paths.ensure(paths.file('downloads'));
  const tmp = path.join(work, 'x-' + emulatorId);
  let archive = null;
  try {
    onProgress({ phase: 'resolve' });
    const info = await resolveDownload(src);
    archive = path.join(work, `${emulatorId}-${info.name}`);
    await download(info.url, archive, (pct, bytes) => onProgress({ phase: 'download', pct, bytes, version: info.version }));

    onProgress({ phase: 'extract' });
    await fsp.rm(tmp, { recursive: true, force: true });
    await extract(archive, tmp);
    const exeRe = new RegExp(`^${path.basename(emu.exe || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const found = (emu.exe && (await findFile(tmp, exeRe))) || (await findFile(tmp, src.exe));
    if (!found) throw new Error('Executável não encontrado dentro do pacote baixado.');

    onProgress({ phase: 'install' });
    // Destino: a pasta do executável configurado (ou cores/<sistema>/<emulador>).
    const targetRel = isRelative(emu.exe) ? path.dirname(emu.exe) : `cores/${systemId}/${emulatorId}`;
    const target = config.resolve(targetRel);
    fs.mkdirSync(target, { recursive: true });
    // Sobrescreve os arquivos do emulador; configurações, saves e BIOS que não vêm no pacote ficam intactos.
    fs.cpSync(path.dirname(found), target, { recursive: true, force: true });
    for (const marker of src.portable) {
      const f = path.join(target, marker);
      if (!fs.existsSync(f)) fs.writeFileSync(f, '');
    }
    if (src.raIntegration) {
      // Deixa a DLL do RAIntegration pronta (os emuladores RA a baixariam sozinhos na 1ª execução).
      onProgress({ phase: 'install' });
      const dll = await require('./retroachievements/api').latest('integration');
      const dest = path.join(target, 'RA_Integration-x64.dll');
      await download(dll.url, dest, () => {});
      // Algumas builds x64 procuram o nome sem sufixo.
      const plain = path.join(target, 'RA_Integration.dll');
      if (!fs.existsSync(plain)) fs.copyFileSync(dest, plain);
    }
    const exeRel = config.toPortable(path.join(target, path.basename(found)));
    if (exeRel !== emu.exe) {
      emu.exe = exeRel;
      config.save(cfg);
    }
    // Registra a versão instalada para comparar com a última disponível depois.
    fs.writeFileSync(
      path.join(target, VERSION_FILE),
      JSON.stringify({ version: info.version, published: info.published || '', source: sourceLabel(src), exe: path.basename(found), installedAt: Date.now() }, null, 2)
    );
    delete latestCache.items[emulatorId];
    onProgress({ phase: 'done', version: info.version });
    return { ok: true, version: info.version, exe: exeRel };
  } finally {
    busy.delete(emulatorId);
    await fsp.rm(tmp, { recursive: true, force: true }).catch(() => {});
    if (archive) await fsp.rm(archive, { force: true }).catch(() => {});
  }
}

module.exports = {
  expectedDirs,
  createStructure,
  emulatorStatus,
  installEmulator,
  addCatalogSystem,
  catalogStatus,
  versionReport,
  syncEmulators,
  sourceLabel: (id) => sourceLabel(SOURCES[id]),
};
