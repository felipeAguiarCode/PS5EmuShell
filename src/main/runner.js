// Monta a linha de comando do emulador, inicia o processo e o encerra quando pedido.
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const paths = require('./paths');
const procs = require('./procs');

// Divide "args" respeitando aspas; placeholders são trocados depois, então caminhos com espaço funcionam.
function tokenize(str) {
  const out = [];
  let cur = '';
  let quoted = false;
  let has = false;
  for (const ch of str) {
    if (ch === '"') {
      quoted = !quoted;
      has = true;
    } else if (/\s/.test(ch) && !quoted) {
      if (cur || has) out.push(cur);
      cur = '';
      has = false;
    } else {
      cur += ch;
    }
  }
  if (cur || has) out.push(cur);
  return out;
}

function buildArgs(template, vars) {
  return tokenize(template || '"{rom}"').map((t) =>
    t.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))
  );
}

function pickEmulator(sys, override) {
  return (
    sys.emulators.find((e) => e.id === override) ||
    sys.emulators.find((e) => e.id === sys.defaultEmulator) ||
    sys.emulators[0]
  );
}

function log(line) {
  try {
    paths.ensure(paths.data);
    fs.appendFileSync(paths.file('launcher.log'), `[${new Date().toISOString()}] ${line}\n`);
  } catch {}
}

let current = null;

const WATCH_MS = 3000;

// Jogo de PC: abre o .exe direto. Como muitos jogos abrem um "launcher" que sai logo e inicia o jogo
// real, a sessão só termina quando não sobra nenhum processo rodando a partir da pasta do jogo.
function startNative(game, onExit) {
  const exe = config.resolve(game.path);
  if (!exe || !fs.existsSync(exe)) return { ok: false, error: `Executável não encontrado: ${exe}` };
  // Caminho real (sem nomes curtos tipo FELIPE~1), igual ao que a lista de processos devolve.
  let dir = path.dirname(exe);
  try {
    dir = fs.realpathSync.native(dir);
  } catch {}
  const emu = { id: 'windows', name: 'Windows' };
  log(`START PC: "${exe}"`);
  // Processos que já rodavam dessa pasta antes do jogo não contam.
  const before = new Set(procs.inFolder(dir).map((p) => p.pid));
  const startedAt = Date.now();
  let finished = false;
  let childAlive = true;
  let empty = 0;
  let timer = null;
  const finish = (code, error) => {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    current = null;
    const duration = Date.now() - startedAt;
    log(`EXIT PC "${game.title}" code=${code} ${Math.round(duration / 1000)}s${error ? ' error=' + error : ''}`);
    onExit({ game, emulator: emu.id, code, duration, error });
  };
  const watch = () => {
    timer = setInterval(() => {
      if (childAlive) return;
      const left = procs.inFolder(dir).filter((p) => !before.has(p.pid));
      current.pids = left.map((p) => p.pid);
      empty = left.length ? 0 : empty + 1;
      if (empty >= 2) finish(0, null);
    }, WATCH_MS);
  };

  let child = null;
  try {
    child = spawn(exe, [], { cwd: dir, stdio: 'ignore', windowsHide: false });
  } catch (e) {
    child = null;
  }
  current = { child, game, emu, startedAt, native: true, dir, before, pids: [] };
  if (child) {
    child.on('error', (e) => {
      // Executável que pede administrador (UAC): o Windows abre pelo shell, com o aviso de elevação.
      if (/EACCES|740|elevation/i.test(`${e.code} ${e.message}`)) {
        log(`PC elevado via shell: ${e.message}`);
        childAlive = false;
        require('electron').shell.openPath(exe);
        return;
      }
      finish(-1, e.message);
    });
    child.on('exit', () => (childAlive = false));
  } else {
    childAlive = false;
    require('electron').shell.openPath(exe);
  }
  watch();
  return { ok: true, emulator: emu.id, emulatorName: emu.name };
}

function start(game, emulatorId, onExit) {
  if (current) return { ok: false, error: 'Já existe um jogo em execução.' };
  if (game.native) return startNative(game, onExit);
  const sys = config.system(game.system);
  if (!sys) return { ok: false, error: `Sistema "${game.system}" não configurado.` };
  const emu = pickEmulator(sys, emulatorId);
  if (!emu) return { ok: false, error: `Nenhum emulador configurado para ${sys.name}.` };
  const exe = config.resolve(emu.exe);
  if (!exe || !fs.existsSync(exe)) return { ok: false, error: `Executável não encontrado: ${emu.exe}` };
  const rom = config.resolve(game.path);
  if (!fs.existsSync(rom)) return { ok: false, error: `ROM não encontrada: ${game.path}` };

  const args = buildArgs(emu.args, {
    rom,
    romDir: path.dirname(rom),
    romName: game.base,
    baseDir: config.baseDir(),
    exeDir: path.dirname(exe),
  });
  log(`START ${emu.name}: "${exe}" ${args.map((a) => JSON.stringify(a)).join(' ')}`);

  let child;
  try {
    child = spawn(exe, args, { cwd: path.dirname(exe), stdio: 'ignore', windowsHide: false });
  } catch (e) {
    return { ok: false, error: e.message };
  }
  const startedAt = Date.now();
  current = { child, game, emu, startedAt };
  let finished = false;
  const finish = (code, error) => {
    if (finished) return;
    finished = true;
    current = null;
    const duration = Date.now() - startedAt;
    log(`EXIT ${emu.name} code=${code} ${Math.round(duration / 1000)}s${error ? ' error=' + error : ''}`);
    onExit({ game, emulator: emu.id, code, duration, error });
  };
  child.on('error', (e) => finish(-1, e.message));
  child.on('exit', (code) => finish(code, null));
  return { ok: true, emulator: emu.id, emulatorName: emu.name };
}

function kill() {
  if (!current) return false;
  const pids = new Set(current.child && current.child.pid ? [current.child.pid] : []);
  // Jogo de PC: encerra também tudo o que estiver rodando a partir da pasta do jogo.
  if (current.native) for (const p of procs.inFolder(current.dir)) if (!current.before.has(p.pid)) pids.add(p.pid);
  log(`KILL ${current.emu.name} pids=${[...pids].join(',')}`);
  for (const pid of pids) execFile('taskkill', ['/PID', String(pid), '/T', '/F'], () => {});
  return true;
}

function isRunning() {
  return !!current;
}

function pid() {
  if (!current) return null;
  return (current.child && current.child.pid) || current.pids[0] || null;
}

module.exports = { start, kill, isRunning, pid, buildArgs };
