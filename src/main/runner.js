// Monta a linha de comando do emulador, inicia o processo e o encerra quando pedido.
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const paths = require('./paths');

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

function start(game, emulatorId, onExit) {
  if (current) return { ok: false, error: 'Já existe um jogo em execução.' };
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
  log(`KILL ${current.emu.name} pid=${current.child.pid}`);
  execFile('taskkill', ['/PID', String(current.child.pid), '/T', '/F'], () => {});
  return true;
}

function isRunning() {
  return !!current;
}

function pid() {
  return current ? current.child.pid : null;
}

module.exports = { start, kill, isRunning, pid, buildArgs };
