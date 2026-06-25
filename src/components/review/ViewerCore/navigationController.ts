import { useCallback } from 'react';

export interface PageFlipAPI {
  flipNext: () => void;
  flipPrev: () => void;
  flip: (page: number) => void;
}

export function useNavigation(getApi: () => PageFlipAPI | null | undefined) {
  const goNext = useCallback(() => {
    const api = getApi();
    if (api) api.flipNext();
  }, [getApi]);

  const goPrev = useCallback(() => {
    const api = getApi();
    if (api) api.flipPrev();
  }, [getApi]);

  const goTo = useCallback((page: number) => {
    const api = getApi();
    if (api) api.flip(page);
  }, [getApi]);

  return { goNext, goPrev, goTo };
}
