import fs from 'node:fs';
import path from 'node:path';
import { getConfig, resolveConfigPath } from '../core/config-store.js';

export const listConfiguredEmulatorInstallations = () => {
  const installationsByDir = new Map();
  for (const system of getConfig().systems) {
    for (const emulator of system.emulators ?? []) {
      if (!emulator.exe) continue;
      const exePath = resolveConfigPath(emulator.exe);
      const dir = path.dirname(exePath);
      const dirKey = dir.toLowerCase();
      const installation = installationsByDir.get(dirKey) ?? {
        id: emulator.id,
        name: emulator.name,
        dir,
        installed: fs.existsSync(exePath),
        systems: [],
      };
      installationsByDir.set(dirKey, {
        ...installation,
        systems: [...installation.systems, system.name],
      });
    }
  }
  return [...installationsByDir.values()];
};
