import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildEmulatorArguments,
  tokenizeArguments,
} from '../../src/main/emulators/command-line.js';

const VALUES = {
  rom: 'C:\\R O M\\a b.iso',
  romDir: 'C:\\R O M',
  romName: 'a b',
  baseDir: 'C:\\base',
  exeDir: 'C:\\e',
};

describe('buildEmulatorArguments', () => {
  it('keeps a quoted rom path with spaces as a single argument', () => {
    assert.deepEqual(buildEmulatorArguments('"{rom}"', VALUES), ['C:\\R O M\\a b.iso']);
  });

  it('keeps quoted literal values together', () => {
    assert.deepEqual(buildEmulatorArguments('--system "Mega Drive" --fullscreen "{rom}"', VALUES), [
      '--system',
      'Mega Drive',
      '--fullscreen',
      'C:\\R O M\\a b.iso',
    ]);
  });

  it('replaces every known placeholder and keeps unknown ones', () => {
    assert.deepEqual(
      buildEmulatorArguments('--dir "{romDir}" --name {romName} {missing} ""', VALUES),
      ['--dir', 'C:\\R O M', '--name', 'a b', '{missing}', ''],
    );
  });

  it('falls back to the rom path when the template is empty', () => {
    assert.deepEqual(buildEmulatorArguments('', VALUES), ['C:\\R O M\\a b.iso']);
  });
});

describe('tokenizeArguments', () => {
  it('splits on whitespace outside quotes', () => {
    assert.deepEqual(tokenizeArguments('-b -e "{rom}"'), ['-b', '-e', '{rom}']);
  });
});
