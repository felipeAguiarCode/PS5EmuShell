import fs from 'node:fs';
import { DATA_FILES } from '../constants/app.js';
import { resolveDataPath } from '../core/app-paths.js';
import { readJsonFileOrDefault, writeJsonFile } from '../core/json-file.js';

const resolveAccountFile = () => resolveDataPath(DATA_FILES.retroAchievements);

export const loadRaAccount = () => readJsonFileOrDefault(resolveAccountFile(), null);

export const saveRaAccount = (account) => writeJsonFile(resolveAccountFile(), account);

export const deleteRaAccount = () => fs.rmSync(resolveAccountFile(), { force: true });

export const hasRaToken = (account) => Boolean(account?.token);
