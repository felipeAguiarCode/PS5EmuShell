// Capas (boxart) e fundos (snaps) do servidor libretro-thumbnails, com cache local.
// Imagens manuais em data/covers/<sistema>/<nome da rom>.png e data/backgrounds/... têm prioridade.
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { pathToFileURL } = require('url');
const paths = require('./paths');
const config = require('./config');

const SERVER = 'https://thumbnails.libretro.com/';
const KINDS = { cover: 'Named_Boxarts', snap: 'Named_Snaps' };
const IMG_EXT = ['.png', '.jpg', '.jpeg', '.webp'];
const INDEX_TTL = 14 * 864e5;
const MISS_TTL = 7 * 864e5;
const CONCURRENCY = 4;
const HEADERS = { 'User-Agent': 'PlayDeck-Launcher' };

// Aceita tanto "Sony - PlayStation 2" quanto o nome do repositório GitHub "Sony_-_PlayStation_2".
const folderName = (repo) => (repo.includes('_-_') ? repo.replace(/_/g, ' ') : repo).trim();
const serverUrl = (repo, dir, name = '') =>
  `${SERVER}${encodeURIComponent(folderName(repo))}/${dir}/${name ? encodeURIComponent(name) + '.png' : ''}`;

const indexes = {};
let misses = null;

function cacheFile(kind, game) {
  return paths.file('cache', kind === 'cover' ? 'covers' : 'snaps', game.system, game.id + '.png');
}

