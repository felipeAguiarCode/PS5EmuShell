import fs from 'node:fs';
import path from 'node:path';
import { readIniValue, saveIniValues } from '../formats/ini.js';
import { formatBoolean, formatLoginTimestamp } from './setting-values.js';

const SECTION = 'Achievements';

const resolveMainIni = (dir) => path.join(dir, 'inis', 'PCSX2.ini');
const resolveSecretsIni = (dir) => path.join(dir, 'inis', 'secrets.ini');

export const pcsx2Script = {
  id: 'pcsx2',
  name: 'PCSX2',
  supported: true,
  configure: ({ dir, username, token, hardcore, now }) => {
    const mainIni = resolveMainIni(dir);
    saveIniValues(mainIni, SECTION, {
      Enabled: 'true',
      ChallengeMode: formatBoolean(hardcore),
      Username: username,
      Token: token,
      LoginTimestamp: formatLoginTimestamp(now),
    });
    saveIniValues(resolveSecretsIni(dir), SECTION, { Token: token });
    return { ok: true, file: mainIni };
  },
  clear: ({ dir }) => {
    const mainIni = resolveMainIni(dir);
    if (fs.existsSync(mainIni)) {
      saveIniValues(mainIni, SECTION, {
        Enabled: 'false',
        Username: null,
        Token: null,
        LoginTimestamp: null,
      });
    }
    const secretsIni = resolveSecretsIni(dir);
    if (fs.existsSync(secretsIni)) saveIniValues(secretsIni, SECTION, { Token: null });
    return { ok: true, file: mainIni };
  },
  readStatus: ({ dir }) => {
    const mainIni = resolveMainIni(dir);
    return {
      user: readIniValue(mainIni, SECTION, 'Username'),
      enabled: readIniValue(mainIni, SECTION, 'Enabled') === 'true',
    };
  },
};
