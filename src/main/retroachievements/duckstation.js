// DuckStation (PS1): settings.ini › [Cheevos]. O token precisa ir criptografado (duckstation-crypto.js).
const fs = require('fs');
const path = require('path');
const ini = require('./ini');
const crypto = require('./duckstation-crypto');

const isPortable = (dir) => ['portable.txt', 'portable.ini'].some((f) => fs.existsSync(path.join(dir, f)));
const settingsFile = (dir) => path.join(dir, 'settings.ini');

module.exports = {
  id: 'duckstation',
  name: 'DuckStation',
  supported: true,

  configure({ dir, username, token, hardcore }) {
    // Fora do modo portable a chave também usa o MachineGuid do Windows.
    const machineKey = isPortable(dir) ? '' : crypto.machineGuid();
    const file = settingsFile(dir);
    ini.set(file, 'Cheevos', {
      Enabled: 'true',
      Username: username,
      Token: crypto.encrypt(token, username, machineKey),
      LoginTimestamp: String(Math.floor(Date.now() / 1000)),
      ChallengeMode: hardcore ? 'true' : 'false',
    });
    return { ok: true, file };
  },

  clear({ dir }) {
    const file = settingsFile(dir);
    if (!fs.existsSync(file)) return { ok: true };
    ini.set(file, 'Cheevos', { Enabled: 'false', Username: null, Token: null, LoginTimestamp: null });
    return { ok: true, file };
  },

  status({ dir }) {
    const file = settingsFile(dir);
    return { user: ini.get(file, 'Cheevos', 'Username'), enabled: ini.get(file, 'Cheevos', 'Enabled') === 'true' };
  },
};
