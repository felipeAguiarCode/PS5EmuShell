import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildEmulatorDescription,
  buildEmulatorFromExe,
  buildNewSystem,
  buildProgressText,
  buildRaStatusLine,
  buildSlug,
  calculateRangePercent,
  clampValue,
  countGamesBySystem,
  findNextOptionValue,
  findPageRoot,
  formatEmulatorVersion,
  normalizeKillListName,
  parseExtensions,
  pickRecommendedSystemId,
} from '../../src/renderer/scripts/views/settings/settings-helpers.js';

const formatSize = (bytes) => `${bytes} B`;

describe('buildSlug', () => {
  it('removes accents and symbols and limits the length', () => {
    assert.equal(buildSlug('Sega Saturn (Japão)'), 'segasaturnjapao');
    assert.equal(buildSlug('Um nome muito comprido demais'), 'umnomemuitocompr');
  });

  it('falls back to item when nothing is left', () => {
    assert.equal(buildSlug('***'), 'item');
  });
});

describe('formatEmulatorVersion', () => {
  it('normalizes release tags', () => {
    assert.equal(formatEmulatorVersion({ version: 'release_0_9_13' }), '0.9.13');
    assert.equal(formatEmulatorVersion({ version: 'fceux-2.7.0' }), '2.7.0');
    assert.equal(formatEmulatorVersion({ version: 'v2.8.2' }), '2.8.2');
  });

  it('shows the build date for rolling tags', () => {
    assert.equal(
      formatEmulatorVersion({ version: 'latest', published: '2026-02-01' }),
      'build de 01/02/2026',
    );
    assert.equal(formatEmulatorVersion({ version: 'latest' }), 'latest');
    assert.equal(formatEmulatorVersion(null), '');
  });
});

describe('buildProgressText', () => {
  const emulator = { id: 'flycast', installed: true, downloadable: true };

  it('describes download progress', () => {
    assert.equal(
      buildProgressText({ emulator, progress: { phase: 'download', pct: 0.42 }, formatSize }),
      'Baixando 42%',
    );
    assert.equal(
      buildProgressText({ emulator, progress: { phase: 'download', bytes: 10 }, formatSize }),
      'Baixando 10 B',
    );
  });

  it('describes the version state when idle', () => {
    const version = { state: 'old', latest: { version: 'v2.4' } };
    assert.equal(buildProgressText({ emulator, version, formatSize }), 'Atualizar para 2.4');
    assert.equal(
      buildProgressText({ emulator: { ...emulator, installed: false }, version, formatSize }),
      'Baixar 2.4',
    );
    assert.equal(
      buildProgressText({ emulator: { ...emulator, downloadable: false }, formatSize }),
      'Instalado',
    );
  });
});

describe('buildEmulatorDescription', () => {
  it('lists the source and the installed and latest versions', () => {
    const emulator = { systemName: 'Dreamcast', installed: true, downloadable: true };
    const version = {
      source: 'GitHub',
      installed: { version: 'v2.3' },
      latest: { version: 'v2.4' },
    };
    assert.equal(
      buildEmulatorDescription(emulator, version, false),
      'Dreamcast · Fonte: GitHub\nInstalada: 2.3 · Última: 2.4',
    );
  });

  it('shows the loading state while versions load', () => {
    const emulator = { systemName: 'PS2', installed: false, downloadable: true };
    assert.equal(
      buildEmulatorDescription(emulator, null, true),
      'PS2\nInstalada: não instalado · Última: consultando…',
    );
  });
});

describe('buildRaStatusLine', () => {
  it('reports each RetroAchievements state', () => {
    assert.equal(buildRaStatusLine({ hasScript: false }), 'Sem script');
    assert.equal(
      buildRaStatusLine({ hasScript: true, supported: false, alternative: 'RetroArch' }),
      'Sem suporte · use RetroArch',
    );
    assert.equal(
      buildRaStatusLine({
        hasScript: true,
        supported: true,
        installed: true,
        enabled: true,
        user: 'Ana',
      }),
      '✓ Conectado como Ana',
    );
  });
});

describe('row helpers', () => {
  it('cycles select options in both directions', () => {
    const options = [{ v: 'a' }, { v: 'b' }, { v: 'c' }];
    assert.equal(findNextOptionValue(options, 'c', 'right'), 'a');
    assert.equal(findNextOptionValue(options, 'a', 'left'), 'c');
  });

  it('calculates range fill and clamps values', () => {
    assert.equal(calculateRangePercent(50, 0, 100), 50);
    assert.equal(clampValue(120, 1, 99), 99);
  });

  it('maps system detail pages to the systems root', () => {
    assert.equal(findPageRoot('system:ps2'), 'systems');
    assert.equal(findPageRoot('covers'), 'covers');
  });
});

describe('config builders', () => {
  it('creates a new system with a unique id', () => {
    const system = buildNewSystem({
      name: 'Saturn',
      systems: [{ id: 'saturn' }],
      palette: ['#111', '#222'],
    });
    assert.equal(system.id, 'saturn2');
    assert.equal(system.shortName, 'SATU');
    assert.equal(system.color, '#222');
    assert.deepEqual(system.romDirs, ['roms/saturn2']);
  });

  it('creates an emulator entry from an executable path', () => {
    assert.deepEqual(buildEmulatorFromExe('C:\\cores\\flycast\\Flycast.exe', []), {
      id: 'flycast',
      name: 'Flycast',
      exe: 'C:\\cores\\flycast\\Flycast.exe',
      args: '"{rom}"',
    });
  });

  it('parses extensions and kill list names', () => {
    assert.deepEqual(parseExtensions('iso, .BIN;chd'), ['.iso', '.bin', '.chd']);
    assert.equal(normalizeKillListName(' Chrome.EXE '), 'chrome');
  });

  it('counts games per system', () => {
    assert.deepEqual(
      countGamesBySystem([{ system: 'ps2' }, { system: 'ps2' }, { system: 'psp' }]),
      {
        ps2: 2,
        psp: 1,
      },
    );
  });

  it('recommends a system only when it is clearly the best match', () => {
    assert.equal(
      pickRecommendedSystemId([
        { id: 'ps2', files: 3, hint: 0 },
        { id: 'gc', files: 1 },
      ]),
      'ps2',
    );
    assert.equal(
      pickRecommendedSystemId([
        { id: 'ps2', files: 2, hint: 0 },
        { id: 'gc', files: 2 },
      ]),
      null,
    );
    assert.equal(pickRecommendedSystemId([]), null);
  });
});
