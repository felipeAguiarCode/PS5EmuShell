// PPSSPP (PSP): memstick/PSP/SYSTEM/ppsspp.ini › [Achievements];
// o token fica em texto puro em memstick/PSP/SYSTEM/ppsspp_retroachievements.dat.
const fs = require('fs');
const path = require('path');
const ini = require('./ini');

const systemDir = (dir) => path.join(dir, 'memstick', 'PSP', 'SYSTEM');

module.exports = {
  id: 'ppsspp',
  name: 'PPSSPP',
  supported: true,

  configure({ dir, username, token, hardcore }) {
    const sys = systemDir(dir);
    const file = path.join(sys, 'ppsspp.ini');
    ini.set(file, 'Achievements', {
      AchievementsEnable: 'True',
      AchievementsUserName: username,
      AchievementsChallengeMode: hardcore ? 'True' : 'False',
    });
    fs.writeFileSync(path.join(sys, 'ppsspp_retroachievements.dat'), token);
    return { ok: true, file };
  },

  clear({ dir }) {
    const sys = systemDir(dir);
    const file = path.join(sys, 'ppsspp.ini');
    if (fs.existsSync(file)) ini.set(file, 'Achievements', { AchievementsEnable: 'False', AchievementsUserName: '' });
    fs.rmSync(path.join(sys, 'ppsspp_retroachievements.dat'), { force: true });
    return { ok: true, file };
  },

  status({ dir }) {
    const file = path.join(systemDir(dir), 'ppsspp.ini');
    return { user: ini.get(file, 'Achievements', 'AchievementsUserName'), enabled: ini.get(file, 'Achievements', 'AchievementsEnable') === 'True' };
  },
};
