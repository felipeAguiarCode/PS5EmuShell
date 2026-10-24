// Grava o ícone e o nome do produto no PS5EmuShell.exe depois do empacotamento
// (o electron-builder está com signAndEditExecutable desligado para não depender do winCodeSign).
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

exports.default = async (context) => {
  // O nome do .exe vem de "executableName" (package.json), sem espaços.
  const exeName = fs.readdirSync(context.appOutDir).find((f) => /\.exe$/i.test(f));
  const exe = path.join(context.appOutDir, exeName);
  const root = path.join(__dirname, '..');
  const version = context.packager.appInfo.version;
  execFileSync(path.join(root, 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe'), [
    exe,
    '--set-icon', path.join(root, 'src', 'icon.ico'),
    '--set-file-version', version,
    '--set-product-version', version,
    '--set-version-string', 'ProductName', 'PS5 Emu Shell',
    '--set-version-string', 'FileDescription', 'PS5 Emu Shell',
  ]);
};
