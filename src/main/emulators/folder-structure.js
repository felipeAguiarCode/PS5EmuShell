import fs from 'node:fs';
import path from 'node:path';
import { BIOS_SYSTEM_IDS } from '../constants/emulators.js';
import { MESSAGES } from '../constants/messages.js';
import { getConfig, resolveConfigPath, saveConfig } from '../core/config-store.js';
import { buildSystemCatalog, findCatalogSystemById } from '../defaults/system-catalog.js';
import { findEmulatorSource, formatSourceLabel } from './sources.js';

export const isRelativePath = (candidatePath) =>
  Boolean(candidatePath) && !path.isAbsolute(candidatePath);

const normalizeDirKey = (relativeDir) => relativeDir.replace(/\\/g, '/').replace(/\/+$/, '');

export const listExpectedDirLabels = (systems) => {
  const dirLabels = new Map();
  const addDir = (relativeDir, label) => {
    const key = normalizeDirKey(relativeDir);
    if (!dirLabels.has(key)) dirLabels.set(key, label);
  };
  for (const system of systems) {
    if (system.enabled === false) continue;
    for (const romDir of system.romDirs ?? []) {
      if (isRelativePath(romDir)) addDir(romDir, MESSAGES.romsDirLabel(system.name));
    }
    addDir(`saves/${system.id}`, MESSAGES.savesDirLabel(system.name));
    if (system.bios ?? BIOS_SYSTEM_IDS.includes(system.id)) {
      addDir(`bios/${system.id}`, MESSAGES.biosDirLabel(system.name));
    }
    for (const emulator of system.emulators ?? []) {
      if (isRelativePath(emulator.exe)) {
        addDir(
          path.posix.dirname(emulator.exe.replace(/\\/g, '/')),
          MESSAGES.emulatorDirLabel(emulator.name),
        );
      }
    }
  }
  addDir('screenshots', MESSAGES.screenshotsDirLabel);
  return [...dirLabels];
};

export const listExpectedDirs = () =>
  listExpectedDirLabels(getConfig().systems).map(([rel, label]) => ({
    rel,
    label,
    exists: fs.existsSync(resolveConfigPath(rel)),
  }));

export const createFolderStructure = () => {
  for (const dir of listExpectedDirs()) {
    if (!dir.exists) fs.mkdirSync(resolveConfigPath(dir.rel), { recursive: true });
  }
  return listExpectedDirs();
};

export const listCatalogStatus = () => {
  const addedSystemIds = new Set(getConfig().systems.map((system) => system.id));
  return buildSystemCatalog().map((system) => ({
    id: system.id,
    name: system.name,
    shortName: system.shortName,
    emulators: system.emulators.map((emulator) => emulator.name),
    source: formatSourceLabel(findEmulatorSource(system.defaultEmulator)),
    added: addedSystemIds.has(system.id),
  }));
};

export const addCatalogSystem = (systemId) => {
  const catalogSystem = findCatalogSystemById(systemId);
  if (!catalogSystem) throw new Error(MESSAGES.unknownSystem);
  const config = getConfig();
  if (!config.systems.some((system) => system.id === systemId)) {
    saveConfig({ ...config, systems: [...config.systems, catalogSystem] });
  }
  createFolderStructure();
  return catalogSystem;
};
