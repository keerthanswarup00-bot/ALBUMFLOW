import { useEffect, useState, useCallback } from 'react';

export type DisplayMode = 'standalone-pwa' | 'browser-tab' | 'browser-fullscreen';
export type Platform = 'ios' | 'android' | 'other';

export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

export function detectDisplayMode(): DisplayMode {
  if (typeof window === 'undefined') return 'browser-tab';
  if (window.navigator.standalone) return 'standalone-pwa';
  if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone-pwa';
  if (document.fullscreenElement) return 'browser-fullscreen';
  return 'browser-tab';
}

export function useFullscreenManager(previewMode: boolean): {
  isFullscreen: boolean;
  mode: DisplayMode;
  platform: Platform;
} {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mode, setMode] = useState<DisplayMode>('browser-tab');
  const platform = detectPlatform();

  useEffect(() => {
    setMode(detectDisplayMode());
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setMode(detectDisplayMode());
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    if (!previewMode) return;
    if (mode === 'standalone-pwa') return;

    if (platform === 'ios') {
      window.scrollTo(0, 1);
      return;
    }

    document.documentElement.requestFullscreen().catch(() => {});
  }, [previewMode, mode, platform]);

  return { isFullscreen, mode, platform };
}
