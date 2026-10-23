// PCSX2 (PS2): inis/PCSX2.ini › [Achievements]; o token fica em inis/secrets.ini.
// O token também vai no PCSX2.ini: versões novas migram ele sozinhas para o secrets.ini.
const fs = require('fs');
const path = require('path');
const ini = require('./ini');

const inisDir = (dir) => path.join(dir, 'inis');

module.exports = {
  id: 'pcsx2',
  name: 'PCSX2',
  supported: true,

  configure({ dir, username, token, hardcore }) {
    const main = path.join(inisDir(dir), 'PCSX2.ini');
    ini.set(main, 'Achievements', {
      Enabled: 'true',
      ChallengeMode: hardcore ? 'true' : 'false',
      Username: username,
      Token: token,
      LoginTimestamp: String(Math.floor(Date.now() / 1000)),
    });
    ini.set(path.join(inisDir(dir), 'secrets.ini'), 'Achievements', { Token: token });
    return { ok: true, file: main };
  },

  clear({ dir }) {
    const main = path.join(inisDir(dir), 'PCSX2.ini');
    if (fs.existsSync(main)) ini.set(main, 'Achievements', { Enabled: 'false', Username: null, Token: null, LoginTimestamp: null });
    const secrets = path.join(inisDir(dir), 'secrets.ini');
    if (fs.existsSync(secrets)) ini.set(secrets, 'Achievements', { Token: null });
    return { ok: true, file: main };
  },

  status({ dir }) {
    const main = path.join(inisDir(dir), 'PCSX2.ini');
    return { user: ini.get(main, 'Achievements', 'Username'), enabled: ini.get(main, 'Achievements', 'Enabled') === 'true' };
  },
};
