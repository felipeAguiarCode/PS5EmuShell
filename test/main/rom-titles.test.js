import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findRegion, formatGameTitle } from '../../src/main/library/rom-titles.js';

describe('formatGameTitle', () => {
  it('removes tags and keeps the disc number', () => {
    assert.equal(
      formatGameTitle('Final Fantasy VII (USA) (Disc 1)'),
      'Final Fantasy VII (Disco 1)',
    );
  });

  it('moves a trailing article to the front', () => {
    assert.equal(
      formatGameTitle('Legend of Zelda, The - Test (Europe)'),
      'The Legend of Zelda - Test',
    );
  });

  it('turns underscores into spaces', () => {
    assert.equal(formatGameTitle('Gran_Turismo_4 (Brazil, Portugal)'), 'Gran Turismo 4');
  });
});

describe('findRegion', () => {
  it('finds single and multiple regions', () => {
    assert.equal(findRegion('Metroid Prime (Japan)'), 'Japan');
    assert.equal(findRegion('Gran_Turismo_4 (Brazil, Portugal)'), 'Brazil, Portugal');
    assert.equal(findRegion('Tokyo Xtreme Racer 3 [!]'), '');
  });
});
