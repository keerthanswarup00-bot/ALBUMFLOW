import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase/client';
import { WelcomeScreen } from '@/components/review/WelcomeScreen';
import { AlbumViewer } from '@/components/review/AlbumViewer';
import { ReviewCompletedPage } from './ReviewCompletedPage';
import { Spinner } from '@/components/ui/Spinner';
import { useMetaTags } from '@/hooks/useMetaTags';
import type { ReviewData } from '@/types/viewer';
import { ImageIcon } from 'lucide-react';

interface TokenResult {
  album: ReviewData['album'] | null;
  version: ReviewData['version'] | null;
  pages: ReviewData['pages'] | [];
  error?: string;
}

export function ViewAlbumPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ReviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [studioInfo, setStudioInfo] = useState<{ name: string; owner: string; phone: string; logoUrl: string }>({ name: 'Studio', owner: '', phone: '', logoUrl: '' });
  const [deletedInfo, setDeletedInfo] = useState<{
    studio_name: string;
    owner_name: string;
    phone_number: string;
    album_title: string;
    studio_logo_url: string;
  } | null>(null);

  useMetaTags(data?.album ? {
    title: `${data.album.title} - Album Preview`,
    description: `Preview and review ${data.album.title}`,
    image: data.album.cover_image_url || undefined,
  } : null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    (async () => {
      try {
        const { data: result, error: rpcError } = await supabase
          .rpc('get_album_by_token', { p_token: token });

        if (cancelled) return;

        if (rpcError) {
          console.error('RPC Error', 'get_album_by_token', { p_token: token }, rpcError);
          setError(rpcError.message);
          return;
        }

        const typedResult = result as unknown as TokenResult & { designer_id?: string };

        if (typedResult?.error === 'album_deleted') {
          const { data: studioData } = await supabase
            .rpc('get_studio_by_album_token', { p_token: token });

          if (studioData && typeof studioData === 'object' && 'studio' in (studioData as Record<string, unknown>)) {
            const sd = studioData as { studio: { studio_name: string; owner_name: string; phone_number: string; studio_logo_url: string } | null; album_title: string };
            setDeletedInfo({
              studio_name: sd.studio?.studio_name || 'the studio',
              owner_name: sd.studio?.owner_name || '',
              phone_number: sd.studio?.phone_number || '',
              album_title: sd.album_title || 'Album',
              studio_logo_url: sd.studio?.studio_logo_url || '',
            });
          } else {
            setDeletedInfo({
              studio_name: 'the studio',
              owner_name: '',
              phone_number: '',
              album_title: typedResult.album?.title || 'Album',
              studio_logo_url: '',
            });
          }
          return;
        }

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

        const designerId = typedResult.album?.designer_id as string | undefined ?? typedResult.designer_id;
        if (designerId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('studio_name, owner_name, phone_number, studio_logo_url')
            .eq('user_id', designerId)
            .single();
          if (profile) {
            setStudioInfo({
              name: profile.studio_name || 'Studio',
              owner: profile.owner_name || '',
              phone: profile.phone_number || '',
              logoUrl: profile.studio_logo_url || '',
            });
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load album');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  if (deletedInfo) {
    const params = new URLSearchParams({
      studio_name: deletedInfo.studio_name,
      phone: deletedInfo.phone_number,
    });
    navigate(`/album-unavailable?${params.toString()}`, { replace: true });
    return null;
  }

  if (!token) {
    navigate('/album-unavailable?no_studio=1', { replace: true });
    return null;
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
    navigate('/album-unavailable?no_studio=1', { replace: true });
    return null;
  }

  if (completed) {
    return (
      <ReviewCompletedPage
        albumTitle={data.album.title}
        studioName={studioInfo.name}
        ownerName={studioInfo.owner}
        phoneNumber={studioInfo.phone}
        studioLogoUrl={studioInfo.logoUrl}
        onBack={() => setCompleted(false)}
      />
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
      {showWelcome && (
        <WelcomeScreen
          albumTitle={data.album.title}
          clientName={data.album.client_name}
          onStart={() => setShowWelcome(false)}
        />
      )}

      <AlbumViewer
        key={token}
        album={data.album}
        pages={data.pages}
        studioName={studioInfo.name}
        ownerName={studioInfo.owner}
        phoneNumber={studioInfo.phone}
        studioLogoUrl={studioInfo.logoUrl}
      />
    </>
  );
}
