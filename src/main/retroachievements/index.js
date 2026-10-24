import fs from 'node:fs';
import { MESSAGES } from '../constants/messages.js';
import {
  MASKED_KEY_VISIBLE_CHARACTERS,
  RA_CACHE_DIR_PARTS,
  RA_COMPLETION_PROGRESS_LIMIT,
} from '../constants/retroachievements.js';
import { resolveDataPath } from '../core/app-paths.js';
import { toPortablePath } from '../core/config-store.js';
import { isGameRunning } from '../emulators/runner.js';
import { deleteRaAccount, hasRaToken, loadRaAccount, saveRaAccount } from './account.js';
import { loadCachedRaData, readRaCacheEntry } from './api/data-cache.js';
import { fetchRaImageUrls } from './api/image-cache.js';
import { fetchRaLogin } from './api/request.js';
import { fetchRaWebApi } from './api/web-api.js';
import { listConfiguredEmulatorInstallations } from './emulator-installations.js';
import { findEmulatorScript } from './emulators/emulator-scripts.js';

const buildScriptContext = (installation, account, now) => ({
  dir: installation.dir,
  username: account?.username,
  token: account?.token,
  hardcore: Boolean(account?.hardcore),
  now,
});

const runScriptOnInstallation = ({ action, installation, account, now }) => {
  const script = findEmulatorScript(installation.id);
  const base = { id: installation.id, name: installation.name, systems: installation.systems };
  if (!script) return { ...base, status: 'noscript', message: MESSAGES.raNoScript };
  if (!script.supported) {
    const result = script[action]({});
    return {
      ...base,
      status: 'unsupported',
      message: result.message,
      alternative: script.alternative,
    };
  }
  if (!installation.installed)
    return { ...base, status: 'missing', message: MESSAGES.raEmulatorMissing };
  try {
    const result = script[action](buildScriptContext(installation, account, now));
    return {
      ...base,
      status: result.ok ? 'ok' : 'error',
      file: result.file && toPortablePath(result.file),
      message: result.message,
    };
  } catch (error) {
    return { ...base, status: 'error', message: error.message };
  }
};

const runEmulatorScripts = (action, shouldInclude = () => true) => {
  const account = loadRaAccount();
  if (action === 'configure' && !hasRaToken(account)) throw new Error(MESSAGES.raLoginRequired);
  if (isGameRunning()) throw new Error(MESSAGES.raCloseGameFirst);
  const now = Date.now();
  return listConfiguredEmulatorInstallations()
    .filter(shouldInclude)
    .map((installation) => runScriptOnInstallation({ action, installation, account, now }));
};

export const applyRaToAllEmulators = () => runEmulatorScripts('configure');

export const clearRaFromAllEmulators = () => runEmulatorScripts('clear');

export const applyRaToEmulator = (emulatorId) =>
  runEmulatorScripts('configure', (installation) => installation.id === emulatorId);

export const createRaLogin = async ({ username, password, apiKey, hardcore }) => {
  const login = await fetchRaLogin(username, password);
  const previousAccount = loadRaAccount() ?? {};
  saveRaAccount({
    username: login.User,
    token: login.Token,
    apiKey: apiKey || previousAccount.apiKey || '',
    hardcore: hardcore !== undefined ? Boolean(hardcore) : Boolean(previousAccount.hardcore),
    points: login.Score || 0,
    softcorePoints: login.SoftcoreScore || 0,
    avatar: login.AvatarUrl || `/UserPic/${login.User}.png`,
    loggedAt: Date.now(),
  });
  return { user: login.User, points: login.Score || 0, results: applyRaToAllEmulators() };
};

export const deleteRaLogin = () => {
  const account = loadRaAccount();
  const results = hasRaToken(account) ? clearRaFromAllEmulators() : [];
  if (account?.apiKey) {
    saveRaAccount({
      username: account.username,
      apiKey: account.apiKey,
      hardcore: Boolean(account.hardcore),
    });
  } else {
    deleteRaAccount();
  }
  fs.rmSync(resolveDataPath(...RA_CACHE_DIR_PARTS), { recursive: true, force: true });
  return results;
};

export const updateRaAccount = (patch) => {
  const account = loadRaAccount() ?? {};
  saveRaAccount({ ...account, ...patch });
  return patch.hardcore !== undefined && account.token ? applyRaToAllEmulators() : [];
};

const maskApiKey = (apiKey) =>
  apiKey
    ? `${apiKey.slice(0, MASKED_KEY_VISIBLE_CHARACTERS)}…${apiKey.slice(-MASKED_KEY_VISIBLE_CHARACTERS)}`
    : '';

const readEmulatorRaStatus = (installation) => {
  const script = findEmulatorScript(installation.id);
  let emulatorStatus = { user: null, enabled: false };
  try {
    if (script && installation.installed)
      emulatorStatus = script.readStatus({ dir: installation.dir });
  } catch (error) {
    console.error('Failed to read RetroAchievements status', installation.id, error);
  }
  return {
    id: installation.id,
    name: installation.name,
    systems: installation.systems,
    installed: installation.installed,
    supported: Boolean(script?.supported),
    hasScript: Boolean(script),
    alternative: script?.alternative,
    user: emulatorStatus.user,
    enabled: emulatorStatus.enabled,
    message: emulatorStatus.message,
  };
};

export const buildRaStatus = () => {
  const account = loadRaAccount();
  return {
    connected: hasRaToken(account),
    username: account?.username,
    hasApiKey: Boolean(account?.apiKey),
    apiKeyHint: maskApiKey(account?.apiKey),
    hardcore: Boolean(account?.hardcore),
    points: account ? account.points : 0,
    avatar: account?.avatar,
    emulators: listConfiguredEmulatorInstallations().map(readEmulatorRaStatus),
  };
};

const loadWebApiAccountOrThrow = () => {
  const account = loadRaAccount();
  if (!account?.username) throw new Error(MESSAGES.raSignInInSettings);
  if (!account.apiKey) throw new Error(MESSAGES.raApiKeyRequired);
  return account;
};

export const loadRaOverview = (isForced) => {
  const account = loadWebApiAccountOrThrow();
  return loadCachedRaData({
    name: 'overview',
    isForced,
    fetchData: async () => {
      const [profile, progress] = await Promise.all([
        fetchRaWebApi('API_GetUserProfile', { u: account.username }, account.apiKey),
        fetchRaWebApi(
          'API_GetUserCompletionProgress',
          { u: account.username, c: RA_COMPLETION_PROGRESS_LIMIT },
          account.apiKey,
        ),
      ]);
      return { profile, games: progress.Results || [] };
    },
  });
};

export const loadRaGame = (gameId, isForced) => {
  const account = loadWebApiAccountOrThrow();
  const overview = readRaCacheEntry('overview');
  const summary = overview?.data.games?.find((game) => game.GameID === gameId);
  return loadCachedRaData({
    name: `game-${gameId}`,
    isForced,
    fetchData: () =>
      fetchRaWebApi(
        'API_GetGameInfoAndUserProgress',
        { g: gameId, u: account.username, a: 1 },
        account.apiKey,
      ),
    ...(summary
      ? { isFresh: (cacheEntry) => cacheEntry.data.NumAwardedToUser === summary.NumAwarded }
      : {}),
  });
};

export const fetchRaImages = (relativePaths) => fetchRaImageUrls(relativePaths);

export { loadRaAccount };
