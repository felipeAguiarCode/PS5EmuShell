// RetroAchievements: conta do usuário, aplicação dos scripts de cada emulador e dados da aba Troféus.
// Cada emulador tem seu script nesta pasta (<id do emulador>.js) com configure/clear/status.
const fs = require('fs');
const path = require('path');
const config = require('../config');
const paths = require('../paths');
const runner = require('../runner');
const api = require('./api');

const SCRIPTS = [
  'duckstation', 'pcsx2', 'ppsspp', 'dolphin', 'ranes', 'rasnes9x', 'ravba',
  'melonds', 'desmume', 'noods', 'mgba', 'mesen', 'fceux', 'snes9x',
].reduce((acc, id) => ((acc[id] = require('./' + id)), acc), {});

const credFile = () => paths.file('retroachievements.json');
const CACHE_TTL = 5 * 60 * 1000;

function account() {
  return config.readJson(credFile(), null);
}

function saveAccount(a) {
  config.writeJson(credFile(), a);
}

// Emuladores configurados, um por pasta (mGBA/RAVBA/Mesen podem servir a mais de um sistema).
function emulators() {
  const byDir = new Map();
  for (const sys of config.get().systems) {
    for (const e of sys.emulators || []) {
      if (!e.exe) continue;
      const exe = config.resolve(e.exe);
      const dir = path.dirname(exe);
      const key = dir.toLowerCase();
      const item = byDir.get(key) || { id: e.id, name: e.name, dir, installed: fs.existsSync(exe), systems: [] };
      item.systems.push(sys.name);
      byDir.set(key, item);
    }
  }
  return [...byDir.values()];
}

function run(action, filter) {
  const acc = account();
  if (action === 'configure' && (!acc || !acc.token)) throw new Error('Entre na sua conta do RetroAchievements primeiro.');
  if (runner.isRunning()) throw new Error('Feche o jogo antes de alterar a configuração dos emuladores.');
  const results = [];
  for (const emu of emulators()) {
    if (filter && !filter(emu)) continue;
    const script = SCRIPTS[emu.id];
    const base = { id: emu.id, name: emu.name, systems: emu.systems };
    if (!script) {
      results.push({ ...base, status: 'noscript', message: 'Sem script para este emulador.' });
      continue;
    }
    if (!script.supported) {
      const r = script[action]({});
      results.push({ ...base, status: 'unsupported', message: r.message, alternative: script.alternative });
      continue;
    }
    if (!emu.installed) {
      results.push({ ...base, status: 'missing', message: 'Emulador não instalado.' });
      continue;
    }
    try {
      const ctx = { dir: emu.dir, username: acc && acc.username, token: acc && acc.token, hardcore: !!(acc && acc.hardcore) };
      const r = script[action](ctx);
      results.push({ ...base, status: r.ok ? 'ok' : 'error', file: r.file && config.toPortable(r.file), message: r.message });
    } catch (e) {
      results.push({ ...base, status: 'error', message: e.message });
    }
  }
  return results;
}

const applyAll = () => run('configure');
const clearAll = () => run('clear');
const applyOne = (emulatorId) => run('configure', (e) => e.id === emulatorId);

async function login(username, password, apiKey, hardcore) {
  const r = await api.login(username, password);
  const prev = account() || {};
  saveAccount({
    username: r.User,
    token: r.Token,
    apiKey: apiKey || prev.apiKey || '',
    hardcore: hardcore !== undefined ? !!hardcore : !!prev.hardcore,
    points: r.Score || 0,
    softcorePoints: r.SoftcoreScore || 0,
    avatar: r.AvatarUrl || `/UserPic/${r.User}.png`,
    loggedAt: Date.now(),
  });
  return { user: r.User, points: r.Score || 0, results: applyAll() };
}

