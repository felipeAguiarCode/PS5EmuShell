import fs from 'node:fs';
import path from 'node:path';

const DOS_SIGNATURE = 0x5a4d;
const PE_SIGNATURE = 0x4550;
const PE32_PLUS_MAGIC = 0x20b;
const RESOURCE_DIRECTORY_INDEX = 2;
const RT_ICON = 3;
const RT_GROUP_ICON = 14;
const HIGH_BIT = 0x80000000;
const PNG_SIGNATURE = 0x89504e47;
const LARGEST_ICON_SIZE = 256;
const ICON_DIRECTORY_BYTES = 22;
const GROUP_ENTRY_BYTES = 14;
const GROUP_HEADER_BYTES = 6;

const readPortableExecutable = (buffer) => {
  if (buffer.readUInt16LE(0) !== DOS_SIGNATURE) throw new Error('Not an executable');
  const peOffset = buffer.readUInt32LE(0x3c);
  if (buffer.readUInt32LE(peOffset) !== PE_SIGNATURE) throw new Error('Invalid PE header');
  const coffOffset = peOffset + 4;
  const sectionCount = buffer.readUInt16LE(coffOffset + 2);
  const optionalHeaderSize = buffer.readUInt16LE(coffOffset + 16);
  const optionalHeaderOffset = coffOffset + 20;
  const isPe32Plus = buffer.readUInt16LE(optionalHeaderOffset) === PE32_PLUS_MAGIC;
  const dataDirectoriesOffset = optionalHeaderOffset + (isPe32Plus ? 112 : 96);
  const resourceRva = buffer.readUInt32LE(dataDirectoriesOffset + RESOURCE_DIRECTORY_INDEX * 8);
  if (!resourceRva) return null;
  const sections = Array.from({ length: sectionCount }, (_, index) => {
    const sectionOffset = optionalHeaderOffset + optionalHeaderSize + index * 40;
    return {
      virtualAddress: buffer.readUInt32LE(sectionOffset + 12),
      virtualSize: buffer.readUInt32LE(sectionOffset + 8),
      rawOffset: buffer.readUInt32LE(sectionOffset + 20),
      rawSize: buffer.readUInt32LE(sectionOffset + 16),
    };
  });
  const toFileOffset = (rva) => {
    const section = sections.find(
      (candidate) =>
        rva >= candidate.virtualAddress &&
        rva < candidate.virtualAddress + Math.max(candidate.virtualSize, candidate.rawSize),
    );
    if (!section) throw new Error('RVA outside sections');
    return rva - section.virtualAddress + section.rawOffset;
  };
  return { resourceBase: toFileOffset(resourceRva), toFileOffset };
};

const listResourceEntries = (buffer, resourceBase, directoryOffset) => {
  const namedCount = buffer.readUInt16LE(directoryOffset + 12);
  const idCount = buffer.readUInt16LE(directoryOffset + 14);
  return Array.from({ length: namedCount + idCount }, (_, index) => {
    const entryOffset = directoryOffset + 16 + index * 8;
    const name = buffer.readUInt32LE(entryOffset);
    const offset = buffer.readUInt32LE(entryOffset + 4);
    return {
      id: name & HIGH_BIT ? null : name,
      offset: resourceBase + (offset & 0x7fffffff),
      isDirectory: Boolean(offset & HIGH_BIT),
    };
  });
};

const readResourceData = (buffer, executable, entry) => {
  let currentEntry = entry;
  while (currentEntry?.isDirectory) {
    currentEntry = listResourceEntries(buffer, executable.resourceBase, currentEntry.offset)[0];
  }
  if (!currentEntry) return null;
  const dataOffset = executable.toFileOffset(buffer.readUInt32LE(currentEntry.offset));
  return buffer.subarray(dataOffset, dataOffset + buffer.readUInt32LE(currentEntry.offset + 4));
};

const findLargestIconEntry = (groupData) => {
  const entryCount = groupData.readUInt16LE(4);
  let best = null;
  for (let index = 0; index < entryCount; index += 1) {
    const offset = GROUP_HEADER_BYTES + index * GROUP_ENTRY_BYTES;
    const width = groupData[offset] || LARGEST_ICON_SIZE;
    const bitCount = groupData.readUInt16LE(offset + 6);
    const score = width * 100 + bitCount;
    if (!best || score > best.score) {
      best = {
        width,
        height: groupData[offset + 1] || LARGEST_ICON_SIZE,
        colorCount: groupData[offset + 2],
        planes: groupData.readUInt16LE(offset + 4),
        bitCount,
        id: groupData.readUInt16LE(offset + 12),
        score,
      };
    }
  }
  return best;
};

const buildIcoFile = (iconEntry, bitmapData) => {
  const header = Buffer.alloc(ICON_DIRECTORY_BYTES);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = iconEntry.width >= LARGEST_ICON_SIZE ? 0 : iconEntry.width;
  header[7] = iconEntry.height >= LARGEST_ICON_SIZE ? 0 : iconEntry.height;
  header[8] = iconEntry.colorCount;
  header.writeUInt16LE(iconEntry.planes || 1, 10);
  header.writeUInt16LE(iconEntry.bitCount, 12);
  header.writeUInt32LE(bitmapData.length, 14);
  header.writeUInt32LE(ICON_DIRECTORY_BYTES, 18);
  return Buffer.concat([header, bitmapData]);
};

export const extractLargestIcon = (buffer) => {
  const executable = readPortableExecutable(buffer);
  if (!executable) return null;
  const resourceTypes = listResourceEntries(
    buffer,
    executable.resourceBase,
    executable.resourceBase,
  );
  const groupType = resourceTypes.find((entry) => entry.id === RT_GROUP_ICON);
  const iconType = resourceTypes.find((entry) => entry.id === RT_ICON);
  if (!groupType || !iconType) return null;
  const groups = listResourceEntries(buffer, executable.resourceBase, groupType.offset);
  const icons = listResourceEntries(buffer, executable.resourceBase, iconType.offset);
  const groupData = readResourceData(buffer, executable, groups[0]);
  if (!groupData) return null;
  const iconEntry = findLargestIconEntry(groupData);
  const iconResource = iconEntry && icons.find((entry) => entry.id === iconEntry.id);
  const iconData = iconResource && readResourceData(buffer, executable, iconResource);
  if (!iconData) return null;
  if (iconData.readUInt32BE(0) === PNG_SIGNATURE) {
    return { extension: '.png', data: Buffer.from(iconData), size: iconEntry.width };
  }
  return { extension: '.ico', data: buildIcoFile(iconEntry, iconData), size: iconEntry.width };
};

const extractIconFromFile = (exePath) => {
  try {
    return extractLargestIcon(fs.readFileSync(exePath));
  } catch {
    return null;
  }
};

const readSystemFileIcon = async (exePath, readFileIcon) => {
  if (!readFileIcon) return null;
  const image = await readFileIcon(exePath, { size: 'large' });
  if (!image || image.isEmpty()) return null;
  return { extension: '.png', data: image.toPNG(), size: image.getSize().width };
};

export const saveExeIcon = async ({ exePath, iconDir, iconId, readFileIcon }) => {
  fs.mkdirSync(iconDir, { recursive: true });
  for (const extension of ['.png', '.ico']) {
    fs.rmSync(path.join(iconDir, iconId + extension), { force: true });
  }
  const icon = extractIconFromFile(exePath) ?? (await readSystemFileIcon(exePath, readFileIcon));
  if (!icon) return null;
  const file = path.join(iconDir, iconId + icon.extension);
  fs.writeFileSync(file, icon.data);
  return { file, size: icon.size };
};
