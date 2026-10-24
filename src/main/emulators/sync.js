import fs from 'node:fs';
import path from 'node:path';
import { getConfig, resolveConfigPath, saveConfig, toPortablePath } from '../core/config-store.js';
import { findFileByPattern, makeExactFileNamePattern } from './file-search.js';
import { findEmulatorSource } from './sources.js';

const findMovedExecutable = async (exePath, source) => {
  const emulatorDir = path.dirname(exePath);
  if (!fs.existsSync(emulatorDir)) return null;
  const byName = await findFileByPattern(
    emulatorDir,
    makeExactFileNamePattern(path.basename(exePath)),
  );
  if (byName) return byName;
  return source ? findFileByPattern(emulatorDir, source.exe) : null;
};

const syncEmulator = async (system, emulator) => {
  const base = { id: emulator.id, name: emulator.name, system: system.name };
  const exePath = resolveConfigPath(emulator.exe);
  if (fs.existsSync(exePath))
    return { report: { ...base, status: 'ok', exe: emulator.exe }, emulator };
  const foundExe = await findMovedExecutable(exePath, findEmulatorSource(emulator.id));
  if (!foundExe) return { report: { ...base, status: 'missing', exe: emulator.exe }, emulator };
  const portableExe = toPortablePath(foundExe);
  return {
    report: { ...base, status: 'found', exe: portableExe },
    emulator: { ...emulator, exe: portableExe },
  };
};

export const syncEmulators = async () => {
  const config = getConfig();
  const reports = [];
  let hasChanged = false;
  const systems = [];
  for (const system of config.systems) {
    const emulators = [];
    for (const emulator of system.emulators ?? []) {
      if (!emulator.exe) {
        emulators.push(emulator);
        continue;
      }
      const result = await syncEmulator(system, emulator);
      reports.push(result.report);
      if (result.report.status === 'found') hasChanged = true;
      emulators.push(result.emulator);
    }
    systems.push({ ...system, emulators });
  }
  if (hasChanged) saveConfig({ ...config, systems });
  return reports;
};
