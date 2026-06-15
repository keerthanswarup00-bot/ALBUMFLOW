import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Mic, Square, Play, Trash2, Send, Pause, AlertCircle } from 'lucide-react';

interface VoiceMessageRecorderProps {
  onSend: (duration: number, audioData: string) => void;
  onClose: () => void;
}

type RecorderState = 'idle' | 'recording' | 'finished' | 'error';

export function VoiceMessageRecorder({ onSend, onClose }: VoiceMessageRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const cleanup = useCallback(function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  async function startRecording() {
    try {
      setError(null);
      setDuration(0);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioData(reader.result as string);
        };
        reader.readAsDataURL(blob);

        setState('finished');
      };

      recorder.onerror = () => {
        setState('error');
        setError('Recording failed. Please try again.');
        cleanup();
      };

      recorder.start(100);

      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      setState('recording');
    } catch (err) {
      setState('error');
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access needed. Allow microphone access to record a voice message.');
      } else {
        setError('Unable to access microphone. Please check your device settings.');
      }
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
  }

  function deleteRecording() {
    cleanup();
    setAudioUrl(null);
    setAudioData(null);
    setDuration(0);
    setState('idle');
  }

  function togglePlayback() {
    if (!audioUrl) return;
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onended = () => {
      setIsPlaying(false);
      setPlaybackTime(0);
    };

    audio.ontimeupdate = () => {
      setPlaybackTime(Math.floor(audio.currentTime));
    };

    audio.play();
    setIsPlaying(true);
    setPlaybackTime(0);
  }

  function handleSend() {
    if (audioData) {
      onSend(duration, audioData);
    }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-6 sm:rounded-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Send Voice Message</h2>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error state */}
        {state === 'error' && error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 p-3.5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p>{error}</p>
              <button
                onClick={startRecording}
                className="mt-2 font-medium text-red-700 underline hover:no-underline cursor-pointer"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Recording UI */}
        <div className="flex flex-col items-center gap-4 py-4">
          {/* Duration */}
          {(state === 'recording' || state === 'finished') && (
            <div className="text-3xl font-mono font-bold tabular-nums text-gray-900">
              {formatTime(duration)}
            </div>
          )}

          {/* Idle state */}
          {state === 'idle' && (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={startRecording}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors cursor-pointer"
                aria-label="Start recording"
              >
                <Mic className="h-9 w-9" />
              </button>
              <p className="text-sm text-gray-500">Tap to Start Recording</p>
            </div>
          )}

          {/* Recording state */}
          {state === 'recording' && (
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-red-500 flex items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-red-500 animate-ping absolute opacity-30" />
                  <button
                    onClick={stopRecording}
                    className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-white cursor-pointer"
                    aria-label="Stop recording"
                  >
                    <Square className="h-6 w-6 text-red-500" />
                  </button>
                </div>
              </div>
              <p className="text-sm font-medium text-red-500 animate-pulse">Recording...</p>
              <button
                onClick={stopRecording}
                className="text-sm text-gray-500 underline hover:text-gray-700 cursor-pointer"
              >
                Stop Recording
              </button>
            </div>
          )}

          {/* Finished state */}
          {state === 'finished' && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="flex items-center gap-3 w-full justify-center">
                <button
                  onClick={togglePlayback}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6 ml-0.5" />
                  )}
                </button>
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-gray-900">Voice Message Ready</p>
                  <p className="text-xs text-gray-400">
                    {formatTime(playbackTime || duration)}
                  </p>
                </div>
              </div>

              <div className="flex w-full gap-3">
                <button
                  onClick={deleteRecording}
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
                <button
                  onClick={handleSend}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  Send Voice Message
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
