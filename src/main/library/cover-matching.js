import {
  COVER_KINDS,
  COVER_MATCH_LENGTH_TOLERANCE,
  COVER_MATCH_MIN_SCORE,
  COVER_REGION_PREFERENCE,
} from '../constants/library.js';
import { replaceInvalidFilenameCharacters } from './rom-titles.js';

export const normalizeCoverName = (name) =>
  name
    .toLowerCase()
    .replace(/\s*[([][^)\]]*[)\]]/g, '')
    .replace(/,\s*(the|a|an)\b/g, '')
    .replace(/^(the|a|an)\s+/, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');

export const countBigrams = (text) => {
  const bigrams = new Map();
  for (let index = 0; index < text.length - 1; index += 1) {
    const bigram = text.slice(index, index + 2);
    bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
  }
  return bigrams;
};

export const calculateDiceSimilarity = (firstText, firstBigrams, secondText, secondBigrams) => {
  if (firstText === secondText) return 1;
  if (firstText.length < 2 || secondText.length < 2) return 0;
  let sharedCount = 0;
  for (const [bigram, count] of firstBigrams) {
    sharedCount += Math.min(count, secondBigrams.get(bigram) || 0);
  }
  return (2 * sharedCount) / (firstText.length - 1 + secondText.length - 1);
};

export const pickNameByRegion = (names, region) => {
  const sameRegion = region && names.find((name) => name.includes(`(${region}`));
  if (sameRegion) return sameRegion;
  for (const preferredRegion of COVER_REGION_PREFERENCE) {
    const preferred = names.find((name) => name.includes(preferredRegion));
    if (preferred) return preferred;
  }
  return names[0];
};

const buildKindIndex = (names) => {
  const namesByKey = new Map();
  for (const name of names) {
    const key = normalizeCoverName(name);
    namesByKey.set(key, [...(namesByKey.get(key) ?? []), name]);
  }
  return {
    exactNames: new Set(names),
    namesByKey,
    keys: [...namesByKey.keys()].map((key) => ({ key, bigrams: countBigrams(key) })),
  };
};

export const buildCoverIndex = (rawIndex) =>
  Object.fromEntries(
    Object.keys(COVER_KINDS).map((kind) => [kind, buildKindIndex(rawIndex[kind] ?? [])]),
  );

const findClosestKey = (kindIndex, key) => {
  const keyBigrams = countBigrams(key);
  let bestKey = null;
  let bestScore = COVER_MATCH_MIN_SCORE;
  for (const candidate of kindIndex.keys) {
    if (Math.abs(candidate.key.length - key.length) > key.length * COVER_MATCH_LENGTH_TOLERANCE) {
      continue;
    }
    const score = calculateDiceSimilarity(key, keyBigrams, candidate.key, candidate.bigrams);
    if (score > bestScore) {
      bestScore = score;
      bestKey = candidate.key;
    }
  }
  return bestKey;
};

export const findCoverName = (kindIndex, { base, region }) => {
  const sanitizedName = replaceInvalidFilenameCharacters(base);
  if (kindIndex.exactNames.has(sanitizedName)) return sanitizedName;
  const key = normalizeCoverName(base);
  if (!key) return null;
  const exactKeyNames = kindIndex.namesByKey.get(key);
  if (exactKeyNames) return pickNameByRegion(exactKeyNames, region);
  const closestKey = findClosestKey(kindIndex, key);
  return closestKey ? pickNameByRegion(kindIndex.namesByKey.get(closestKey), region) : null;
};
