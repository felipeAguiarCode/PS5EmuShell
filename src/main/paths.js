// Resolve a pasta raiz do launcher de forma portable.
// Em dev: a pasta launcher/. Empacotado: sobe a partir do exe até achar o marcador
// launcher.portable (assim app/win-unpacked/PlayDeck.exe usa launcher/data).
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const MARKER = 'launcher.portable';

function findRoot() {
  if (!app.isPackaged) return path.resolve(__dirname, '..', '..');
  let dir = path.dirname(process.execPath);
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, MARKER))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return path.dirname(process.execPath);
}

const root = findRoot();
// EMU_DATA permite usar outra pasta de dados (testes ou perfis separados).
const data = process.env.EMU_DATA ? path.resolve(process.env.EMU_DATA) : path.join(root, 'data');

function ensure(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

module.exports = {
  root,
  data,
  file: (...parts) => path.join(data, ...parts),
  ensure,
};
