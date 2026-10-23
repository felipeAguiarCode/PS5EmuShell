// Dados do explorador de arquivos do launcher: locais (unidades, pastas do usuário, bibliotecas de jogos),
// conteúdo de uma pasta e detecção do sistema de uma pasta de ROMs.
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { app } = require('electron');
const config = require('./config');

const exists = (p) => {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
};

// Bibliotecas extras da Steam listadas em libraryfolders.vdf.
function steamLibraries(steamRoot) {
  try {
    const vdf = fs.readFileSync(path.join(steamRoot, 'steamapps', 'libraryfolders.vdf'), 'utf8');
    return [...vdf.matchAll(/"path"\s+"([^"]+)"/g)].map((m) => path.join(m[1].replace(/\\\\/g, '\\'), 'steamapps', 'common'));
  } catch {
    return [];
  }
}

function places() {
  const out = [];
  const add = (kind, label, p) => {
    if (p && exists(p) && !out.some((x) => x.path.toLowerCase() === p.toLowerCase())) out.push({ kind, label, path: p });
  };
  for (const [label, key] of [['Área de trabalho', 'desktop'], ['Downloads', 'downloads'], ['Documentos', 'documents']]) {
    try {
      add('user', label, app.getPath(key));
    } catch {}
  }
  add('base', 'Pasta base (emuladores e ROMs)', config.baseDir());
  add('base', 'ROMs', path.join(config.baseDir(), 'roms'));

  const drives = [];
  for (let c = 67; c <= 90; c++) {
    const d = String.fromCharCode(c) + ':\\';
    if (exists(d)) drives.push(d);
  }
  if (exists('A:\\')) drives.unshift('A:\\');
  // Pastas de jogos conhecidas (Steam, Epic, GOG, Xbox), em todas as unidades.
  const pf = process.env.ProgramFiles || 'C:\\Program Files';
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const games = [
    ['Steam', path.join(pf86, 'Steam', 'steamapps', 'common')],
    ['Steam', path.join(pf, 'Steam', 'steamapps', 'common')],
    ...[pf86, pf].flatMap((p) => steamLibraries(path.join(p, 'Steam')).map((l) => ['Steam', l])),
    ['Epic Games', path.join(pf, 'Epic Games')],
    ['GOG', path.join(pf86, 'GOG Galaxy', 'Games')],
    ...drives.flatMap((d) => [
      ['Steam', path.join(d, 'SteamLibrary', 'steamapps', 'common')],
      ['Epic Games', path.join(d, 'Epic Games')],
      ['GOG', path.join(d, 'GOG Games')],
      ['Xbox', path.join(d, 'XboxGames')],
      ['Jogos', path.join(d, 'Games')],
      ['Jogos', path.join(d, 'Jogos')],
    ]),
  ];
  for (const [label, p] of games) add('games', `${label} · ${p.slice(0, 2)}`, p);
  add('system', 'Arquivos de Programas', pf);
  add('system', 'Arquivos de Programas (x86)', pf86);
  for (const d of drives) add('drive', `Unidade ${d.slice(0, 2)}`, d);
  return out;
}

const HIDDEN = /^(\$|System Volume Information$|Recovery$|PerfLogs$|Config\.Msi$|desktop\.ini$|thumbs\.db$)/i;
const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

// Conteúdo de uma pasta: subpastas e, no modo "exe", os executáveis.
async function list(dir, mode = 'exe') {
  const full = path.resolve(dir);
  let ents;
  try {
    ents = await fsp.readdir(full, { withFileTypes: true });
  } catch (e) {
    return { dir: full, parent: parentOf(full), error: e.code === 'EPERM' || e.code === 'EACCES' ? 'Sem permissão para abrir esta pasta.' : 'Não foi possível abrir esta pasta.', entries: [] };
  }
  const entries = [];
  for (const e of ents) {
    if (HIDDEN.test(e.name)) continue;
    let isDir = e.isDirectory();
    // Atalhos de pasta (junctions) aparecem como links simbólicos.
    if (!isDir && e.isSymbolicLink()) isDir = exists(path.join(full, e.name));
    if (isDir) entries.push({ name: e.name, type: 'dir' });
    else if (mode === 'exe' && /\.exe$/i.test(e.name)) {
      let size = 0;
      try {
        size = fs.statSync(path.join(full, e.name)).size;
      } catch {}
      entries.push({ name: e.name, type: 'exe', size });
    }
  }
  entries.sort((a, b) => (a.type === b.type ? collator.compare(a.name, b.name) : a.type === 'dir' ? -1 : 1));
  return { dir: full, parent: parentOf(full), entries };
}

function parentOf(dir) {
  const p = path.dirname(dir);
  return p === dir ? null : p;
}

// Conta arquivos por extensão de cada sistema (até 4 níveis) para sugerir o sistema da pasta.
async function detectSystems(dir, systems) {
  const counts = {};
  let seen = 0;
  const walk = async (d, depth) => {
    if (seen > 20000) return;
    let ents;
    try {
      ents = await fsp.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      seen++;
      if (e.isDirectory()) {
        if (depth > 0) await walk(path.join(d, e.name), depth - 1);
      } else {
        const ext = path.extname(e.name).toLowerCase();
        if (ext) counts[ext] = (counts[ext] || 0) + 1;
      }
    }
  };
  await walk(dir, 4);
  const full = path.resolve(dir).toLowerCase();
  // Extensões como .iso servem para vários sistemas: o nome da pasta ("PS2", "GameCube"…) desempata.
  const where = full.split(/[\\/]/).slice(-2).join(' ');
  const hint = (s) => {
    let best = 0;
    for (const t of [s.id, s.shortName, s.name]) {
      if (!t) continue;
      const re = new RegExp(`(^|[^a-z0-9])${t.toLowerCase().replace(/[^a-z0-9]+/g, '[^a-z0-9]*')}($|[^a-z0-9])`);
      if (re.test(where)) best = Math.max(best, t.length);
    }
    return best;
  };
  return systems
    .filter((s) => !s.native)
    .map((s) => {
      const exts = (s.extensions || []).map((e) => (e.startsWith('.') ? e : '.' + e).toLowerCase());
      const found = exts.filter((e) => counts[e]).map((e) => ({ ext: e, n: counts[e] }));
      const already = (s.romDirs || []).some((r) => config.resolve(r).toLowerCase() === full);
      return { id: s.id, name: s.name, color: s.color, files: found.reduce((a, f) => a + f.n, 0), hint: hint(s), exts: found.sort((a, b) => b.n - a.n), already };
    })
    .sort((a, b) => (b.files > 0) - (a.files > 0) || b.hint - a.hint || b.files - a.files);
}

module.exports = { places, list, detectSystems };
