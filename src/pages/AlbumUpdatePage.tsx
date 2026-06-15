import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAlbumStore } from '@/store/albumStore';
import { useUpdateStore } from '@/store/updateStore';
import { useReviewCycleStore } from '@/store/reviewCycleStore';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { ROUTES } from '@/constants/routes';
import { ArrowLeft, X, ImageIcon, Save, FileText } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { AlbumUpdatePage } from '@/types/viewer';

export function AlbumUpdatePage() {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const { currentAlbum, pages, isLoading, fetchAlbumById, fetchAlbumPages } = useAlbumStore();
  const { getUpdates, createUpdate } = useUpdateStore();
  const { markAlbumUpdated } = useReviewCycleStore();
  const { showToast } = useUIStore();

  const [notes, setNotes] = useState('');
  const [selectedPages, setSelectedPages] = useState<Record<number, { file: File; preview: string }>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (albumId) {
      fetchAlbumById(albumId);
      fetchAlbumPages(albumId);
    }
  }, [albumId, fetchAlbumById, fetchAlbumPages]);

  function handleFileSelect(pageNumber: number, file: File) {
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedPages((prev) => ({
        ...prev,
        [pageNumber]: { file, preview: reader.result as string },
      }));
    };
    reader.readAsDataURL(file);
  }

  function handleRemovePage(pageNumber: number) {
    setSelectedPages((prev) => {
      const next = { ...prev };
      delete next[pageNumber];
      return next;
    });
  }

  async function handleSave() {
    if (!albumId || Object.keys(selectedPages).length === 0) return;
    setIsSaving(true);
    try {
      const updatePages: AlbumUpdatePage[] = Object.entries(selectedPages).map(([pageNum, data]) => ({
        page_number: parseInt(pageNum, 10),
        image_url: data.preview,
        thumbnail_url: null,
        width: 0,
        height: 0,
      }));
      createUpdate(albumId, notes, updatePages);
      markAlbumUpdated(albumId);
      showToast('Album update saved', 'success');
      navigate(ROUTES.ALBUM_DETAIL.replace(':albumId', albumId));
    } catch {
      showToast('Failed to save update', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <PageSpinner />;
  if (!currentAlbum) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Album not found</div>
      </div>
    );
  }

  const updates = getUpdates(albumId!);
  const updateNumber = updates.length + 1;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to={ROUTES.ALBUM_DETAIL.replace(':albumId', albumId!)}
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to album
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {updateNumber === 1 ? 'Upload Album' : `Album Update ${updateNumber - 1}`}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{currentAlbum.title}</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Designer notes */}
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <FileText className="h-4 w-4 text-gray-400" />
            Update Notes
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe what changed in this update..."
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-200 p-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <p className="mt-1 text-xs text-gray-400">
            Example: Updated all requested image changes. Corrected spelling mistakes. Adjusted brightness on pages 12 and 18.
          </p>
        </Card>

        {/* Replace pages */}
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <ImageIcon className="h-4 w-4 text-gray-400" />
            Replace Pages
          </h2>
          <p className="mb-4 text-xs text-gray-500">
            Select which pages to update. Unchanged pages will stay as they are.
          </p>

          {pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 py-8">
              <ImageIcon className="mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No pages uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {pages.map((page) => {
                const isSelected = selectedPages[page.page_number] !== undefined;
                return (
                  <div key={page.id} className="flex flex-col">
                    <label className={cn(
                      'relative aspect-[3/4] cursor-pointer overflow-hidden rounded-lg border-2 transition-all',
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    )}>
                      <img
                        src={selectedPages[page.page_number]?.preview ?? page.thumbnail_url ?? page.image_url}
                        alt={`Page ${page.page_number}`}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-1.5">
                        <span className="text-xs font-medium text-white">Page {page.page_number}</span>
                      </div>
                      {isSelected && (
                        <div className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                          <CheckIcon className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(page.page_number, file);
                        }}
                      />
                    </label>
                    {isSelected && (
                      <button
                        onClick={() => handleRemovePage(page.page_number)}
                        className="mt-1 flex items-center justify-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {Object.keys(selectedPages).length > 0 && (
            <div className="mt-4 rounded-lg bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
              {Object.keys(selectedPages).length} page{Object.keys(selectedPages).length !== 1 ? 's' : ''} selected for update
            </div>
          )}
        </Card>

        {/* Previous updates */}
        {updates.length > 0 && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Previous Updates</h2>
            <div className="flex flex-col gap-2">
              {updates.map((update) => (
                <div key={update.id} className="rounded-lg bg-gray-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{update.label}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(update.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {update.notes && (
                    <p className="mt-1 text-xs text-gray-500">{update.notes}</p>
                  )}
                  <p className="mt-0.5 text-xs text-gray-400">
                    {update.page_count} page{update.page_count !== 1 ? 's' : ''}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Save button */}
        <div className="flex justify-end gap-3">
          <Link to={ROUTES.ALBUM_DETAIL.replace(':albumId', albumId!)}>
            <Button variant="secondary">Cancel</Button>
          </Link>
          <Button
            onClick={handleSave}
            isLoading={isSaving}
            disabled={Object.keys(selectedPages).length === 0}
          >
            <Save className="h-4 w-4" />
            Save Update
          </Button>
        </div>
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className={className}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
