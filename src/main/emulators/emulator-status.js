import fs from 'node:fs';
import { getConfig, resolveConfigPath } from '../core/config-store.js';
import { findEmulatorSource } from './sources.js';

export const listEmulatorStatus = () =>
  getConfig().systems.flatMap((system) =>
    (system.emulators ?? []).map((emulator) => ({
      system: system.id,
      systemName: system.name,
      id: emulator.id,
      name: emulator.name,
      exe: emulator.exe,
      installed: Boolean(emulator.exe) && fs.existsSync(resolveConfigPath(emulator.exe)),
      downloadable: Boolean(findEmulatorSource(emulator.id)),
    })),
  );

export const buildEmulatorKey = (systemId, emulatorId) => `${systemId}/${emulatorId}`;
