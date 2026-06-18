import { useState, useCallback } from 'react';
import { ImageDropZone } from './ImageDropZone';
import { UploadProgress } from './UploadProgress';
import { Button } from '@/components/ui/Button';
import { uploadImagesToAlbum, type UploadProgress as UploadProgressType } from '@/services/supabase/uploads';
import { useUIStore } from '@/store/uiStore';
import { ImageIcon } from 'lucide-react';

interface ImageUploadSectionProps {
  albumId: string;
  onUploadComplete: () => void;
}

export function ImageUploadSection({ albumId, onUploadComplete }: ImageUploadSectionProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [progressList, setProgressList] = useState<UploadProgressType[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { showToast } = useUIStore();

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
  }, []);

  async function handleUpload() {
    if (files.length === 0) return;

    setIsUploading(true);
    setProgressList([]);

    try {
      const progressMap = new Map<string, UploadProgressType>();

      const count = await uploadImagesToAlbum(albumId, files, (progress) => {
        progressMap.set(progress.fileName, progress);
        setProgressList(Array.from(progressMap.values()));
      });

      showToast(`${count} image${count !== 1 ? 's' : ''} uploaded successfully`, 'success');
      setFiles([]);
      setProgressList([]);
      onUploadComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      showToast(message, 'error');
    } finally {
      setIsUploading(false);
    }
  }

  const completedFiles = progressList.filter((f) => f.stage === 'done').length;

  return (
    <div className="flex flex-col gap-4">
      <ImageDropZone
        onFilesSelected={handleFilesSelected}
        isUploading={isUploading}
      />

      {files.length > 0 && !isUploading && (
        <div className="flex items-center justify-between rounded-xl border border-border-primary dark:border-border-primary bg-bg-primary dark:bg-bg-elevated p-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            <span className="text-sm font-medium text-text-secondary dark:text-text-secondary">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <Button onClick={handleUpload}>
            Upload
          </Button>
        </div>
      )}

      {isUploading && (
        <UploadProgress
          files={progressList}
          totalFiles={files.length}
          completedFiles={completedFiles}
        />
      )}
    </div>
  );
}
