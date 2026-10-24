import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildEntryPath,
  buildNativePickerOptions,
  findBaseName,
  findStartPath,
  formatEntryCount,
  listFileBrowserHints,
} from '../../src/renderer/scripts/views/file-browser/file-browser-model.js';

const PLACES = [
  { kind: 'user', label: 'Documentos', path: 'C:\\Users\\me' },
  { kind: 'games', label: 'Jogos', path: 'D:\\Games' },
  { kind: 'base', label: 'Pasta de ROMs', path: 'C:\\Emuladores\\roms' },
  { kind: 'user', label: 'Imagens', path: 'C:\\Users\\me\\Pictures' },
];

describe('findStartPath', () => {
  it('prefers the explicit start folder', () => {
    assert.equal(findStartPath({ mode: 'exe', start: 'E:\\', places: PLACES }), 'E:\\');
  });

  it('picks a starting place for each mode', () => {
    assert.equal(findStartPath({ mode: 'exe', places: PLACES }), 'D:\\Games');
    assert.equal(findStartPath({ mode: 'dir', places: PLACES }), 'C:\\Emuladores\\roms');
    assert.equal(findStartPath({ mode: 'image', places: PLACES }), 'C:\\Users\\me\\Pictures');
  });

  it('is undefined without places', () => {
    assert.equal(findStartPath({ mode: 'exe', places: [] }), undefined);
  });
});

describe('paths', () => {
  it('joins entries and finds base names', () => {
    assert.equal(buildEntryPath('C:\\', 'Games'), 'C:\\Games');
    assert.equal(buildEntryPath('C:\\Games\\', 'a.exe'), 'C:\\Games\\a.exe');
    assert.equal(findBaseName('C:\\Games\\Sub\\'), 'Sub');
  });
});

describe('formatEntryCount', () => {
  const entries = [{ type: 'dir' }, { type: 'exe' }, { type: 'exe' }];

  it('counts folders and files with the mode word', () => {
    assert.equal(formatEntryCount('exe', entries), '1 pasta · 2 executáveis');
    assert.equal(formatEntryCount('image', [{ type: 'img' }]), '0 pastas · 1 imagem');
    assert.equal(formatEntryCount('dir', entries), '1 pasta');
  });
});

describe('buildNativePickerOptions', () => {
  it('uses folder dialogs for the folder mode', () => {
    assert.equal(buildNativePickerOptions('dir', 'C:\\').kind, 'folder');
    assert.equal(buildNativePickerOptions('image', 'C:\\').filters[0].name, 'Imagens');
    assert.equal(buildNativePickerOptions('exe', 'C:\\').title, 'Executável do jogo');
  });
});

describe('listFileBrowserHints', () => {
  it('offers "use this folder" only in folder mode', () => {
    assert.equal(listFileBrowserHints('dir').length, 5);
    assert.equal(listFileBrowserHints('exe').length, 4);
  });
});
