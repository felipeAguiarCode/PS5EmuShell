// Varre as pastas de ROM de cada sistema e monta a biblioteca.
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const paths = require('./paths');

const MAX_DEPTH = 4;

async function walk(dir, exts, depth, out) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (depth > 0) await walk(full, exts, depth - 1, out);
    } else if (exts.has(path.extname(e.name).toLowerCase())) {
      out.push(full);
    }
  }
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
    const exts = new Set(
      (sys.extensions || []).map((e) => (e.startsWith('.') ? e : '.' + e).toLowerCase())
    );
    const files = [];
    for (const d of sys.romDirs || []) await walk(config.resolve(d), exts, MAX_DEPTH, files);

    const refs = new Set();
    for (const f of files) for (const r of await referencedFiles(f)) refs.add(r.toLowerCase());

    for (const f of files) {
      if (refs.has(f.toLowerCase())) continue;
      const base = path.basename(f, path.extname(f));
      const st = await fs.stat(f).catch(() => null);
      const rel = config.toPortable(f);
      games.push({
        id: hash(sys.id + '|' + rel.toLowerCase()),
        system: sys.id,
        path: rel,
        file: path.basename(f),
        base,
        title: cleanTitle(base),
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
