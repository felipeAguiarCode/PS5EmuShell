// Jogos de PC (Windows) cadastrados pelo botão "+": data/pcgames.json = [{ id, title, exe, added }].
// O executável fica relativo à pasta base quando estiver dentro dela (portable).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const config = require('./config');
const paths = require('./paths');
const exeicon = require('./exeicon');

const file = () => paths.file('pcgames.json');
const iconDir = () => paths.file('cache', 'icons');

function list() {
  const l = config.readJson(file(), []);
  return Array.isArray(l) ? l : [];
}

function write(l) {
  config.writeJson(file(), l);
}

const makeId = (exe) => crypto.createHash('sha1').update('pc|' + config.resolve(exe).toLowerCase()).digest('hex').slice(0, 12);

// Entradas no formato da biblioteca (mesmos campos que o scanner gera para ROMs).
function games() {
  return list().map((g) => {
    const full = config.resolve(g.exe);
    let size = 0;
    try {
      size = fs.statSync(full).size;
    } catch {}
    return {
      id: g.id,
      system: 'pc',
      native: true,
      path: g.exe,
      file: path.basename(full),
      base: path.basename(full, path.extname(full)),
      title: g.title,
      region: '',
      size,
      added: g.added || 0,
    };
  });
}

// Nome sugerido: "Nome do produto" ou "Descrição" do exe; senão o nome da pasta (ou do arquivo).
function info(exe) {
  const full = config.resolve(exe);
  const fallback = () => {
    const dir = path.basename(path.dirname(full));
    const base = path.basename(full, path.extname(full));
    return /^(bin|binaries|win64|win32|x64|x86|game)$/i.test(dir) ? base : dir || base;
  };
  return new Promise((resolve) => {
    const ps = `$v=(Get-Item -LiteralPath $env:PD_EXE).VersionInfo; [Console]::OutputEncoding=[Text.Encoding]::UTF8; @($v.ProductName,$v.FileDescription) -join "\`n"`;
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { env: { ...process.env, PD_EXE: full }, timeout: 8000, windowsHide: true }, (err, out) => {
      const [product, desc] = (err ? '' : String(out)).split(/\r?\n/).map((s) => s.trim());
      // Descrições genéricas ("Launcher", "Game") não servem como nome.
      const good = [product, desc].find((s) => s && s.length > 2 && !/^(launcher|game|application|setup|windows)$/i.test(s));
      resolve({ exe: full, suggestedTitle: good || fallback(), exists: fs.existsSync(full) });
    });
  });
}

async function saveIcon(id, exe, getFileIcon) {
  const r = await exeicon.save(config.resolve(exe), iconDir(), id, getFileIcon).catch(() => null);
  return r ? { file: r.file, size: r.size } : null;
}

async function add(exe, title, getFileIcon) {
  const full = config.resolve(exe);
  if (!fs.existsSync(full)) return { ok: false, error: 'Executável não encontrado.' };
  const l = list();
  const id = makeId(full);
  const existing = l.find((g) => g.id === id);
  if (existing) existing.title = title;
  else l.push({ id, title, exe: config.toPortable(full), added: Date.now() });
  write(l);
  const icon = await saveIcon(id, full, getFileIcon);
  return { ok: true, id, existed: !!existing, icon };
}

function update(id, patch) {
  const l = list();
  const g = l.find((x) => x.id === id);
  if (!g) return null;
  if (patch.title) g.title = patch.title;
  if (patch.exe) g.exe = config.toPortable(config.resolve(patch.exe));
  write(l);
  return g;
}

// Só tira do launcher: nenhum arquivo do jogo é apagado.
function remove(id) {
  write(list().filter((g) => g.id !== id));
  for (const f of [path.join(iconDir(), id + '.png'), path.join(iconDir(), id + '.ico'), paths.file('cache', 'covers', 'pc', id + '.png')]) {
    fs.rmSync(f, { force: true });
  }
}

function iconFile(id) {
  for (const ext of ['.png', '.ico']) {
    const f = path.join(iconDir(), id + ext);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

module.exports = { list, games, info, add, update, remove, saveIcon, iconFile };
