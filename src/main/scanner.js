// Varre as pastas de ROM de cada sistema e monta a biblioteca.
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const paths = require('./paths');

const MAX_DEPTH = 4;

// names: arquivos reconhecidos pelo nome exato (ex.: EBOOT.BIN dos jogos de PS3/PS4 em pasta).
async function walk(dir, exts, depth, out, names = new Set()) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (depth > 0) await walk(full, exts, depth - 1, out, names);
    } else if (exts.has(path.extname(e.name).toLowerCase()) || names.has(e.name.toLowerCase())) {
      out.push(full);
    }
  }
}

// PARAM.SFO (PS3/PS4/PSP): tabela de chaves e valores; devolve o TITLE do jogo.
async function sfoTitle(file) {
  let b;
  try {
    b = await fs.readFile(file);
  } catch {
    return null;
  }
  if (b.length < 20 || b.readUInt32LE(0) !== 0x46535000) return null;
  const keys = b.readUInt32LE(8);
  const data = b.readUInt32LE(12);
  const count = b.readUInt32LE(16);
  for (let i = 0; i < count; i++) {
    const e = 20 + i * 16;
    if (e + 16 > b.length) break;
    const kStart = keys + b.readUInt16LE(e);
    const key = b.toString('latin1', kStart, b.indexOf(0, kStart));
    if (key !== 'TITLE') continue;
    const len = b.readUInt32LE(e + 4);
    const off = data + b.readUInt32LE(e + 12);
    return b.toString('utf8', off, off + len).replace(/\0+$/, '').replace(/\s+/g, ' ').trim() || null;
  }
  return null;
}

// Jogo em pasta: o PARAM.SFO fica em <jogo>/PS3_GAME/PARAM.SFO (disco), <ID>/PARAM.SFO (instalado)
// ou <CUSA…>/sce_sys/param.sfo (PS4). Sem SFO, usa o nome da pasta do jogo.
async function folderGame(file) {
  let dir = path.dirname(file);
  const candidates = [path.join(dir, 'sce_sys', 'param.sfo')];
  if (/^usrdir$/i.test(path.basename(dir))) {
    dir = path.dirname(dir);
    candidates.push(path.join(dir, 'PARAM.SFO'));
  }
  let title = null;
  for (const c of candidates) if ((title = await sfoTitle(c))) break;
  // Pasta "de fora" do jogo (sobe PS3_GAME): é o que identifica o jogo no disco.
  if (/^ps3_game$/i.test(path.basename(dir))) dir = path.dirname(dir);
  return { title: title || path.basename(dir), folder: path.basename(dir) };
}

// Arquivos citados por .cue/.m3u/.gdi não aparecem como jogos separados.
async function referencedFiles(file) {
  const ext = path.extname(file).toLowerCase();
  if (!['.cue', '.m3u', '.gdi'].includes(ext)) return [];
  let txt;
  try {
    txt = await fs.readFile(file, 'utf8');
  } catch {
    return [];
  }
  const dir = path.dirname(file);
  const refs = [];
  if (ext === '.m3u') {
    for (const line of txt.split(/\r?\n/)) {
      const l = line.trim();
      if (l && !l.startsWith('#')) refs.push(path.resolve(dir, l));
    }
  } else {
    for (const m of txt.matchAll(/FILE\s+"([^"]+)"/gi)) refs.push(path.resolve(dir, m[1]));
    for (const m of txt.matchAll(/FILE\s+([^"\s]+)\s/gi)) refs.push(path.resolve(dir, m[1]));
  }
  return refs;
}

function cleanTitle(base) {
  let t = base
    .replace(/\s*[([][^)\]]*[)\]]/g, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // "Legend of Zelda, The - X" -> "The Legend of Zelda - X"
  const m = t.match(/^(.*?), (The|A|An)(\s*[-:].*)?$/i);
  if (m) t = `${m[2]} ${m[1]}${m[3] || ''}`;
  const disc = base.match(/\((?:Disc|Disco|CD)\s*(\d+)/i);
  if (disc) t += ` (Disco ${disc[1]})`;
  return t || base;
}

function region(base) {
  const m = base.match(/\((USA|Europe|Japan|Brazil|World|Korea|Asia|[A-Z][a-z]+(?:, [A-Z][a-z]+)+)\)/);
  return m ? m[1] : '';
}

function hash(s) {
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
}

async function scan() {
  const cfg = config.get();
  const games = [];
  for (const sys of cfg.systems) {
    if (sys.enabled === false) continue;
    // Jogos de PC não vêm de pastas: são os cadastrados pelo botão "+".
    if (sys.native) {
      games.push(...require('./pcgames').games());
      continue;
    }
    const exts = new Set(
      (sys.extensions || []).map((e) => (e.startsWith('.') ? e : '.' + e).toLowerCase())
    );
    const names = new Set((sys.gameFiles || []).map((n) => n.toLowerCase()));
    const files = [];
    for (const d of sys.romDirs || []) await walk(config.resolve(d), exts, MAX_DEPTH, files, names);

    const refs = new Set();
    for (const f of files) for (const r of await referencedFiles(f)) refs.add(r.toLowerCase());

    for (const f of files) {
      if (refs.has(f.toLowerCase())) continue;
      const inFolder = names.has(path.basename(f).toLowerCase());
      const fg = inFolder ? await folderGame(f) : null;
      // Jogo em pasta: o "nome do arquivo" passa a ser o título (usado nas capas e imagens manuais).
      const base = fg ? fg.title.replace(/[&*/:`<>?\\|"]/g, '') : path.basename(f, path.extname(f));
      const st = await fs.stat(f).catch(() => null);
      const rel = config.toPortable(f);
      games.push({
        id: hash(sys.id + '|' + rel.toLowerCase()),
        system: sys.id,
        path: rel,
        file: fg ? fg.folder : path.basename(f),
        base,
        title: fg ? fg.title : cleanTitle(base),
        region: region(base),
        size: st ? st.size : 0,
        added: st ? Math.round(st.birthtimeMs || st.mtimeMs) : 0,
      });
    }
  }
  games.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' }));
  config.writeJson(paths.file('library.json'), { scannedAt: Date.now(), games });
  return games;
}

function cached() {
  return config.readJson(paths.file('library.json'), { games: [] }).games || [];
}

module.exports = { scan, cached };
