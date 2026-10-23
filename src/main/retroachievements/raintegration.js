// Base dos emuladores oficiais do RetroAchievements (RANes, RASnes9x, RAVBA), que usam a DLL RAIntegration.
// Preferências: <pasta do emulador>/RAPrefs_<cliente>.cfg (JSON: Username, Token, "Hardcore Active").
const fs = require('fs');
const path = require('path');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

module.exports = function raIntegration({ id, name, client }) {
  const prefsFile = (dir) => path.join(dir, `RAPrefs_${client}.cfg`);
  return {
    id,
    name,
    supported: true,

    configure({ dir, username, token, hardcore }) {
      const file = prefsFile(dir);
      // Mantém as demais preferências que o RAIntegration já tenha salvo.
      const prefs = readJson(file) || {};
      prefs.Username = username;
      prefs.Token = token;
      prefs['Hardcore Active'] = !!hardcore;
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(prefs, null, 2));
      return { ok: true, file };
    },

    clear({ dir }) {
      const file = prefsFile(dir);
      const prefs = readJson(file);
      if (prefs) {
        delete prefs.Token;
        prefs.Username = '';
        fs.writeFileSync(file, JSON.stringify(prefs, null, 2));
      }
      return { ok: true, file };
    },

    status({ dir }) {
      const prefs = readJson(prefsFile(dir)) || {};
      return { user: prefs.Username || null, enabled: !!prefs.Token };
    },
  };
};
