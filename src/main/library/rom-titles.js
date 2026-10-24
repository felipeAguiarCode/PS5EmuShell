import crypto from 'node:crypto';
import { GAME_ID_LENGTH, INVALID_FILENAME_CHARACTERS } from '../constants/library.js';

const BRACKETED_TAGS = /\s*[([][^)\]]*[)\]]/g;
const TRAILING_ARTICLE = /^(.*?), (The|A|An)(\s*[-:].*)?$/i;
const DISC_NUMBER = /\((?:Disc|Disco|CD)\s*(\d+)/i;
const REGION_TAG = /\((USA|Europe|Japan|Brazil|World|Korea|Asia|[A-Z][a-z]+(?:, [A-Z][a-z]+)+)\)/;

export const formatGameTitle = (baseName) => {
  const cleaned = baseName
    .replace(BRACKETED_TAGS, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const articleMatch = cleaned.match(TRAILING_ARTICLE);
  const withArticle = articleMatch
    ? `${articleMatch[2]} ${articleMatch[1]}${articleMatch[3] || ''}`
    : cleaned;
  const discMatch = baseName.match(DISC_NUMBER);
  const title = discMatch ? `${withArticle} (Disco ${discMatch[1]})` : withArticle;
  return title || baseName;
};

export const findRegion = (baseName) => baseName.match(REGION_TAG)?.[1] ?? '';

export const removeInvalidFilenameCharacters = (name) =>
  name.replace(INVALID_FILENAME_CHARACTERS, '');

export const replaceInvalidFilenameCharacters = (name) =>
  name.replace(INVALID_FILENAME_CHARACTERS, '_');

export const calculateGameId = (seed) =>
  crypto.createHash('sha1').update(seed).digest('hex').slice(0, GAME_ID_LENGTH);
