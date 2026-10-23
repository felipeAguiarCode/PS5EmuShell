// Leitura/gravação de config.json e stats.json, e resolução de caminhos relativos.
const fs = require('fs');
const path = require('path');
const paths = require('./paths');
const defaults = require('./defaults');

let config = null;
let stats = null;

function readJson(file, fallback) {
  try {
    // Remove BOM: arquivos editados no Bloco de Notas/PowerShell costumam tê-lo.
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  } catch {
    return fallback;
  }
}

function writeJson(file, obj) {
  paths.ensure(path.dirname(file));
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, file);
}

function load() {
  const d = defaults();
  const saved = readJson(paths.file('config.json'), null);
  if (!saved) {
    config = d;
    save(config);
    return config;
  }
  config = {
    ...d,
    ...saved,
    killCombo: { ...d.killCombo, ...(saved.killCombo || {}) },
    homeCombo: { ...d.homeCombo, ...(saved.homeCombo || {}) },
    optimize: { ...d.optimize, ...(saved.optimize || {}) },
    trophies: { ...d.trophies, ...(saved.trophies || {}) },
    appearance: { ...d.appearance, ...(saved.appearance || {}) },
    systems: Array.isArray(saved.systems) ? saved.systems : d.systems,
  };
  // Sistemas do catálogo já adicionados recebem emuladores novos do catálogo (ex.: versões RA).
  let changed = false;
  for (const def of defaults.catalog()) {
    const sys = config.systems.find((s) => s.id === def.id);
    if (!sys) continue;
    for (const e of def.emulators) {
      if (!sys.emulators.some((x) => x.id === e.id)) {
        sys.emulators.push({ ...e });
        changed = true;
      }
    }
  }
  // Configurações anteriores aos jogos de PC ganham o sistema "PC (Windows)".
  if (!config.systems.some((s) => s.id === 'pc')) {
    config.systems.push(defaults.pcSystem());
    changed = true;
  }
  if (changed) save(config);
  return config;
}

function save(next) {
  config = next;
  writeJson(paths.file('config.json'), config);
  return config;
}

function get() {
  return config || load();
}

function baseDir() {
  return path.resolve(paths.root, get().baseDir || '..');
}

function resolve(p) {
  if (!p) return '';
  return path.isAbsolute(p) ? path.normalize(p) : path.resolve(baseDir(), p);
}

// Converte um caminho absoluto para relativo à baseDir quando estiver dentro dela.
function toPortable(p) {
  if (!p) return p;
  const rel = path.relative(baseDir(), p);
  if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) return rel.split(path.sep).join('/');
  return p;
}

function system(id) {
  return get().systems.find((s) => s.id === id);
}

// ---- stats (favoritos, tempo jogado, emulador escolhido por jogo) ----

function loadStats() {
  stats = readJson(paths.file('stats.json'), { games: {} });
  if (!stats.games) stats.games = {};
  return stats;
}

function getStats() {
  return stats || loadStats();
}

function updateGameStats(id, patch) {
  const s = getStats();
  s.games[id] = { ...(s.games[id] || {}), ...patch };
  for (const k of Object.keys(s.games[id])) if (s.games[id][k] === null) delete s.games[id][k];
  writeJson(paths.file('stats.json'), s);
  return s.games[id];
}

module.exports = {
  readJson,
  writeJson,
  load,
  save,
  get,
  baseDir,
  resolve,
  toPortable,
  system,
  getStats,
  updateGameStats,
};
