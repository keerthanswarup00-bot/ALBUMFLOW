import { processImage, isSpreadImage, splitImageIntoHalves, loadImage } from '@/utils/image';
import { uploadAllVariants, type UploadVariant } from './storage';
import { ensureVersion, updateVersionPageCount } from './versions';
import { createPage, getNextPageNumber, getPagesByVersion } from './pages';
import { StorageError } from '@/utils/errors';

export interface UploadProgress {
  fileName: string;
  stage: 'processing' | 'uploading' | 'saving' | 'done' | 'error';
  variantProgress: Record<UploadVariant, number>;
  overallPercent: number;
  error?: string;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

async function uploadAndCreatePage(
  versionId: string,
  pageNumber: number,
  albumId: string,
  versionNumber: number,
  sizes: { thumbnail: { width: number; height: number; blob: Blob }; medium: { width: number; height: number; blob: Blob }; original: { width: number; height: number; blob: Blob } },
  fileName: string,
  fileSize: number,
  onVariantProgress?: (variant: UploadVariant, progress: number) => void,
) {
  const urls = await uploadAllVariants(
    albumId,
    versionNumber,
    {
      thumbnail: sizes.thumbnail.blob,
      medium: sizes.medium.blob,
      original: sizes.original.blob,
    },
    fileName,
    onVariantProgress,
  );

  const orientation = sizes.original.width > sizes.original.height ? 'landscape' : 'portrait';
  const spreadNumber = Math.ceil(pageNumber / 2);

  await createPage({
    album_version_id: versionId,
    page_number: pageNumber,
    spread_number: spreadNumber,
    orientation,
    image_url: urls.medium.url,
    thumbnail_url: urls.thumbnail.url,
    medium_url: urls.medium.url,
    original_url: urls.original.url,
    width: sizes.original.width,
    height: sizes.original.height,
    file_size: fileSize,
  });
}

export async function uploadImagesToAlbum(
  albumId: string,
  files: File[],
  onProgress?: UploadProgressCallback
): Promise<number> {
  const version = await ensureVersion(albumId);
  let nextPage = await getNextPageNumber(version.id);
  let successCount = 0;

  for (const file of files) {
    const progressState: UploadProgress = {
      fileName: file.name,
      stage: 'processing',
      variantProgress: { thumbnail: 0, medium: 0, original: 0 },
      overallPercent: 0,
    };

    const emit = (updates: Partial<UploadProgress>) => {
      Object.assign(progressState, updates);
      onProgress?.({ ...progressState });
    };

    try {
      emit({ stage: 'processing', variantProgress: { thumbnail: 0, medium: 0, original: 0 }, overallPercent: 0 });

      const img = await loadImage(file);
      const isSpread = isSpreadImage(img.naturalWidth, img.naturalHeight);

      if (isSpread) {
        emit({ stage: 'processing', variantProgress: { thumbnail: 0, medium: 0, original: 0 }, overallPercent: 5 });

        const halves = await splitImageIntoHalves(img, file.type);

        for (const half of ['left', 'right'] as const) {
          const side = half === 'left' ? 'Left' : 'Right';
          emit({ stage: 'uploading', variantProgress: { thumbnail: 0, medium: 0, original: 0 }, overallPercent: 30 });

          await uploadAndCreatePage(
            version.id,
            nextPage,
            albumId,
            version.version_number,
            halves[half],
            `${file.name.replace(/\.[^.]+$/, '')}_${side}.jpg`,
            file.size,
            (variant, pct) => {
              progressState.variantProgress[variant] = pct;
              const total = progressState.variantProgress.thumbnail + progressState.variantProgress.medium + progressState.variantProgress.original;
              emit({ overallPercent: 30 + Math.round((total / 3) * 0.5) });
            },
          );

          nextPage++;
          successCount++;
        }

        emit({ stage: 'done', overallPercent: 100 });
      } else {
        emit({ stage: 'processing', variantProgress: { thumbnail: 0, medium: 0, original: 0 }, overallPercent: 0 });

        const sizes = await processImage(file, (stage, pct) => {
          if (stage === 'thumbnail') {
            progressState.variantProgress.thumbnail = pct;
          } else if (stage === 'medium') {
            progressState.variantProgress.medium = pct;
          } else if (stage === 'original') {
            progressState.variantProgress.original = pct;
          }
          const total = progressState.variantProgress.thumbnail + progressState.variantProgress.medium + progressState.variantProgress.original;
          emit({ overallPercent: Math.round(total / 3) });
        });

        emit({ stage: 'uploading', variantProgress: { thumbnail: 0, medium: 0, original: 0 }, overallPercent: 30 });

        await uploadAndCreatePage(
          version.id,
          nextPage,
          albumId,
          version.version_number,
          sizes,
          file.name,
          file.size,
          (variant, pct) => {
            progressState.variantProgress[variant] = pct;
            const total = progressState.variantProgress.thumbnail + progressState.variantProgress.medium + progressState.variantProgress.original;
            emit({ overallPercent: 30 + Math.round((total / 3) * 0.5) });
          },
        );

        nextPage++;
        successCount++;

        emit({ stage: 'done', overallPercent: 100 });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      emit({ stage: 'error', error: message, overallPercent: 0 });
      throw new StorageError(`Failed to upload ${file.name}: ${message}`);
    }
  }

  const pages = await getPagesByVersion(version.id);
  await updateVersionPageCount(version.id, pages.length);

  return successCount;
}
