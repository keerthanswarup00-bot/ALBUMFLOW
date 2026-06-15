import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { supabase } from '@/services/supabase/client';
import { Check, MoveHorizontal, RotateCw, ZoomIn, MessageSquare, CheckSquare, ThumbsUp, Edit3 } from 'lucide-react';

interface WelcomeScreenProps {
  albumTitle: string;
  clientName: string;
  phase: string;
  token: string;
  onStart: () => void;
  onApproved: () => void;
}

const features = [
  { icon: MoveHorizontal, text: 'Swipe through pages' },
  { icon: RotateCw, text: 'Rotate your phone for album view' },
  { icon: ZoomIn, text: 'Zoom into photos' },
  { icon: MessageSquare, text: 'Request changes' },
  { icon: CheckSquare, text: 'Approve your final album' },
];

export function WelcomeScreen({ albumTitle, clientName, phase, token, onStart, onApproved }: WelcomeScreenProps) {
  const [dontShowAgain, setDontShowAgain] = useLocalStorage<Record<string, boolean>>(
    'albumflow_welcome_dismissed',
    {}
  );
  const [approving, setApproving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [changeDescription, setChangeDescription] = useState('');
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const albumKey = albumTitle.replace(/\s+/g, '_').toLowerCase();
  if (dontShowAgain[albumKey]) return null;

  const isReviewPhase = phase === 'review';

  async function handleApprove() {
    setApproving(true);
    setActionError(null);
    const { data, error } = await supabase.rpc('approve_album', {
      p_token: token,
      p_client_name: clientName || 'Client',
      p_client_email: '',
    });
    if (error) {
      setActionError(error.message);
    } else if ((data as { error?: string })?.error) {
      setActionError((data as { error: string }).error);
    } else {
      setActionMsg('Album approved! Thank you.');
      onApproved();
    }
    setApproving(false);
  }

  async function handleRequestChanges() {
    if (!changeDescription.trim()) return;
    setRequesting(true);
    setActionError(null);
    const { data, error } = await supabase.rpc('request_album_changes', {
      p_token: token,
      p_description: changeDescription.trim(),
    });
    if (error) {
      setActionError(error.message);
    } else if ((data as { error?: string })?.error) {
      setActionError((data as { error: string }).error);
    } else {
      setActionMsg('Changes requested! Your designer will review your feedback.');
      setShowChangeForm(false);
    }
    setRequesting(false);
  }

  function handleStart() {
    if (dontShowAgain[albumKey]) return;
    onStart();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="px-6 pt-8 pb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <Check className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Welcome to Your Album Preview</h1>
          <p className="mt-2 text-sm text-gray-500">
            {clientName} &middot; {albumTitle}
          </p>
        </div>

        <div className="px-6 pb-4">
          <p className="mb-4 text-xs font-medium uppercase tracking-wider text-gray-400">
            You can
          </p>
          <ul className="flex flex-col gap-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.text} className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50">
                    <Icon className="h-4 w-4 text-blue-600" />
                  </span>
                  {feature.text}
                </li>
              );
            })}
          </ul>
        </div>

        {actionMsg && (
          <div className="px-6 pb-4">
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              {actionMsg}
            </div>
          </div>
        )}

        {actionError && (
          <div className="px-6 pb-4">
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          </div>
        )}

        {isReviewPhase && !actionMsg && (
          <div className="px-6 pb-4 flex flex-col gap-3">
            <Button onClick={handleApprove} size="lg" isLoading={approving} className="w-full bg-green-600 hover:bg-green-700">
              <ThumbsUp className="h-4 w-4" />
              Approve All
            </Button>

            {!showChangeForm ? (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setShowChangeForm(true)}
                className="w-full"
              >
                <Edit3 className="h-4 w-4" />
                Request Changes
              </Button>
            ) : (
              <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <textarea
                  value={changeDescription}
                  onChange={(e) => setChangeDescription(e.target.value)}
                  placeholder="Describe what changes are needed..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleRequestChanges} isLoading={requesting} disabled={!changeDescription.trim()}>
                    Submit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setShowChangeForm(false); setChangeDescription(''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="px-6 pb-6">
          <Button onClick={handleStart} size="lg" className="w-full">
            Start Viewing Album
          </Button>

          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={!!dontShowAgain[albumKey]}
              onChange={(e) =>
                setDontShowAgain((prev) => ({
                  ...prev,
                  [albumKey]: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Don't show this again for this album
          </label>
        </div>
      </div>
    </div>
  );
}
