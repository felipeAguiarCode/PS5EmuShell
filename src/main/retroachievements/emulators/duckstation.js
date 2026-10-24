import fs from 'node:fs';
import path from 'node:path';
import { DUCKSTATION_PORTABLE_MARKERS } from '../../constants/retroachievements.js';
import { encryptDuckStationToken, readMachineGuid } from '../formats/duckstation-crypto.js';
import { readIniValue, saveIniValues } from '../formats/ini.js';
import { formatBoolean, formatLoginTimestamp } from './setting-values.js';

const SECTION = 'Cheevos';

const isPortableInstall = (dir) =>
  DUCKSTATION_PORTABLE_MARKERS.some((marker) => fs.existsSync(path.join(dir, marker)));

const resolveSettingsFile = (dir) => path.join(dir, 'settings.ini');

export const duckstationScript = {
  id: 'duckstation',
  name: 'DuckStation',
  supported: true,
  configure: ({ dir, username, token, hardcore, now }) => {
    const machineKey = isPortableInstall(dir) ? '' : readMachineGuid();
    const file = resolveSettingsFile(dir);
    saveIniValues(file, SECTION, {
      Enabled: 'true',
      Username: username,
      Token: encryptDuckStationToken(token, username, machineKey),
      LoginTimestamp: formatLoginTimestamp(now),
      ChallengeMode: formatBoolean(hardcore),
    });
    return { ok: true, file };
  },
  clear: ({ dir }) => {
    const file = resolveSettingsFile(dir);
    if (!fs.existsSync(file)) return { ok: true };
    saveIniValues(file, SECTION, {
      Enabled: 'false',
      Username: null,
      Token: null,
      LoginTimestamp: null,
    });
    return { ok: true, file };
  },
  readStatus: ({ dir }) => {
    const file = resolveSettingsFile(dir);
    return {
      user: readIniValue(file, SECTION, 'Username'),
      enabled: readIniValue(file, SECTION, 'Enabled') === 'true',
    };
  },
};
