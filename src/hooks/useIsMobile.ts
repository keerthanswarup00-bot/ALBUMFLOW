import { useState, useEffect } from 'react';

const COMPACT_BREAKPOINT = 900;

export function useIsCompact(): boolean {
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < COMPACT_BREAKPOINT;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${COMPACT_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsCompact(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isCompact;
}

export function useIsLandscape(): boolean {
  const [isLandscape, setIsLandscape] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth > window.innerHeight;
  });

  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)');
    const handler = (e: MediaQueryListEvent) => setIsLandscape(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isLandscape;
}

export function useAutoPreview(): boolean {
  const isCompact = useIsCompact();
  const isLandscape = useIsLandscape();
  return isCompact && isLandscape;
}
