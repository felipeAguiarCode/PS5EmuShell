import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AVATARS_DIR_PARTS, DATA_FILES, IMAGE_FILE_PATTERN } from '../constants/app.js';
import { MESSAGES } from '../constants/messages.js';
import { buildDefaultConfig } from '../defaults/default-config.js';
import { buildPcSystem } from '../defaults/pc-system.js';
import { buildSystemCatalog } from '../defaults/system-catalog.js';
import { resolveDataPath, resolveRootPath } from './app-paths.js';
import { migrateConfig } from './config-migration.js';
import { readJsonFileOrDefault, writeJsonFile } from './json-file.js';

let currentConfig = null;

const readOperatingSystemUserName = () => {
  try {
    return os.userInfo().username || MESSAGES.defaultProfileName;
  } catch {
    return MESSAGES.defaultProfileName;
  }
};

const listBundledAvatarFileNames = () => {
  try {
    return fs
      .readdirSync(resolveRootPath(...AVATARS_DIR_PARTS))
      .filter((fileName) => IMAGE_FILE_PATTERN.test(fileName))
      .sort();
  } catch {
    return [];
  }
};

export const buildCurrentDefaultConfig = () =>
  buildDefaultConfig({ profileName: readOperatingSystemUserName() });

export const saveConfig = (nextConfig) => {
  currentConfig = nextConfig;
  writeJsonFile(resolveDataPath(DATA_FILES.config), currentConfig);
  return currentConfig;
};

export const loadConfig = () => {
  const { config, hasChanged } = migrateConfig({
    savedConfig: readJsonFileOrDefault(resolveDataPath(DATA_FILES.config), null),
    defaultConfig: buildCurrentDefaultConfig(),
    catalogSystems: buildSystemCatalog(),
    pcSystem: buildPcSystem(),
    avatarFileNames: listBundledAvatarFileNames(),
  });
  currentConfig = config;
  if (hasChanged) saveConfig(config);
  return currentConfig;
};

export const getConfig = () => currentConfig ?? loadConfig();

export const getBaseDir = () => path.resolve(resolveRootPath(), getConfig().baseDir || '..');

export const resolveConfigPath = (configuredPath) => {
  if (!configuredPath) return '';
  if (path.isAbsolute(configuredPath)) return path.normalize(configuredPath);
  return path.resolve(getBaseDir(), configuredPath);
};

export const toPortablePath = (absolutePath) => {
  if (!absolutePath) return absolutePath;
  const relativePath = path.relative(getBaseDir(), absolutePath);
  const isInsideBaseDir =
    relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
  return isInsideBaseDir ? relativePath.split(path.sep).join('/') : absolutePath;
};

export const findSystemById = (systemId) =>
  getConfig().systems.find((system) => system.id === systemId) ?? null;
