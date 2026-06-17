import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';
import type { Album } from '@/types';

interface DeleteAlbumModalProps {
  album: Album | null;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteAlbumModal({
  album,
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteAlbumModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Delete Album" size="sm">
      <div className="flex flex-col items-center text-center pb-2">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <p className="text-sm text-gray-600 dark:text-text-secondary">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-gray-900 dark:text-text-primary">{album?.title}</span>?
        </p>
        <p className="mt-2 text-xs text-gray-400 dark:text-text-muted">This action cannot be undone.</p>
        <div className="mt-6 flex w-full gap-3">
          <Button
            variant="secondary"
            onClick={onCancel}
            className="flex-1"
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            className="flex-1"
            isLoading={isDeleting}
          >
            Delete Album
          </Button>
        </div>
      </div>
    </Modal>
  );
}
