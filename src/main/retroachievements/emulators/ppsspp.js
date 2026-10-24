import fs from 'node:fs';
import path from 'node:path';
import { readIniValue, saveIniValues } from '../formats/ini.js';
import { formatCapitalizedBoolean } from './setting-values.js';

const SECTION = 'Achievements';
const TOKEN_FILE = 'ppsspp_retroachievements.dat';

const resolveSystemDir = (dir) => path.join(dir, 'memstick', 'PSP', 'SYSTEM');
const resolveSettingsFile = (dir) => path.join(resolveSystemDir(dir), 'ppsspp.ini');

export const ppssppScript = {
  id: 'ppsspp',
  name: 'PPSSPP',
  supported: true,
  configure: ({ dir, username, token, hardcore }) => {
    const file = resolveSettingsFile(dir);
    saveIniValues(file, SECTION, {
      AchievementsEnable: 'True',
      AchievementsUserName: username,
      AchievementsChallengeMode: formatCapitalizedBoolean(hardcore),
    });
    fs.writeFileSync(path.join(resolveSystemDir(dir), TOKEN_FILE), token);
    return { ok: true, file };
  },
  clear: ({ dir }) => {
    const file = resolveSettingsFile(dir);
    if (fs.existsSync(file)) {
      saveIniValues(file, SECTION, { AchievementsEnable: 'False', AchievementsUserName: '' });
    }
    fs.rmSync(path.join(resolveSystemDir(dir), TOKEN_FILE), { force: true });
    return { ok: true, file };
  },
  readStatus: ({ dir }) => {
    const file = resolveSettingsFile(dir);
    return {
      user: readIniValue(file, SECTION, 'AchievementsUserName'),
      enabled: readIniValue(file, SECTION, 'AchievementsEnable') === 'True',
    };
  },
};
