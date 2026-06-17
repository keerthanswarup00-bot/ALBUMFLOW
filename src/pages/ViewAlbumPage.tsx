import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase/client';
import { WelcomeScreen } from '@/components/review/WelcomeScreen';
import { AlbumViewer } from '@/components/review/AlbumViewer';
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
  const { token, slug } = useParams<{ token: string; slug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ReviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [studioInfo, setStudioInfo] = useState<{ name: string; owner: string; phone: string; logoUrl: string }>({ name: 'Studio', owner: '', phone: '', logoUrl: '' });

  const identifier = token || slug;
  const isSlug = !token && !!slug;

  useMetaTags(data?.album ? {
    title: studioInfo.name !== 'Studio' ? `${studioInfo.name} • Album Review` : `${data.album.title} - Album Preview`,
    description: `Review your ${data.album.title} album and request changes online.`,
    image: data.album.cover_image_url || undefined,
  } : null);

  useEffect(() => {
    if (!identifier) return;

    let cancelled = false;

    (async () => {
      try {
        const rpcName = isSlug ? 'get_album_by_slug' : 'get_album_by_token';
        const rpcParams = isSlug ? { p_slug: slug } : { p_token: token };

        const { data: result, error: rpcError } = await supabase
          .rpc(rpcName, rpcParams);

        if (cancelled) return;

        if (rpcError) {
          console.error('RPC Error', rpcName, rpcParams, rpcError);
          setError(rpcError.message);
          return;
        }

        const typedResult = result as unknown as TokenResult & { designer_id?: string };

        if (typedResult?.error === 'album_deleted') {
          const designerId = typedResult.album?.designer_id as string | undefined;
          if (designerId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('studio_name, owner_name, phone_number, studio_logo_url')
              .eq('user_id', designerId)
              .single();
            if (profile) {
              const params = new URLSearchParams({
                studio_name: profile.studio_name || 'the studio',
                studio_logo_url: profile.studio_logo_url || '',
                owner_name: profile.owner_name || '',
                phone: profile.phone_number || '',
              });
              navigate(`/album-unavailable?${params.toString()}`, { replace: true });
              return;
            }
          }
          navigate('/album-unavailable?no_studio=1', { replace: true });
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
  }, [identifier]);

  if (!identifier) {
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
        key={identifier}
        album={data.album}
        pages={data.pages}
        studioName={studioInfo.name}
        phoneNumber={studioInfo.phone}
        studioLogoUrl={studioInfo.logoUrl}
      />
    </>
  );
}
