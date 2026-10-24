import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import {
  AES_BLOCK_BYTES,
  DUCKSTATION_KEY_EXTRA_ROUNDS,
  MACHINE_GUID_REGISTRY_KEY,
} from '../../constants/retroachievements.js';

const CIPHER = 'aes-128-cbc';
const MACHINE_GUID_PATTERN = /MachineGuid\s+REG_SZ\s+(\S+)/;

const deriveKey = (username, machineKey) => {
  const initialHash = crypto.createHash('sha256');
  if (machineKey) initialHash.update(Buffer.from(machineKey, 'utf8'));
  initialHash.update(Buffer.from(username, 'utf8'));
  let key = initialHash.digest();
  for (let round = 0; round < DUCKSTATION_KEY_EXTRA_ROUNDS; round += 1) {
    key = crypto.createHash('sha256').update(key).digest();
  }
  return key;
};

const splitKeyAndIv = (key) => ({ cipherKey: key.subarray(0, 16), iv: key.subarray(16, 32) });

export const encryptDuckStationToken = (token, username, machineKey) => {
  const { cipherKey, iv } = splitKeyAndIv(deriveKey(username, machineKey));
  const rawToken = Buffer.from(token, 'utf8');
  const paddedToken = Buffer.alloc(Math.ceil(rawToken.length / AES_BLOCK_BYTES) * AES_BLOCK_BYTES);
  rawToken.copy(paddedToken);
  const cipher = crypto.createCipheriv(CIPHER, cipherKey, iv);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(paddedToken), cipher.final()]).toString('base64');
};

export const decryptDuckStationToken = (encryptedToken, username, machineKey) => {
  const { cipherKey, iv } = splitKeyAndIv(deriveKey(username, machineKey));
  const encryptedBytes = Buffer.from(encryptedToken, 'base64');
  if (!encryptedBytes.length || encryptedBytes.length % AES_BLOCK_BYTES) return null;
  const decipher = crypto.createDecipheriv(CIPHER, cipherKey, iv);
  decipher.setAutoPadding(false);
  const decrypted = Buffer.concat([decipher.update(encryptedBytes), decipher.final()]);
  const terminatorIndex = decrypted.indexOf(0);
  return decrypted
    .subarray(0, terminatorIndex < 0 ? decrypted.length : terminatorIndex)
    .toString('utf8');
};

export const readMachineGuid = () => {
  try {
    const output = execFileSync('reg', ['query', MACHINE_GUID_REGISTRY_KEY, '/v', 'MachineGuid'], {
      encoding: 'utf8',
      windowsHide: true,
    });
    return output.match(MACHINE_GUID_PATTERN)?.[1] ?? '';
  } catch {
    return '';
  }
};
