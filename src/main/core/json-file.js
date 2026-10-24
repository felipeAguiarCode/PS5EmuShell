import fs from 'node:fs';
import path from 'node:path';

const BYTE_ORDER_MARK = /^\uFEFF/;

export const readJsonFileOrDefault = (file, defaultValue) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(BYTE_ORDER_MARK, ''));
  } catch {
    return defaultValue;
  }
};

export const writeJsonFile = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporaryFile = `${file}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(value, null, 2));
  fs.renameSync(temporaryFile, file);
};
