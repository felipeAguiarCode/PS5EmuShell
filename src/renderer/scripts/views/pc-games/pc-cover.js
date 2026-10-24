import { invokeMain } from '../../core/api.js';

const COVER_SIZE = 600;
const BLUR_OVERFLOW = 160;
const LARGE_ICON_MIN_WIDTH = 128;
const LARGE_ICON_SIZE = 300;
const SMALL_ICON_SIZE = 200;
const BACKGROUND_COLOR = '#10131c';
const SHADE_COLOR = 'rgba(6, 8, 14, 0.42)';

const loadImage = async (url) => {
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
    return image;
  } catch {
    return null;
  }
};

const drawBlurredBackground = (context, image) => {
  context.fillStyle = BACKGROUND_COLOR;
  context.fillRect(0, 0, COVER_SIZE, COVER_SIZE);
  context.filter = 'blur(46px) saturate(1.5)';
  context.drawImage(
    image,
    -BLUR_OVERFLOW,
    -BLUR_OVERFLOW,
    COVER_SIZE + BLUR_OVERFLOW * 2,
    COVER_SIZE + BLUR_OVERFLOW * 2,
  );
  context.filter = 'none';
  context.fillStyle = SHADE_COLOR;
  context.fillRect(0, 0, COVER_SIZE, COVER_SIZE);
};

const drawVignette = (context) => {
  const vignette = context.createRadialGradient(
    COVER_SIZE / 2,
    COVER_SIZE * 0.45,
    COVER_SIZE * 0.1,
    COVER_SIZE / 2,
    COVER_SIZE / 2,
    COVER_SIZE * 0.78,
  );
  vignette.addColorStop(0, 'rgba(255,255,255,0.10)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, COVER_SIZE, COVER_SIZE);
};

const drawCenteredIcon = (context, image) => {
  const iconSize = image.naturalWidth >= LARGE_ICON_MIN_WIDTH ? LARGE_ICON_SIZE : SMALL_ICON_SIZE;
  context.shadowColor = 'rgba(0,0,0,0.55)';
  context.shadowBlur = 42;
  context.shadowOffsetY = 16;
  const offset = (COVER_SIZE - iconSize) / 2;
  context.drawImage(image, offset, offset, iconSize, iconSize);
};

export const createPcCover = async (gameId) => {
  const iconUrl = await invokeMain('pcgames:icon', gameId);
  if (!iconUrl) return false;
  const image = await loadImage(iconUrl);
  if (!image) return false;
  const canvas = document.createElement('canvas');
  canvas.width = COVER_SIZE;
  canvas.height = COVER_SIZE;
  const context = canvas.getContext('2d');
  context.imageSmoothingQuality = 'high';
  drawBlurredBackground(context, image);
  drawVignette(context);
  drawCenteredIcon(context, image);
  await invokeMain('pcgames:saveCover', gameId, canvas.toDataURL('image/png'));
  return true;
};
