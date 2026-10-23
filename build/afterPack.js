// Grava o ícone e o nome do produto no PlayDeck.exe depois do empacotamento
// (o electron-builder está com signAndEditExecutable desligado para não depender do winCodeSign).
const { execFileSync } = require('child_process');
const path = require('path');

exports.default = async (context) => {
  const exe = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const root = path.join(__dirname, '..');
  const version = context.packager.appInfo.version;
  execFileSync(path.join(root, 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe'), [
    exe,
    '--set-icon', path.join(root, 'src', 'icon.ico'),
    '--set-file-version', version,
    '--set-product-version', version,
    '--set-version-string', 'ProductName', 'PlayDeck',
    '--set-version-string', 'FileDescription', 'PlayDeck',
  ]);
};
