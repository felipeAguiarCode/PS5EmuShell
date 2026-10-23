// Tempo de jogo por jogo (stats.json): soma a sessão ao fechar o emulador e grava um
// checkpoint por minuto, para não perder o tempo se o launcher for encerrado com o jogo aberto.
const config = require('./config');

const MIN_SESSION = 5000; // sessões menores que isso (ex.: emulador que falhou ao abrir) não contam
const CHECKPOINT_MS = 60000;
let timer = null;

function start(id) {
  const now = Date.now();
  config.updateGameStats(id, { session: { start: now, checkpoint: now } });
  clearInterval(timer);
  timer = setInterval(() => {
    const s = (config.getStats().games[id] || {}).session;
    if (s) config.updateGameStats(id, { session: { ...s, checkpoint: Date.now() } });
  }, CHECKPOINT_MS);
}

function add(id, duration) {
  const prev = config.getStats().games[id] || {};
  const counted = duration >= MIN_SESSION ? Math.round(duration) : 0;
  return config.updateGameStats(id, {
    playTime: (prev.playTime || 0) + counted,
    lastSessionMs: counted || prev.lastSessionMs || null,
    session: null,
  });
}

function finish(id, duration) {
  clearInterval(timer);
  timer = null;
  return add(id, duration);
}

// Sessões que ficaram abertas (launcher fechado/travado durante o jogo): soma até o último checkpoint.
function recover() {
  const recovered = [];
  for (const [id, g] of Object.entries(config.getStats().games)) {
    if (!g.session) continue;
    const d = Math.max(0, (g.session.checkpoint || g.session.start) - g.session.start);
    add(id, d);
    recovered.push({ id, duration: d });
  }
  return recovered;
}

module.exports = { start, finish, recover };
