const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PRODUCT_NAME = 'PS5 Emu Shell';
const ROOT_DIR = path.join(__dirname, '..');
const RCEDIT_PATH = path.join(ROOT_DIR, 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe');
const ICON_PATH = path.join(ROOT_DIR, 'src', 'icon.ico');

const findExecutable = (outputDir) =>
  fs.readdirSync(outputDir).find((fileName) => /\.exe$/i.test(fileName));

exports.default = async (context) => {
  const executablePath = path.join(context.appOutDir, findExecutable(context.appOutDir));
  const version = context.packager.appInfo.version;
  execFileSync(RCEDIT_PATH, [
    executablePath,
    '--set-icon',
    ICON_PATH,
    '--set-file-version',
    version,
    '--set-product-version',
    version,
    '--set-version-string',
    'ProductName',
    PRODUCT_NAME,
    '--set-version-string',
    'FileDescription',
    PRODUCT_NAME,
  ]);
};
