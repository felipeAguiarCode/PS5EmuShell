import fs from 'node:fs/promises';
import path from 'node:path';
import { PLAYLIST_EXTENSIONS } from '../constants/library.js';

const QUOTED_FILE_ENTRY = /FILE\s+"([^"]+)"/gi;
const UNQUOTED_FILE_ENTRY = /FILE\s+([^"\s]+)\s/gi;

export const parsePlaylistReferences = ({ extension, content, playlistDir }) => {
  if (extension === '.m3u') {
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => path.resolve(playlistDir, line));
  }
  return [...content.matchAll(QUOTED_FILE_ENTRY), ...content.matchAll(UNQUOTED_FILE_ENTRY)].map(
    (match) => path.resolve(playlistDir, match[1]),
  );
};

export const readPlaylistReferences = async (file) => {
  const extension = path.extname(file).toLowerCase();
  if (!PLAYLIST_EXTENSIONS.includes(extension)) return [];
  try {
    const content = await fs.readFile(file, 'utf8');
    return parsePlaylistReferences({ extension, content, playlistDir: path.dirname(file) });
  } catch {
    return [];
  }
};
