import { useState, useEffect } from 'react';
import type { ViewOrientation } from '@/types/viewer';

export function useOrientation(): ViewOrientation {
  const [orientation, setOrientation] = useState<ViewOrientation>(() =>
    window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  );

  useEffect(() => {
    function handleResize() {
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const mql = window.matchMedia('(orientation: landscape)');
    function handleChange(e: MediaQueryListEvent) {
      setOrientation(e.matches ? 'landscape' : 'portrait');
    }

    if (mql.addEventListener) {
      mql.addEventListener('change', handleChange);
      return () => mql.removeEventListener('change', handleChange);
    }
  }, []);

  return orientation;
}
