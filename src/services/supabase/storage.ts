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

function getVariantDir(variant: UploadVariant): string {
  switch (variant) {
    case 'original': return APP_CONFIG.storage.originals;
    case 'medium': return APP_CONFIG.storage.medium;
    case 'thumbnail': return APP_CONFIG.storage.thumbnails;
  }
}

function getStoragePath(
  albumId: string,
  versionNumber: number,
  variant: UploadVariant,
  fileName: string
): string {
  const uniqueId = crypto.randomUUID();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const variantDir = getVariantDir(variant);
  return `${APP_CONFIG.storage.albums}/${albumId}/v${versionNumber}/${variantDir}/${uniqueId}_${safeFileName}`;
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

async function uploadWithRetry(
  bucket: string,
  path: string,
  body: Blob | File,
  options: { cacheControl?: string; upsert?: boolean; contentType?: string },
  retries = 3,
): Promise<{ data: { path: string }; error: null } | { data: null; error: Error }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const usedPath = attempt > 1 ? regenerateUniquePath(path) : path;
    const result = await supabase.storage
      .from(bucket)
      .upload(usedPath, body, options);

    if (result.error) {
      const msg = result.error.message?.toLowerCase() ?? '';
      if (msg.includes('already exists') && attempt < retries) {
        continue;
      }
      return { data: null, error: result.error };
    }

    return { data: { path: usedPath }, error: null };
  }

  return { data: null, error: new Error('Upload failed after retries') };
}

function regenerateUniquePath(existingPath: string): string {
  const lastSlash = existingPath.lastIndexOf('/');
  const dir = existingPath.slice(0, lastSlash + 1);
  const oldName = existingPath.slice(lastSlash + 1);
  const underscoreIdx = oldName.indexOf('_');
  const rest = underscoreIdx >= 0 ? oldName.slice(underscoreIdx) : oldName;
  return `${dir}${crypto.randomUUID()}${rest}`;
}

export async function uploadImage(
  albumId: string,
  versionNumber: number,
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  validateFile(file);

  const filePath = getStoragePath(albumId, versionNumber, 'original', file.name);

  const result = await uploadWithRetry(BUCKET_NAME, filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (result.error) {
    throw new StorageError(`Upload failed: ${result.error.message}`, result.error);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(result.data.path);

  if (onProgress) onProgress(100);

  return {
    url: urlData.publicUrl,
    path: result.data.path,
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

  const result = await uploadWithRetry(BUCKET_NAME, filePath, blob, {
    cacheControl: '3600',
    upsert: false,
    contentType: blob.type || 'image/jpeg',
  });

  if (result.error) {
    throw new StorageError(`Upload failed (${variant}): ${result.error.message}`, result.error);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(result.data.path);

  if (onProgress) onProgress(100);

  return {
    url: urlData.publicUrl,
    path: result.data.path,
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

export async function uploadStudioLogo(
  file: File
): Promise<UploadResult> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new StorageError('Not authenticated');

  const filePath = `logos/${userData.user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    });

  if (error) throw new StorageError(`Logo upload failed: ${error.message}`, error);

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return { url: urlData.publicUrl, path: data.path };
}

export async function uploadVoiceNote(
  albumId: string,
  blob: Blob,
  fileName: string = `voice_${Date.now()}.webm`
): Promise<UploadResult> {
  const filePath = `voice-notes/${albumId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: blob.type || 'audio/webm',
    });

  if (error) {
    throw new StorageError(`Voice upload failed: ${error.message}`, error);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

export async function deleteVoiceNote(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    throw new StorageError(`Voice delete failed: ${error.message}`, error);
  }
}
