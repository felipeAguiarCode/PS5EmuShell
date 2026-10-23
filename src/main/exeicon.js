// Extrai o maior ícone de um .exe lendo os recursos do arquivo PE (RT_GROUP_ICON + RT_ICON).
// Grava PNG quando o recurso já é PNG (ícones de 256 px costumam ser) ou monta um .ico de uma entrada.
const fs = require('fs');
const path = require('path');

const RT_ICON = 3;
const RT_GROUP_ICON = 14;

function readPE(buf) {
  if (buf.readUInt16LE(0) !== 0x5a4d) throw new Error('não é um executável');
  const pe = buf.readUInt32LE(0x3c);
  if (buf.readUInt32LE(pe) !== 0x4550) throw new Error('cabeçalho PE inválido');
  const coff = pe + 4;
  const nSections = buf.readUInt16LE(coff + 2);
  const optSize = buf.readUInt16LE(coff + 16);
  const opt = coff + 20;
  const magic = buf.readUInt16LE(opt);
  const dirs = opt + (magic === 0x20b ? 112 : 96);
  const resRva = buf.readUInt32LE(dirs + 2 * 8);
  if (!resRva) return null;
  const sections = [];
  for (let i = 0, s = opt + optSize; i < nSections; i++, s += 40) {
    sections.push({ va: buf.readUInt32LE(s + 12), vsize: buf.readUInt32LE(s + 8), raw: buf.readUInt32LE(s + 20), rawSize: buf.readUInt32LE(s + 16) });
  }
  const toOffset = (rva) => {
    const sec = sections.find((x) => rva >= x.va && rva < x.va + Math.max(x.vsize, x.rawSize));
    if (!sec) throw new Error('RVA fora das seções');
    return rva - sec.va + sec.raw;
  };
  return { base: toOffset(resRva), toOffset };
}

// Entradas de um diretório de recursos: [{ id, offset, isDir }].
function entries(buf, base, dirOff) {
  const named = buf.readUInt16LE(dirOff + 12);
  const ids = buf.readUInt16LE(dirOff + 14);
  const out = [];
  for (let i = 0; i < named + ids; i++) {
    const e = dirOff + 16 + i * 8;
    const name = buf.readUInt32LE(e);
    const off = buf.readUInt32LE(e + 4);
    out.push({ id: name & 0x80000000 ? null : name, offset: base + (off & 0x7fffffff), isDir: !!(off & 0x80000000) });
  }
  return out;
}

// Dados do primeiro idioma de um recurso (tipo → nome → idioma).
function resourceData(buf, pe, nameEntry) {
  let e = nameEntry;
  while (e.isDir) e = entries(buf, pe.base, e.offset)[0];
  if (!e) return null;
  const rva = buf.readUInt32LE(e.offset);
  const size = buf.readUInt32LE(e.offset + 4);
  const off = pe.toOffset(rva);
  return buf.subarray(off, off + size);
}

function extract(exe) {
  const buf = fs.readFileSync(exe);
  const pe = readPE(buf);
  if (!pe) return null;
  const types = entries(buf, pe.base, pe.base);
  const groupType = types.find((t) => t.id === RT_GROUP_ICON);
  const iconType = types.find((t) => t.id === RT_ICON);
  if (!groupType || !iconType) return null;
  const groups = entries(buf, pe.base, groupType.offset);
  const icons = entries(buf, pe.base, iconType.offset);
  // O primeiro grupo é o ícone principal que o Explorer mostra.
  const grp = resourceData(buf, pe, groups[0]);
  if (!grp) return null;
  const count = grp.readUInt16LE(4);
  let best = null;
  for (let i = 0; i < count; i++) {
    const o = 6 + i * 14;
    const w = grp[o] || 256;
    const bits = grp.readUInt16LE(o + 6);
    const id = grp.readUInt16LE(o + 12);
    const score = w * 100 + bits;
    if (!best || score > best.score) best = { w, h: grp[o + 1] || 256, colors: grp[o + 2], planes: grp.readUInt16LE(o + 4), bits, id, score };
  }
  const entry = best && icons.find((x) => x.id === best.id);
  const data = entry && resourceData(buf, pe, entry);
  if (!data) return null;
  if (data.readUInt32BE(0) === 0x89504e47) return { ext: '.png', data: Buffer.from(data), size: best.w };
  // Bitmap DIB: embrulha num .ico com uma única entrada.
  const head = Buffer.alloc(22);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(1, 4);
  head[6] = best.w >= 256 ? 0 : best.w;
  head[7] = best.h >= 256 ? 0 : best.h;
  head[8] = best.colors;
  head.writeUInt16LE(best.planes || 1, 10);
  head.writeUInt16LE(best.bits, 12);
  head.writeUInt32LE(data.length, 14);
  head.writeUInt32LE(22, 18);
  return { ext: '.ico', data: Buffer.concat([head, data]), size: best.w };
}

// Salva o ícone em <dir>/<id>.(png|ico). Usa o ícone do Windows (32 px) se o exe não tiver um.
async function save(exe, dir, id, getFileIcon) {
  fs.mkdirSync(dir, { recursive: true });
  for (const ext of ['.png', '.ico']) fs.rmSync(path.join(dir, id + ext), { force: true });
  let icon = null;
  try {
    icon = extract(exe);
  } catch {}
  if (!icon && getFileIcon) {
    const img = await getFileIcon(exe, { size: 'large' });
    if (img && !img.isEmpty()) icon = { ext: '.png', data: img.toPNG(), size: img.getSize().width };
  }
  if (!icon) return null;
  const file = path.join(dir, id + icon.ext);
  fs.writeFileSync(file, icon.data);
  return { file, size: icon.size };
}

module.exports = { extract, save };
