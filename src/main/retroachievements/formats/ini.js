import fs from 'node:fs';
import path from 'node:path';

const WINDOWS_LINE_ENDING = '\r\n';
const BYTE_ORDER_MARK = /^\uFEFF/;
const SECTION_HEADER = /^\s*\[[^\]]+\]\s*$/;
const KEY_PATTERN = /^\s*([^=;#[]+?)\s*=/;

export const parseIniText = (text) => {
  const content = text.replace(BYTE_ORDER_MARK, '');
  return {
    lines: content.split(/\r?\n/),
    lineEnding: content.includes(WINDOWS_LINE_ENDING) ? WINDOWS_LINE_ENDING : '\n',
  };
};

const isSectionHeader = (line) => SECTION_HEADER.test(line);
const readSectionName = (line) => line.trim().slice(1, -1).trim();
const readLineKey = (line) => line.match(KEY_PATTERN)?.[1] ?? null;
const isSameName = (first, second) => (first || '').toLowerCase() === second.toLowerCase();

const findSectionRange = (lines, section) => {
  const start = lines.findIndex(
    (line) => isSectionHeader(line) && isSameName(readSectionName(line), section),
  );
  if (start < 0) return null;
  let end = start + 1;
  while (end < lines.length && !isSectionHeader(lines[end])) end += 1;
  return { start, end };
};

const withSectionHeader = (lines, section) => {
  const trimmedLines = [...lines];
  while (trimmedLines.length && trimmedLines[trimmedLines.length - 1].trim() === '')
    trimmedLines.pop();
  const linesWithHeader = trimmedLines.length
    ? [...trimmedLines, '', `[${section}]`]
    : [`[${section}]`];
  return {
    lines: linesWithHeader,
    range: { start: linesWithHeader.length - 1, end: linesWithHeader.length },
  };
};

const findInsertIndex = (lines, range) => {
  let insertIndex = range.end;
  while (insertIndex - 1 > range.start && lines[insertIndex - 1].trim() === '') insertIndex -= 1;
  return insertIndex;
};

export const withIniValues = (sourceLines, section, values) => {
  const existingRange = findSectionRange(sourceLines, section);
  const initial = existingRange
    ? { lines: [...sourceLines], range: { ...existingRange } }
    : withSectionHeader(sourceLines, section);
  const { lines, range } = initial;
  for (const [key, value] of Object.entries(values)) {
    const keyIndex = lines.findIndex(
      (line, index) =>
        index > range.start && index < range.end && isSameName(readLineKey(line), key),
    );
    if (value === null || value === undefined) {
      if (keyIndex >= 0) {
        lines.splice(keyIndex, 1);
        range.end -= 1;
      }
      continue;
    }
    const entry = `${key} = ${value}`;
    if (keyIndex >= 0) {
      lines[keyIndex] = entry;
      continue;
    }
    lines.splice(findInsertIndex(lines, range), 0, entry);
    range.end += 1;
  }
  return lines;
};

export const findIniValue = (lines, section, key) => {
  const range = findSectionRange(lines, section);
  if (!range) return null;
  for (let index = range.start + 1; index < range.end; index += 1) {
    if (isSameName(readLineKey(lines[index]), key)) {
      return lines[index].slice(lines[index].indexOf('=') + 1).trim();
    }
  }
  return null;
};

export const serializeIniLines = (lines, lineEnding) => {
  const text = lines.join(lineEnding);
  return text.endsWith(lineEnding) ? text : text + lineEnding;
};

const readIniFile = (file) => {
  try {
    return parseIniText(fs.readFileSync(file, 'utf8'));
  } catch {
    return { lines: [], lineEnding: WINDOWS_LINE_ENDING };
  }
};

export const saveIniValues = (file, section, values) => {
  const { lines, lineEnding } = readIniFile(file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, serializeIniLines(withIniValues(lines, section, values), lineEnding));
};

export const readIniValue = (file, section, key) =>
  findIniValue(readIniFile(file).lines, section, key);
