// Criptografia do token do RetroAchievements no DuckStation (src/core/achievements.cpp):
// chave = SHA-256(machineKey? + username) seguido de 100 rodadas extras de SHA-256;
// AES-128-CBC com key = bytes 0–15 e IV = bytes 16–31; padding com zeros; saída em Base64.
// Em modo portable o machineKey não entra (só o username).
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const EXTRA_ROUNDS = 100;
const BLOCK = 16;

function deriveKey(username, machineKey) {
  const h = crypto.createHash('sha256');
  if (machineKey) h.update(Buffer.from(machineKey, 'utf8'));
  h.update(Buffer.from(username, 'utf8'));
  let key = h.digest();
  for (let i = 0; i < EXTRA_ROUNDS; i++) key = crypto.createHash('sha256').update(key).digest();
  return key;
}

function encrypt(token, username, machineKey) {
  const key = deriveKey(username, machineKey);
  const raw = Buffer.from(token, 'utf8');
  const data = Buffer.alloc(Math.ceil(raw.length / BLOCK) * BLOCK);
  raw.copy(data);
  const c = crypto.createCipheriv('aes-128-cbc', key.subarray(0, 16), key.subarray(16, 32));
  c.setAutoPadding(false);
  return Buffer.concat([c.update(data), c.final()]).toString('base64');
}

function decrypt(b64, username, machineKey) {
  const key = deriveKey(username, machineKey);
  const data = Buffer.from(b64, 'base64');
  if (!data.length || data.length % BLOCK) return null;
  const d = crypto.createDecipheriv('aes-128-cbc', key.subarray(0, 16), key.subarray(16, 32));
  d.setAutoPadding(false);
  const out = Buffer.concat([d.update(data), d.final()]);
  const end = out.indexOf(0);
  return out.subarray(0, end < 0 ? out.length : end).toString('utf8');
}

// MachineGuid do Windows (usado só quando o DuckStation NÃO está em modo portable).
function machineGuid() {
  try {
    const out = execFileSync('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'], { encoding: 'utf8', windowsHide: true });
    const m = out.match(/MachineGuid\s+REG_SZ\s+(\S+)/);
    return m ? m[1] : '';
  } catch {
    return '';
  }
}

module.exports = { encrypt, decrypt, machineGuid };
