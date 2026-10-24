import fs from 'node:fs';
import path from 'node:path';
import { readIniValue, saveIniValues } from '../formats/ini.js';
import { formatCapitalizedBoolean } from './setting-values.js';

const SECTION = 'Achievements';

const resolveConfigFile = (dir) => path.join(dir, 'User', 'Config', 'RetroAchievements.ini');

export const dolphinScript = {
  id: 'dolphin',
  name: 'Dolphin',
  supported: true,
  configure: ({ dir, username, token, hardcore }) => {
    const file = resolveConfigFile(dir);
    saveIniValues(file, SECTION, {
      Enabled: 'True',
      Username: username,
      ApiToken: token,
      HardcoreEnabled: formatCapitalizedBoolean(hardcore),
    });
    return { ok: true, file };
  },
  clear: ({ dir }) => {
    const file = resolveConfigFile(dir);
    if (fs.existsSync(file)) {
      saveIniValues(file, SECTION, { Enabled: 'False', Username: null, ApiToken: null });
    }
    return { ok: true, file };
  },
  readStatus: ({ dir }) => {
    const file = resolveConfigFile(dir);
    return {
      user: readIniValue(file, SECTION, 'Username'),
      enabled: readIniValue(file, SECTION, 'Enabled') === 'True',
    };
  },
};
