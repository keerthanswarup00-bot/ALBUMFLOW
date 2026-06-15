import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/services/supabase/client';
import { WelcomeScreen } from '@/components/review/WelcomeScreen';
import { AlbumViewer } from '@/components/review/AlbumViewer';
import { Spinner } from '@/components/ui/Spinner';
import type { ReviewData } from '@/types/viewer';
import { AlertCircle, ImageIcon } from 'lucide-react';

interface TokenResult {
  album: ReviewData['album'] | null;
  version: ReviewData['version'] | null;
  pages: ReviewData['pages'] | [];
  error?: string;
}

export function ViewAlbumPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ReviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    (async () => {
      try {
        const { data: result, error: rpcError } = await supabase
          .rpc('get_album_by_token', { token_text: token });

        if (cancelled) return;

        if (rpcError) {
          setError(rpcError.message);
          return;
        }

        const typedResult = result as unknown as TokenResult;

        if (typedResult?.error === 'invalid_or_expired_token') {
          setError('This link is invalid or has expired.');
          return;
        }

        if (typedResult?.error === 'album_not_found') {
          setError('Album not found.');
          return;
        }

        if (!typedResult?.album) {
          setError('Album not found');
          return;
        }

        setData({
          album: typedResult.album,
          version: typedResult.version ?? null,
          pages: typedResult.pages ?? [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load album');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  if (!token) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-50 p-4 safe-area-inset">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Invalid Link</h1>
        <p className="mt-1 text-sm text-gray-500">
          No album link was provided.
        </p>
        <p className="mt-6 text-xs text-gray-400">
          Please check the link you received from your designer.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-50 p-4 safe-area-inset">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-gray-500">Loading album...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-50 p-4 safe-area-inset">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Album Not Found</h1>
        <p className="mt-1 text-sm text-gray-500">
          {error ?? 'This album could not be found or is no longer available.'}
        </p>
        <p className="mt-6 text-xs text-gray-400">
          If you believe this is a mistake, please contact your designer.
        </p>
      </div>
    );
  }

  if (data.pages.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-50 p-4 safe-area-inset">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
          <ImageIcon className="h-8 w-8 text-gray-300" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">{data.album.title}</h1>
        <p className="mt-2 text-sm text-gray-500">
          This album doesn't have any pages yet.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Your designer is working on it. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <>
      {showWelcome && !approved && (
        <WelcomeScreen
          albumTitle={data.album.title}
          clientName={data.album.client_name}
          phase={data.album.phase}
          token={token!}
          onStart={() => setShowWelcome(false)}
          onApproved={() => setApproved(true)}
        />
      )}

      <AlbumViewer
        key={token}
        album={data.album}
        pages={data.pages}
      />
    </>
  );
}
