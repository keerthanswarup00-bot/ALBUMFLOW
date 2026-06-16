import { supabase } from './client';
import { StorageError } from '@/utils/errors';
import { APP_CONFIG } from '@/constants/config';

const BUCKET_NAME = 'albums';

export type UploadResult = {
  url: string;
  path: string;
};

export interface UploadVariantResult {
  thumbnail: UploadResult;
  medium: UploadResult;
  original: UploadResult;
}

export type UploadVariant = 'original' | 'medium' | 'thumbnail';

function getStoragePath(
  albumId: string,
  versionNumber: number,
  variant: UploadVariant,
  fileName: string
): string {
  const timestamp = Date.now();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const variantDir = variant === 'original' ? APP_CONFIG.storage.originals : APP_CONFIG.storage.thumbnails;
  return `${APP_CONFIG.storage.albums}/${albumId}/v${versionNumber}/${variantDir}/${timestamp}_${safeFileName}`;
}

function validateFile(file: File): void {
  if (!(APP_CONFIG.storage.acceptedImageTypes as readonly string[]).includes(file.type)) {
    throw new StorageError(
      `Invalid file type: ${file.type}. Accepted: ${APP_CONFIG.storage.acceptedImageTypes.join(', ')}`
    );
  }

  if (file.size > APP_CONFIG.storage.maxFileSize) {
    throw new StorageError(
      `File too large. Maximum size: ${APP_CONFIG.storage.maxFileSize / (1024 * 1024)}MB`
    );
  }
}

export async function uploadImage(
  albumId: string,
  versionNumber: number,
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  validateFile(file);

  const filePath = getStoragePath(albumId, versionNumber, 'original', file.name);

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new StorageError(`Upload failed: ${error.message}`, error);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  if (onProgress) onProgress(100);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

export async function uploadImageVariant(
  albumId: string,
  versionNumber: number,
  variant: UploadVariant,
  blob: Blob,
  originalFileName: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  const filePath = getStoragePath(albumId, versionNumber, variant, originalFileName);

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: blob.type || 'image/jpeg',
    });

  if (error) {
    throw new StorageError(`Upload failed (${variant}): ${error.message}`, error);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  if (onProgress) onProgress(100);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

export async function uploadAllVariants(
  albumId: string,
  versionNumber: number,
  variants: {
    thumbnail: Blob;
    medium: Blob;
    original: Blob;
  },
  originalFileName: string,
  onVariantProgress?: (variant: UploadVariant, progress: number) => void
): Promise<UploadVariantResult> {
  const [thumbnail, medium, original] = await Promise.all([
    uploadImageVariant(albumId, versionNumber, 'thumbnail', variants.thumbnail, originalFileName, (p) => onVariantProgress?.('thumbnail', p)),
    uploadImageVariant(albumId, versionNumber, 'medium', variants.medium, originalFileName, (p) => onVariantProgress?.('medium', p)),
    uploadImageVariant(albumId, versionNumber, 'original', variants.original, originalFileName, (p) => onVariantProgress?.('original', p)),
  ]);

  return { thumbnail, medium, original };
}

export async function deleteImage(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    throw new StorageError(`Delete failed: ${error.message}`, error);
  }
}

export async function deleteImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(paths);

  if (error) {
    throw new StorageError(`Delete failed: ${error.message}`, error);
  }
}

export async function getPublicUrl(path: string): Promise<string> {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return data.publicUrl;
}

export function getImageUrl(path: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return data.publicUrl;
}