// Sai da conta: remove o login dos emuladores e o token; mantém usuário e chave da Web API salvos.
function logout() {
  const acc = account();
  const results = acc && acc.token ? clearAll() : [];
  if (acc && acc.apiKey) saveAccount({ username: acc.username, apiKey: acc.apiKey, hardcore: !!acc.hardcore });
  else fs.rmSync(credFile(), { force: true });
  fs.rmSync(paths.file('cache', 'ra'), { recursive: true, force: true });
  return results;
}

// Atualiza dados da conta. Usuário e chave da Web API podem ser salvos antes do login
// (a aba Troféus só precisa de usuário + chave).
function update(patch) {
  const acc = account() || {};
  saveAccount({ ...acc, ...patch });
  return patch.hardcore !== undefined && acc.token ? applyAll() : [];
}

function status() {
  const acc = account();
  const list = emulators().map((emu) => {
    const script = SCRIPTS[emu.id];
    let st = { user: null, enabled: false };
    try {
      if (script && emu.installed) st = script.status({ dir: emu.dir });
    } catch {}
    return {
      id: emu.id,
      name: emu.name,
      systems: emu.systems,
      installed: emu.installed,
      supported: !!(script && script.supported),
      hasScript: !!script,
      alternative: script && script.alternative,
      user: st.user,
      enabled: st.enabled,
      message: st.message,
    };
  });
  return {
    connected: !!(acc && acc.token),
    username: acc && acc.username,
    hasApiKey: !!(acc && acc.apiKey),
    apiKeyHint: acc && acc.apiKey ? `${acc.apiKey.slice(0, 4)}…${acc.apiKey.slice(-4)}` : '',
    hardcore: !!(acc && acc.hardcore),
    points: acc ? acc.points : 0,
    avatar: acc && acc.avatar,
    emulators: list,
  };
}

// ---- dados da aba Troféus (Web API, com cache em data/cache/ra) ----

function cacheFile(name) {
  return paths.file('cache', 'ra', name + '.json');
}

// valid(c): regra opcional de validade do cache (padrão: 5 minutos).
async function cached(name, force, load, valid) {
  const f = cacheFile(name);
  const c = config.readJson(f, null);
  const fresh = c && (valid ? valid(c) : Date.now() - c.at < CACHE_TTL);
  if (!force && fresh) return { ...c.data, cachedAt: c.at };
  try {
    const data = await load();
    config.writeJson(f, { at: Date.now(), data });
    return { ...data, cachedAt: Date.now() };
  } catch (e) {
    if (c) return { ...c.data, cachedAt: c.at, stale: true, error: e.message };
    throw e;
  }
}

function needKey() {
  const acc = account();
  if (!acc || !acc.username) throw new Error('Entre na sua conta do RetroAchievements em Configurações.');
  if (!acc.apiKey) throw new Error('Informe a chave da Web API em Configurações › RetroAchievements.');
  return acc;
}

async function overview(force) {
  const acc = needKey();
  return cached('overview', force, async () => {
    const [profile, progress] = await Promise.all([
      api.web('API_GetUserProfile', { u: acc.username }, acc.apiKey),
      api.web('API_GetUserCompletionProgress', { u: acc.username, c: 500 }, acc.apiKey),
    ]);
    return { profile, games: progress.Results || [] };
  });
}

// O detalhe só é baixado de novo quando o progresso do jogo na lista (overview) mudou.
async function game(id, force) {
  const acc = needKey();
  const ov = config.readJson(cacheFile('overview'), null);
  const summary = ov && (ov.data.games || []).find((g) => g.GameID === id);
  const valid = (c) => (summary ? c.data.NumAwardedToUser === summary.NumAwarded : Date.now() - c.at < CACHE_TTL);
  return cached('game-' + id, force, () => api.web('API_GetGameInfoAndUserProgress', { g: id, u: acc.username, a: 1 }, acc.apiKey), valid);
}

async function images(rels) {
  const out = {};
  await Promise.all((rels || []).map(async (r) => (out[r] = await api.image(r))));
  return out;
}

module.exports = { status, login, logout, update, applyAll, clearAll, applyOne, overview, game, images, account };
