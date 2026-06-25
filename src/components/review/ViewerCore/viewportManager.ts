import { useEffect, useState } from 'react';

export interface ViewportState {
  height: number;
  width: number;
  offsetTop: number;
  isLandscape: boolean;
}

function getViewport(): ViewportState {
  if (typeof window === 'undefined') {
    return { height: 0, width: 0, offsetTop: 0, isLandscape: false };
  }
  const vv = window.visualViewport;
  return {
    height: vv?.height ?? window.innerHeight,
    width: vv?.width ?? window.innerWidth,
    offsetTop: vv?.offsetTop ?? 0,
    isLandscape: window.innerWidth > window.innerHeight,
  };
}

export function useVisualViewport(): ViewportState {
  const [vp, setVp] = useState<ViewportState>(getViewport);

  useEffect(() => {
    const handler = () => setVp(getViewport());
    const vv = window.visualViewport;
    if (vv) vv.addEventListener('resize', handler);
    window.addEventListener('orientationchange', () => setTimeout(handler, 200));
    window.addEventListener('resize', handler);
    return () => {
      if (vv) vv.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
      window.removeEventListener('resize', handler);
    };
  }, []);

  return vp;
}