function manualFile(kind, game) {
  const dir = paths.file(kind === 'cover' ? 'covers' : 'backgrounds', game.system);
  for (const ext of IMG_EXT) {
    const f = path.join(dir, game.base + ext);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

function fileUrl(f) {
  try {
    const st = fs.statSync(f);
    return pathToFileURL(f).href + '?v=' + Math.round(st.mtimeMs);
  } catch {
    return null;
  }
}

function resolveArt(game) {
  const out = {};
  for (const kind of Object.keys(KINDS)) {
    const cached = cacheFile(kind, game);
    const f = manualFile(kind, game) || (fs.existsSync(cached) ? cached : null);
    out[kind] = f ? fileUrl(f) : null;
  }
  return out;
}

// ---- nomes ----

const sanitize = (s) => s.replace(/[&*/:`<>?\\|"]/g, '_');

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/\s*[([][^)\]]*[)\]]/g, '')
    .replace(/,\s*(the|a|an)\b/g, '')
    .replace(/^(the|a|an)\s+/, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');
}

function bigrams(s) {
  const out = new Map();
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2);
    out.set(g, (out.get(g) || 0) + 1);
  }
  return out;
}

function dice(a, bA, b, bB) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  let inter = 0;
  for (const [g, n] of bA) inter += Math.min(n, bB.get(g) || 0);
  return (2 * inter) / (a.length - 1 + b.length - 1);
}

const REGION_PREF = ['(USA', '(World', '(Europe', '(Brazil', '(Japan'];

function pickByRegion(names, game) {
  if (game.region) {
    const same = names.find((n) => n.includes(`(${game.region}`));
    if (same) return same;
  }
  for (const r of REGION_PREF) {
    const n = names.find((x) => x.includes(r));
    if (n) return n;
  }
  return names[0];
}

function buildIndex(raw) {
  const idx = {};
  for (const kind of Object.keys(KINDS)) {
    const names = raw[kind] || [];
    const exact = new Set(names);
    const byKey = new Map();
    for (const n of names) {
      const k = normalize(n);
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(n);
    }
    const keys = [...byKey.keys()].map((k) => ({ k, b: bigrams(k) }));
    idx[kind] = { exact, byKey, keys };
  }
  return idx;
}

// Lê a listagem de diretório (HTML) do servidor e extrai os nomes dos .png.
async function listDir(repo, dir) {
  const r = await fetch(serverUrl(repo, dir), { headers: HEADERS });
  if (!r.ok) throw new Error(`Servidor de capas respondeu ${r.status}`);
  const html = await r.text();
  return [...html.matchAll(/href="([^"]+)\.png"/g)].map((m) => decodeURIComponent(m[1]));
}

// Um pedido de índice por sistema em andamento, compartilhado entre os workers.
const pending = {};

async function getIndex(repo) {
  if (indexes[repo]) return indexes[repo];
  if (pending[repo]) return pending[repo];
  pending[repo] = (async () => {
    const f = paths.file('cache', 'index', folderName(repo) + '.json');
    const cached = config.readJson(f, null);
    if (cached && Date.now() - cached.at < INDEX_TTL) return (indexes[repo] = buildIndex(cached));
    try {
      const raw = { at: Date.now() };
      for (const [kind, dir] of Object.entries(KINDS)) raw[kind] = await listDir(repo, dir);
      config.writeJson(f, raw);
      return (indexes[repo] = buildIndex(raw));
    } catch (e) {
      if (cached) return (indexes[repo] = buildIndex(cached));
      throw e;
    }
  })();
  try {
    return await pending[repo];
  } finally {
    delete pending[repo];
  }
}

function match(idx, game) {
  const s = sanitize(game.base);
  if (idx.exact.has(s)) return s;
  const key = normalize(game.base);
  if (!key) return null;
  const hit = idx.byKey.get(key);
  if (hit) return pickByRegion(hit, game);
  const kb = bigrams(key);
  let best = null;
  let bestScore = 0.82;
  for (const { k, b } of idx.keys) {
    if (Math.abs(k.length - key.length) > key.length * 0.4) continue;
    const sc = dice(key, kb, k, b);
    if (sc > bestScore) {
      bestScore = sc;
      best = k;
    }
  }
  return best ? pickByRegion(idx.byKey.get(best), game) : null;
}

// ---- download ----

function loadMisses() {
  if (!misses) misses = config.readJson(paths.file('cache', 'misses.json'), {});
  return misses;
}

function saveMisses() {
  config.writeJson(paths.file('cache', 'misses.json'), misses);
}

async function download(repo, dir, name, dest) {
  const r = await fetch(serverUrl(repo, dir, name), { headers: HEADERS });
  if (!r.ok) return false;
  const buf = Buffer.from(await r.arrayBuffer());
  paths.ensure(path.dirname(dest));
  await fsp.writeFile(dest, buf);
  return true;
}

async function fetchGame(game, force) {
  const sys = config.system(game.system);
  if (!sys || !sys.thumbnailsRepo) return false;
  const m = loadMisses();
  let changed = false;
  for (const [kind, dir] of Object.entries(KINDS)) {
    if (manualFile(kind, game)) continue;
    const dest = cacheFile(kind, game);
    if (!force && fs.existsSync(dest)) continue;
    const missKey = `${game.id}:${kind}`;
    if (!force && m[missKey] && Date.now() - m[missKey] < MISS_TTL) continue;
    const idx = await getIndex(sys.thumbnailsRepo);
    const name = match(idx[kind], game);
    const ok = name ? await download(sys.thumbnailsRepo, dir, name, dest) : false;
    if (ok) {
      delete m[missKey];
      changed = true;
    } else {
      m[missKey] = Date.now();
    }
  }
  saveMisses();
  return changed;
}

// Fila única: pedidos novos entram na fila do processamento em andamento.
const queue = [];
const queued = new Set();
let running = false;
let total = 0;
let done = 0;

function enqueue(games, { force = false, onUpdate, onProgress } = {}) {
  for (const g of games) {
    if (queued.has(g.id)) continue;
    queued.add(g.id);
    queue.push({ game: g, force });
    total++;
  }
  if (!running) run(onUpdate, onProgress);
}

async function run(onUpdate, onProgress) {
  running = true;
  const worker = async () => {
    while (queue.length) {
      const { game, force } = queue.shift();
      try {
        if (await fetchGame(game, force)) onUpdate && onUpdate(game.id, resolveArt(game));
      } catch (e) {
        onProgress && onProgress({ done, total, error: e.message });
      }
      queued.delete(game.id);
      done++;
      onProgress && onProgress({ done, total });
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  running = false;
  total = 0;
  done = 0;
}

async function clearCache() {
  await fsp.rm(paths.file('cache'), { recursive: true, force: true });
  for (const k of Object.keys(indexes)) delete indexes[k];
  misses = {};
}

module.exports = { resolveArt, enqueue, clearCache };
