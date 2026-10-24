import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { HTTP_HEADERS, RETROACHIEVEMENTS_MEDIA_URL } from '../../constants/network.js';
import { RA_IMAGE_CONCURRENCY, RA_IMAGE_DIR_PARTS } from '../../constants/retroachievements.js';
import { resolveDataPath } from '../../core/app-paths.js';

const UNSAFE_PATH_CHARACTERS = /[\\/:*?"<>|]+/g;
const pendingImages = new Map();
const downloadQueue = [];
let activeDownloads = 0;

export const buildImageCacheName = (relativePath) =>
  relativePath.replace(/^\/+/, '').replace(UNSAFE_PATH_CHARACTERS, '_');

const resolveImageFile = (relativePath) =>
  path.join(resolveDataPath(...RA_IMAGE_DIR_PARTS), buildImageCacheName(relativePath));

const processDownloadQueue = () => {
  while (activeDownloads < RA_IMAGE_CONCURRENCY && downloadQueue.length) {
    const downloadJob = downloadQueue.shift();
    activeDownloads += 1;
    downloadJob().finally(() => {
      activeDownloads -= 1;
      processDownloadQueue();
    });
  }
};

const downloadImage = async (relativePath, imageFile) => {
  const mediaPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  const response = await fetch(RETROACHIEVEMENTS_MEDIA_URL + mediaPath, { headers: HTTP_HEADERS });
  if (!response.ok) return null;
  fs.mkdirSync(path.dirname(imageFile), { recursive: true });
  fs.writeFileSync(imageFile, Buffer.from(await response.arrayBuffer()));
  return pathToFileURL(imageFile).href;
};

export const fetchRaImageUrl = (relativePath) => {
  if (!relativePath) return Promise.resolve(null);
  const imageFile = resolveImageFile(relativePath);
  if (fs.existsSync(imageFile)) return Promise.resolve(pathToFileURL(imageFile).href);
  if (pendingImages.has(imageFile)) return pendingImages.get(imageFile);
  const pendingImage = new Promise((resolve) => {
    downloadQueue.push(async () => {
      try {
        resolve(await downloadImage(relativePath, imageFile));
      } catch {
        resolve(null);
      } finally {
        pendingImages.delete(imageFile);
      }
    });
    processDownloadQueue();
  });
  pendingImages.set(imageFile, pendingImage);
  return pendingImage;
};

export const fetchRaImageUrls = async (relativePaths) => {
  const entries = await Promise.all(
    (relativePaths ?? []).map(async (relativePath) => [
      relativePath,
      await fetchRaImageUrl(relativePath),
    ]),
  );
  return Object.fromEntries(entries);
};
