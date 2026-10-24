import { dolphinScript } from './dolphin.js';
import { duckstationScript } from './duckstation.js';
import { pcsx2Script } from './pcsx2.js';
import { ppssppScript } from './ppsspp.js';
import { ranesScript } from './raintegration/ranes.js';
import { rasnes9xScript } from './raintegration/rasnes9x.js';
import { ravbaScript } from './raintegration/ravba.js';
import { UNSUPPORTED_EMULATOR_SCRIPTS } from './unsupported/unsupported-emulators.js';

const EMULATOR_SCRIPTS = new Map(
  [
    duckstationScript,
    pcsx2Script,
    ppssppScript,
    dolphinScript,
    ranesScript,
    rasnes9xScript,
    ravbaScript,
    ...UNSUPPORTED_EMULATOR_SCRIPTS,
  ].map((script) => [script.id, script]),
);

export const findEmulatorScript = (emulatorId) => EMULATOR_SCRIPTS.get(emulatorId) ?? null;
