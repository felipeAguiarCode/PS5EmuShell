// Editor de INI que preserva o resto do arquivo: altera/remove só as chaves pedidas
// e cria a seção (ou o arquivo) quando não existem.
const fs = require('fs');
const path = require('path');

function readLines(file) {
  try {
    const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
    return { lines: text.split(/\r?\n/), eol: text.includes('\r\n') ? '\r\n' : '\n' };
  } catch {
    return { lines: [], eol: '\r\n' };
  }
}

const isHeader = (l) => /^\s*\[[^\]]+\]\s*$/.test(l);
const headerName = (l) => l.trim().slice(1, -1).trim();
const keyOf = (l) => {
  const m = l.match(/^\s*([^=;#\[]+?)\s*=/);
  return m ? m[1] : null;
};

function findSection(lines, section) {
  const start = lines.findIndex((l) => isHeader(l) && headerName(l).toLowerCase() === section.toLowerCase());
  if (start < 0) return null;
  let end = start + 1;
  while (end < lines.length && !isHeader(lines[end])) end++;
  return { start, end };
}

// values: { chave: valor } — valor null/undefined remove a chave.
function set(file, section, values) {
  const { lines, eol } = readLines(file);
  let sec = findSection(lines, section);
  if (!sec) {
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
    if (lines.length) lines.push('');
    lines.push(`[${section}]`);
    sec = { start: lines.length - 1, end: lines.length };
  }
  for (const [key, value] of Object.entries(values)) {
    const idx = lines.findIndex((l, i) => i > sec.start && i < sec.end && (keyOf(l) || '').toLowerCase() === key.toLowerCase());
    if (value === null || value === undefined) {
      if (idx >= 0) {
        lines.splice(idx, 1);
        sec.end--;
      }
      continue;
    }
    const line = `${key} = ${value}`;
    if (idx >= 0) {
      lines[idx] = line;
    } else {
      // Insere antes das linhas em branco no fim da seção.
      let at = sec.end;
      while (at - 1 > sec.start && lines[at - 1].trim() === '') at--;
      lines.splice(at, 0, line);
      sec.end++;
    }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let out = lines.join(eol);
  if (!out.endsWith(eol)) out += eol;
  fs.writeFileSync(file, out);
}

function get(file, section, key) {
  const { lines } = readLines(file);
  const sec = findSection(lines, section);
  if (!sec) return null;
  for (let i = sec.start + 1; i < sec.end; i++) {
    if ((keyOf(lines[i]) || '').toLowerCase() === key.toLowerCase()) return lines[i].slice(lines[i].indexOf('=') + 1).trim();
  }
  return null;
}

module.exports = { set, get };
