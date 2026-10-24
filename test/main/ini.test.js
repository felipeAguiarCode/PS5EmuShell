import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { readIniValue, saveIniValues } from '../../src/main/retroachievements/formats/ini.js';

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps5emushell-ini-'));

after(() => fs.rmSync(workDir, { recursive: true, force: true }));

describe('saveIniValues', () => {
  it('updates, removes and appends keys while keeping comments and line endings', () => {
    const file = path.join(workDir, 'edited.ini');
    fs.writeFileSync(
      file,
      '[Main]\r\nA = 1\r\n\r\n[Cheevos]\r\nEnabled = false\r\n; comment\r\nOld = x\r\n\r\n[Last]\r\nZ = 9\r\n',
    );
    saveIniValues(file, 'Cheevos', { Enabled: 'true', Username: 'user', Old: null });
    saveIniValues(file, 'NewSection', { Key: 'Value' });
    assert.equal(
      fs.readFileSync(file, 'utf8'),
      '[Main]\r\nA = 1\r\n\r\n[Cheevos]\r\nEnabled = true\r\n; comment\r\nUsername = user\r\n\r\n[Last]\r\nZ = 9\r\n\r\n[NewSection]\r\nKey = Value\r\n',
    );
  });

  it('creates a new file with Windows line endings', () => {
    const file = path.join(workDir, 'nested', 'fresh.ini');
    saveIniValues(file, 'Achievements', { Token: 'abc' });
    assert.equal(fs.readFileSync(file, 'utf8'), '[Achievements]\r\nToken = abc\r\n');
  });
});

describe('readIniValue', () => {
  it('matches sections and keys without case sensitivity', () => {
    const file = path.join(workDir, 'read.ini');
    fs.writeFileSync(file, '﻿[Cheevos]\nUsername = user\n');
    assert.equal(readIniValue(file, 'cheevos', 'username'), 'user');
    assert.equal(readIniValue(file, 'Nope', 'X'), null);
  });
});
