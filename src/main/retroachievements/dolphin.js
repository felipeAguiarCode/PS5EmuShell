// Dolphin (GameCube): User/Config/RetroAchievements.ini › [Achievements] (modo portable: pasta User ao lado do exe).
const fs = require('fs');
const path = require('path');
const ini = require('./ini');

const configFile = (dir) => path.join(dir, 'User', 'Config', 'RetroAchievements.ini');

module.exports = {
  id: 'dolphin',
  name: 'Dolphin',
  supported: true,

  configure({ dir, username, token, hardcore }) {
    const file = configFile(dir);
    ini.set(file, 'Achievements', {
      Enabled: 'True',
      Username: username,
      ApiToken: token,
      HardcoreEnabled: hardcore ? 'True' : 'False',
    });
    return { ok: true, file };
  },

  clear({ dir }) {
    const file = configFile(dir);
    if (fs.existsSync(file)) ini.set(file, 'Achievements', { Enabled: 'False', Username: null, ApiToken: null });
    return { ok: true, file };
  },

  status({ dir }) {
    const file = configFile(dir);
    return { user: ini.get(file, 'Achievements', 'Username'), enabled: ini.get(file, 'Achievements', 'Enabled') === 'True' };
  },
};
