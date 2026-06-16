export interface ImageSizes {
  thumbnail: { width: number; height: number; blob: Blob };
  medium: { width: number; height: number; blob: Blob };
  original: { width: number; height: number; blob: Blob };
}

export interface SplitImageResult {
  left: ImageSizes;
  right: ImageSizes;
}

const THUMBNAIL_MAX = 300;
const MEDIUM_MAX = 1200;

function resizeImage(
  image: HTMLImageElement,
  maxDimension: number
): { width: number; height: number } {
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  return { width, height };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      type,
      quality
    );
  });
}

export async function processImage(
  file: File,
  onProgress?: (stage: string, progress: number) => void
): Promise<ImageSizes> {
  onProgress?.('loading', 0);

  const image = await loadImage(file);
  onProgress?.('loading', 100);

  onProgress?.('thumbnail', 0);
  const thumbnail = await createResizedImage(image, THUMBNAIL_MAX, file.type, 0.7);
  onProgress?.('thumbnail', 100);

  onProgress?.('medium', 0);
  const medium = await createResizedImage(image, MEDIUM_MAX, file.type, 0.85);
  onProgress?.('medium', 100);

  onProgress?.('original', 0);
  const original = await createResizedImage(image, Math.max(image.naturalWidth, image.naturalHeight), file.type, 0.92);
  onProgress?.('original', 100);

  return { thumbnail, medium, original };
}

export async function splitSpreadImage(
  image: HTMLImageElement,
  onProgress?: (stage: string, progress: number) => void
): Promise<{ left: ImageSizes; right: ImageSizes }> {
  onProgress?.('splitting', 0);

  const srcW = image.naturalWidth;
  const srcH = image.naturalHeight;
  const halfW = Math.floor(srcW / 2);

  const THUMBNAIL_MAX = 300;
  const MEDIUM_MAX = 1200;

  const leftSizes = await createHalfImage(image, 0, halfW, srcH, THUMBNAIL_MAX, MEDIUM_MAX);
  onProgress?.('splitting', 50);

  const rightSizes = await createHalfImage(image, halfW, halfW, srcH, THUMBNAIL_MAX, MEDIUM_MAX);
  onProgress?.('splitting', 100);

  return { left: leftSizes, right: rightSizes };
}

async function createHalfImage(
  image: HTMLImageElement,
  cropX: number,
  cropW: number,
  srcH: number,
  thumbnailMax: number,
  mediumMax: number,
  type: string = 'image/jpeg',
): Promise<ImageSizes> {
  const origW = cropW;
  const origH = srcH;

  const tRatio = Math.min(thumbnailMax / origW, thumbnailMax / origH);
  const tW = Math.round(origW * tRatio);
  const tH = Math.round(origH * tRatio);

  const mRatio = Math.min(mediumMax / origW, mediumMax / origH);
  const mW = Math.round(origW * mRatio);
  const mH = Math.round(origH * mRatio);

  const canvas = document.createElement('canvas');
  canvas.width = origW;
  canvas.height = origH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, cropX, 0, cropW, srcH, 0, 0, origW, origH);

  const thumbnailCanvas = document.createElement('canvas');
  thumbnailCanvas.width = tW;
  thumbnailCanvas.height = tH;
  const thumbnailCtx = thumbnailCanvas.getContext('2d');
  if (!thumbnailCtx) throw new Error('Failed to get thumbnail canvas context');
  thumbnailCtx.imageSmoothingEnabled = true;
  thumbnailCtx.imageSmoothingQuality = 'high';
  thumbnailCtx.drawImage(thumbnailCanvas, 0, 0, tW, tH, 0, 0, tW, tH);

  const mediumCanvas = document.createElement('canvas');
  mediumCanvas.width = mW;
  mediumCanvas.height = mH;
  const mediumCtx = mediumCanvas.getContext('2d');
  if (!mediumCtx) throw new Error('Failed to get medium canvas context');
  mediumCtx.imageSmoothingEnabled = true;
  mediumCtx.imageSmoothingQuality = 'high';
  mediumCtx.drawImage(mediumCanvas, 0, 0, mW, mH, 0, 0, mW, mH);

  const originalCanvas = document.createElement('canvas');
  originalCanvas.width = origW;
  originalCanvas.height = origH;
  const originalCtx = originalCanvas.getContext('2d');
  if (!originalCtx) throw new Error('Failed to get original canvas context');
  originalCtx.imageSmoothingEnabled = true;
  originalCtx.imageSmoothingQuality = 'high';
  originalCtx.drawImage(originalCanvas, 0, 0, origW, origH, 0, 0, origW, origH);

  const [thumbnailBlob, mediumBlob, originalBlob] = await Promise.all([
    canvasToBlob(thumbnailCanvas, type, 0.7),
    canvasToBlob(mediumCanvas, type, 0.85),
    canvasToBlob(originalCanvas, type, 0.92)
  ]);

  return {
    thumbnail: { width: tW, height: tH, blob: thumbnailBlob },
    medium: { width: mW, height: mH, blob: mediumBlob },
    original: { width: origW, height: origH, blob: originalBlob },
  };
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

async function createResizedImage(
  image: HTMLImageElement,
  maxDimension: number,
  type: string,
  quality: number
): Promise<{ width: number; height: number; blob: Blob }> {
  const { width, height } = resizeImage(image, maxDimension);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, type, quality);

  return { width, height, blob };
}

export function isSpreadImage(width: number, height: number, ratioThreshold = 1.3): boolean {
  return width > height * ratioThreshold;
}

function makeHalfVariant(
  image: HTMLImageElement,
  cropX: number,
  cropW: number,
  srcH: number,
  targetW: number,
  targetH: number,
): { width: number; height: number; blob: Blob } {
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, cropX, 0, cropW, srcH, 0, 0, targetW, targetH);
  return { width: targetW, height: targetH, blob: canvas as unknown as Blob };
}

export function splitImageIntoHalves(
  image: HTMLImageElement,
): { left: ImageSizes; right: ImageSizes } {
  const srcW = image.naturalWidth;
  const srcH = image.naturalHeight;
  const halfW = Math.floor(srcW / 2);

  const THUMBNAIL_MAX = 300;
  const MEDIUM_MAX = 1200;

  function halfSizes(cropX: number): ImageSizes {
    const origW = halfW;
    const origH = srcH;

    const tRatio = Math.min(THUMBNAIL_MAX / origW, THUMBNAIL_MAX / origH);
    const tW = Math.round(origW * tRatio);
    const tH = Math.round(origH * tRatio);

    const mRatio = Math.min(MEDIUM_MAX / origW, MEDIUM_MAX / origH);
    const mW = Math.round(origW * mRatio);
    const mH = Math.round(origH * mRatio);

    return {
      original: makeHalfVariant(image, cropX, halfW, srcH, origW, origH),
      thumbnail: makeHalfVariant(image, cropX, halfW, srcH, tW, tH),
      medium: makeHalfVariant(image, cropX, halfW, srcH, mW, mH),
    };
  }

  return {
    left: halfSizes(0),
    right: halfSizes(halfW),
  };
}
