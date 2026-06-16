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

async function makeHalfVariant(
  image: HTMLImageElement,
  cropX: number,
  cropW: number,
  srcH: number,
  targetW: number,
  targetH: number,
  type: string = 'image/jpeg',
  quality: number = 0.92,
): Promise<{ width: number; height: number; blob: Blob }> {
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, cropX, 0, cropW, srcH, 0, 0, targetW, targetH);
  const blob = await canvasToBlob(canvas, type, quality);
  return { width: targetW, height: targetH, blob };
}

export async function splitImageIntoHalves(
  image: HTMLImageElement,
  type: string = 'image/jpeg',
): Promise<{ left: ImageSizes; right: ImageSizes }> {
  const srcW = image.naturalWidth;
  const srcH = image.naturalHeight;
  const halfW = Math.floor(srcW / 2);

  const THUMBNAIL_MAX = 300;
  const MEDIUM_MAX = 1200;

  async function halfSizes(cropX: number): Promise<ImageSizes> {
    const origW = halfW;
    const origH = srcH;

    const tRatio = Math.min(THUMBNAIL_MAX / origW, THUMBNAIL_MAX / origH);
    const tW = Math.round(origW * tRatio);
    const tH = Math.round(origH * tRatio);

    const mRatio = Math.min(MEDIUM_MAX / origW, MEDIUM_MAX / origH);
    const mW = Math.round(origW * mRatio);
    const mH = Math.round(origH * mRatio);

    const [original, thumbnail, medium] = await Promise.all([
      makeHalfVariant(image, cropX, halfW, srcH, origW, origH, type, 0.92),
      makeHalfVariant(image, cropX, halfW, srcH, tW, tH, type, 0.7),
      makeHalfVariant(image, cropX, halfW, srcH, mW, mH, type, 0.85),
    ]);

    return { original, thumbnail, medium };
  }

  const [left, right] = await Promise.all([
    halfSizes(0),
    halfSizes(halfW),
  ]);

  return { left, right };
}
