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
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          Uploading {completedFiles} of {totalFiles}
        </div>
        <span className="text-xs text-gray-400">{totalFiles} file{totalFiles !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex flex-col gap-2">
        {files.map((file, i) => (
          <div key={i} className="rounded-xl bg-gray-50 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="truncate text-xs font-medium text-gray-700">
                  {file.fileName}
                </span>
              </div>
              <span className="shrink-0 text-xs text-gray-500">
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
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
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
              <p className="mt-1 text-xs text-gray-400">
                {stageLabels[file.stage]}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
