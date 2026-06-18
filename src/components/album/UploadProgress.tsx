import { cn } from '@/utils/cn';
import { CheckCircle, XCircle, Loader2, ImageIcon } from 'lucide-react';

interface FileProgress {
  fileName: string;
  stage: 'processing' | 'uploading' | 'saving' | 'done' | 'error';
  overallPercent: number;
  error?: string;
}

interface UploadProgressProps {
  files: FileProgress[];
  totalFiles: number;
  completedFiles: number;
}

const stageLabels: Record<string, string> = {
  processing: 'Processing...',
  uploading: 'Uploading...',
  saving: 'Saving...',
  done: 'Complete',
  error: 'Failed',
};

export function UploadProgress({ files, totalFiles, completedFiles }: UploadProgressProps) {
  if (files.length === 0) return null;

  return (
    <div className="rounded-xl border border-border-primary bg-bg-primary p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          Uploading {completedFiles} of {totalFiles}
        </div>
        <span className="text-xs text-text-muted">{totalFiles} file{totalFiles !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex flex-col gap-2">
        {files.map((file, i) => (
          <div key={i} className="rounded-xl bg-bg-secondary p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon className="h-4 w-4 shrink-0 text-text-muted" />
                <span className="truncate text-xs font-medium text-text-secondary">
                  {file.fileName}
                </span>
              </div>
              <span className="shrink-0 text-xs text-text-secondary">
                {file.stage === 'done' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : file.stage === 'error' ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  `${file.overallPercent}%`
                )}
              </span>
            </div>

            {file.stage !== 'done' && file.stage !== 'error' && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-bg-secondary">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    file.stage === 'processing'
                      ? 'bg-blue-400'
                      : file.stage === 'uploading'
                        ? 'bg-blue-500'
                        : 'bg-blue-600',
                  )}
                  style={{ width: `${Math.max(file.overallPercent, 5)}%` }}
                />
              </div>
            )}

            {file.stage === 'error' && file.error && (
              <p className="mt-1 text-xs text-red-500">{file.error}</p>
            )}

            {file.stage !== 'done' && file.stage !== 'error' && (
              <p className="mt-1 text-xs text-text-muted">
                {stageLabels[file.stage]}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
