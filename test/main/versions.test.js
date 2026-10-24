import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compareInstalledVersion } from '../../src/main/emulators/versions.js';

describe('compareInstalledVersion', () => {
  it('compares numeric versions part by part', () => {
    assert.equal(compareInstalledVersion({ version: '1.2.10' }, { version: '1.2.9' }), 'ok');
    assert.equal(compareInstalledVersion({ version: 'v2.0' }, { version: '2.1' }), 'old');
  });

  it('requires the same version and publish date for shell installs', () => {
    const latest = { version: 'v1', published: '2026-02-01' };
    assert.equal(
      compareInstalledVersion({ by: 'shell', version: 'v1', published: '2026-02-01' }, latest),
      'ok',
    );
    assert.equal(
      compareInstalledVersion({ by: 'shell', version: 'v1', published: '2026-01-01' }, latest),
      'old',
    );
    assert.equal(compareInstalledVersion({ by: 'shell', version: 'v0' }, latest), 'old');
  });

  it('is unknown without a latest version', () => {
    assert.equal(compareInstalledVersion({ version: '1.0' }, null), 'unknown');
  });
});
