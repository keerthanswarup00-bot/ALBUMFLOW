import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { ViewerMode, ViewerAnalytics, ReviewPage, ReviewAlbum, ReviewVersion } from '@/types/viewer';

const STORAGE_KEY_PREFIX = 'albumflow_viewer_';

function loadAnalytics(albumId: string): ViewerAnalytics {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${albumId}_analytics`);
    if (raw) return JSON.parse(raw) as ViewerAnalytics;
  } catch {
    // localStorage unavailable or corrupted data
  }
  return { pagesViewed: [], totalViewingTime: 0, lastViewedPage: 0, startedAt: Date.now() };
}

function saveAnalytics(albumId: string, analytics: ViewerAnalytics) {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${albumId}_analytics`, JSON.stringify(analytics));
  } catch {
    // localStorage full or unavailable
  }
}

export function useViewer(
  album: ReviewAlbum | null,
  _version: ReviewVersion | null,
  pages: ReviewPage[]
) {
  const [currentPage, setCurrentPage] = useState(0);
  const [mode, setMode] = useState<ViewerMode>('single');
  const [isZoomed, setIsZoomed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [analytics, setAnalytics] = useState<ViewerAnalytics>(() =>
    album ? loadAnalytics(album.id) : { pagesViewed: [], totalViewingTime: 0, lastViewedPage: 0, startedAt: Date.now() }
  );

  const tickRef = useRef<number | null>(null);

  const totalPages = pages.length;

  useEffect(() => {
    tickRef.current = window.setInterval(() => {
      setAnalytics((prev) => {
        const updated = { ...prev, totalViewingTime: prev.totalViewingTime + 1 };
        if (album) saveAnalytics(album.id, updated);
        return updated;
      });
    }, 1000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [album]);

  // Mark page as viewed
  const markPageViewed = useCallback(
    (pageNum: number) => {
      setAnalytics((prev) => {
        if (prev.pagesViewed.includes(pageNum)) return prev;
        const updated = {
          ...prev,
          pagesViewed: [...prev.pagesViewed, pageNum],
          lastViewedPage: pageNum,
        };
        if (album) saveAnalytics(album.id, updated);
        return updated;
      });
    },
    [album]
  );

  // Navigation
  const canGoPrev = useMemo(() => {
    if (mode === 'spread') return currentPage > 0;
    return currentPage > 0;
  }, [currentPage, mode]);

  const canGoNext = useMemo(() => {
    if (mode === 'spread') return currentPage + 2 < totalPages;
    return currentPage + 1 < totalPages;
  }, [currentPage, mode, totalPages]);

  const goToPage = useCallback(
    (pageNum: number) => {
      const clamped = Math.max(0, Math.min(pageNum, totalPages - 1));
      setCurrentPage(clamped);
      const actual = mode === 'spread' ? clamped + 1 : clamped + 1;
      markPageViewed(actual);
      if (mode === 'spread') {
        const nextActual = clamped + 2;
        if (nextActual <= totalPages) markPageViewed(nextActual);
      }
    },
    [totalPages, mode, markPageViewed]
  );

  const goNext = useCallback(() => {
    const step = mode === 'spread' ? 2 : 1;
    goToPage(currentPage + step);
  }, [currentPage, mode, goToPage]);

  const goPrev = useCallback(() => {
    const step = mode === 'spread' ? 2 : 1;
    goToPage(currentPage - step);
  }, [currentPage, mode, goToPage]);

  // Current pages for rendering
  const currentPages = useMemo((): ReviewPage[] => {
    if (mode === 'spread') {
      const left = pages[currentPage];
      const right = pages[currentPage + 1];
      return left ? (right ? [left, right] : [left]) : [];
    }
    return pages[currentPage] ? [pages[currentPage]] : [];
  }, [pages, currentPage, mode]);

  // Buffer pages for preloading
  const bufferPageIndices = useMemo((): number[] => {
    const indices: number[] = [currentPage];
    if (currentPage > 0) indices.push(currentPage - 1);
    if (currentPage + 1 < totalPages) indices.push(currentPage + 1);
    if (mode === 'spread' && currentPage + 2 < totalPages) indices.push(currentPage + 2);
    return [...new Set(indices)];
  }, [currentPage, totalPages, mode]);

  // Progress
  const progressPercent = useMemo(() => {
    if (totalPages === 0) return 0;
    return Math.round((analytics.pagesViewed.length / totalPages) * 100);
  }, [analytics.pagesViewed.length, totalPages]);

  const progressLabel = useMemo(() => {
    return `${analytics.pagesViewed.length} / ${totalPages} Pages Viewed`;
  }, [analytics.pagesViewed.length, totalPages]);

  // Toggles
  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'single' ? 'spread' : 'single'));
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch {
        // Fullscreen not supported or denied
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch {
        // Not in fullscreen
      }
    }
  }, []);

  const toggleHelp = useCallback(() => {
    setIsHelpOpen((prev) => !prev);
  }, []);

  // Handle fullscreen change events
  useEffect(() => {
    function handleChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  // currentPage is intentionally not reset via effect.
  // ReviewPage keys the AlbumViewer by albumId for fresh state on album change.

  return {
    currentPage,
    currentPages,
    bufferPageIndices,
    totalPages,
    mode,
    isZoomed,
    isFullscreen,
    isHelpOpen,
    analytics,
    progressPercent,
    progressLabel,
    canGoPrev,
    canGoNext,
    setCurrentPage: goToPage,
    goNext,
    goPrev,
    toggleMode,
    toggleFullscreen,
    toggleHelp,
    setIsZoomed,
    setIsHelpOpen,
    markPageViewed,
  };
}
