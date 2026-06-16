import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Mic, Square, Play, Trash2, Send, Pause, AlertCircle } from 'lucide-react';

interface VoiceMessageRecorderProps {
  onSend: (duration: number, blob: Blob) => void;
  onClose: () => void;
}

type RecorderState = 'idle' | 'recording' | 'finished' | 'error';

export function VoiceMessageRecorder({ onSend, onClose }: VoiceMessageRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');
  const mountedRef = useRef(true);
  const pendingUrlRef = useRef<string | null>(null);

  const cleanup = useCallback(function cleanup() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
      if (pendingUrlRef.current) {
        URL.revokeObjectURL(pendingUrlRef.current);
        pendingUrlRef.current = null;
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [cleanup, audioUrl]);

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
      mimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        if (!mountedRef.current) return;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState('finished');
      };

      recorder.onerror = () => {
        if (!mountedRef.current) return;
        setState('error');
        setError('Recording failed. Please try again.');
        cleanup();
      };

      recorder.start(100);

      timerRef.current = window.setInterval(() => {
        if (!mountedRef.current) return;
        setDuration((prev) => prev + 1);
      }, 1000);

      setState('recording');
    } catch (err) {
      if (!mountedRef.current) return;
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
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
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
    if (audioBlob) {
      onSend(duration, audioBlob);
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
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Send Voice Message</h2>
          <button
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {state === 'error' && error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 p-3.5 text-base text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p>{error}</p>
              <button
                onClick={startRecording}
                className="mt-2 font-bold text-red-700 underline hover:no-underline cursor-pointer"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-4 py-4">
          {(state === 'recording' || state === 'finished') && (
            <div className="text-4xl font-mono font-bold tabular-nums text-gray-900">
              {formatTime(duration)}
            </div>
          )}

          {state === 'idle' && (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={startRecording}
                className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors cursor-pointer shadow-lg"
                aria-label="Start recording"
              >
                <Mic className="h-10 w-10" />
              </button>
              <p className="text-base font-medium text-gray-500">Tap to Start Recording</p>
            </div>
          )}

          {state === 'recording' && (
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-red-500 flex items-center justify-center">
                  <div className="h-24 w-24 rounded-full bg-red-500 animate-ping absolute opacity-30" />
                  <button
                    onClick={stopRecording}
                    className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white cursor-pointer"
                    aria-label="Stop recording"
                  >
                    <Square className="h-7 w-7 text-red-500" />
                  </button>
                </div>
              </div>
              <p className="text-base font-bold text-red-500 animate-pulse">Recording...</p>
              <button
                onClick={stopRecording}
                className="text-base text-gray-500 underline hover:text-gray-700 cursor-pointer"
              >
                Stop Recording
              </button>
            </div>
          )}

          {state === 'finished' && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="flex items-center gap-3 w-full justify-center">
                <button
                  onClick={togglePlayback}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="h-7 w-7" />
                  ) : (
                    <Play className="h-7 w-7 ml-0.5" />
                  )}
                </button>
                <div className="flex flex-col">
                  <p className="text-base font-bold text-gray-900">Voice Message Ready</p>
                  <p className="text-sm text-gray-500">
                    {formatTime(playbackTime || duration)}
                  </p>
                </div>
              </div>

              <div className="flex w-full gap-3">
                <button
                  onClick={deleteRecording}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 px-4 py-3.5 text-base font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-5 w-5" />
                  Delete
                </button>
                <button
                  onClick={handleSend}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-base font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <Send className="h-5 w-5" />
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
