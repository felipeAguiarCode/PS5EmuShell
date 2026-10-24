import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { findEmulatorScript } from '../../src/main/retroachievements/emulators/emulator-scripts.js';

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps5emushell-ra-'));
const ACCOUNT = { username: 'TestUser', token: 'TOKEN-1234', hardcore: true, now: new Date() };

after(() => fs.rmSync(workDir, { recursive: true, force: true }));

const readFileMasked = (file) =>
  fs.readFileSync(file, 'utf8').replace(/LoginTimestamp = \d+/g, 'LoginTimestamp = <ts>');

const createPortableDir = (emulatorId) => {
  const dir = path.join(workDir, emulatorId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'portable.txt'), '');
  return dir;
};

describe('DuckStation script', () => {
  it('writes an encrypted token and clears the login', () => {
    const script = findEmulatorScript('duckstation');
    const dir = createPortableDir('duckstation');
    const settingsFile = path.join(dir, 'settings.ini');
    script.configure({ dir, ...ACCOUNT });
    assert.equal(
      readFileMasked(settingsFile),
      '[Cheevos]\r\nEnabled = true\r\nUsername = TestUser\r\nToken = ap8uQ3TZS/bT0O2VqHMWuw==\r\nLoginTimestamp = <ts>\r\nChallengeMode = true\r\n',
    );
    assert.deepEqual(script.readStatus({ dir }), { user: 'TestUser', enabled: true });
    script.clear({ dir });
    assert.equal(
      readFileMasked(settingsFile),
      '[Cheevos]\r\nEnabled = false\r\nChallengeMode = true\r\n',
    );
    assert.deepEqual(script.readStatus({ dir }), { user: null, enabled: false });
  });
});

describe('PCSX2 script', () => {
  it('writes the login to PCSX2.ini and secrets.ini', () => {
    const script = findEmulatorScript('pcsx2');
    const dir = createPortableDir('pcsx2');
    script.configure({ dir, ...ACCOUNT });
    assert.equal(
      readFileMasked(path.join(dir, 'inis', 'PCSX2.ini')),
      '[Achievements]\r\nEnabled = true\r\nChallengeMode = true\r\nUsername = TestUser\r\nToken = TOKEN-1234\r\nLoginTimestamp = <ts>\r\n',
    );
    assert.equal(
      fs.readFileSync(path.join(dir, 'inis', 'secrets.ini'), 'utf8'),
      '[Achievements]\r\nToken = TOKEN-1234\r\n',
    );
    script.clear({ dir });
    assert.equal(
      fs.readFileSync(path.join(dir, 'inis', 'secrets.ini'), 'utf8'),
      '[Achievements]\r\n',
    );
  });
});

describe('RAIntegration scripts', () => {
  it('writes RAPrefs and keeps hardcore after logout', () => {
    const script = findEmulatorScript('ranes');
    const dir = createPortableDir('ranes');
    const preferencesFile = path.join(dir, 'RAPrefs_RANes.cfg');
    script.configure({ dir, ...ACCOUNT });
    assert.deepEqual(JSON.parse(fs.readFileSync(preferencesFile, 'utf8')), {
      Username: 'TestUser',
      Token: 'TOKEN-1234',
      'Hardcore Active': true,
    });
    script.clear({ dir });
    assert.deepEqual(JSON.parse(fs.readFileSync(preferencesFile, 'utf8')), {
      Username: '',
      'Hardcore Active': true,
    });
    assert.deepEqual(script.readStatus({ dir }), { user: null, enabled: false });
  });
});

describe('unsupported emulators', () => {
  it('skips configuration with a message', () => {
    const script = findEmulatorScript('melonds');
    assert.equal(script.supported, false);
    assert.deepEqual(script.configure({}), {
      ok: false,
      skipped: true,
      message: 'O melonDS não tem RetroAchievements.',
    });
  });
});
