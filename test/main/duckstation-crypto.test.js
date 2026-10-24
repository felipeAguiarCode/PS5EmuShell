import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  decryptDuckStationToken,
  encryptDuckStationToken,
} from '../../src/main/retroachievements/formats/duckstation-crypto.js';

describe('encryptDuckStationToken', () => {
  it('produces the token DuckStation expects for portable installs', () => {
    assert.equal(
      encryptDuckStationToken('TOKEN123abcDEF', 'Player', ''),
      'DSrJ18i4PB0RqqqSUgGkSQ==',
    );
  });

  it('mixes the machine key into the cipher', () => {
    assert.equal(
      encryptDuckStationToken('TOKEN123abcDEF', 'Player', 'guid-0000'),
      'cai4slXzizeGFlyU78TrTg==',
    );
  });

  it('pads long tokens to whole blocks', () => {
    assert.equal(
      encryptDuckStationToken('x'.repeat(40), 'someone', ''),
      '3DbMeQJjr6o5XffbY4K5egch+MJ2e+rvPPJ8DWX5PmjsAbV1mty8HoIQE2rVRFKb',
    );
  });

  it('round-trips through decryptDuckStationToken', () => {
    const encrypted = encryptDuckStationToken('round-trip-token', 'Player', '');
    assert.equal(decryptDuckStationToken(encrypted, 'Player', ''), 'round-trip-token');
  });
});
