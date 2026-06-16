import { useEffect } from 'react';

interface MetaTags {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

export function useMetaTags(tags: MetaTags | null) {
  useEffect(() => {
    if (!tags) return;

    const origin = window.location.origin;
    const url = tags.url || window.location.href;
    const title = tags.title || 'AlbumFlow';
    const description = tags.description || 'Album proofing for photographers and designers';
    const image = tags.image || `${origin}/icons.svg`;

    const updates: Array<{ selector: string; attrs: Record<string, string> }> = [
      { selector: 'title', attrs: {} },
      { selector: 'meta[name="description"]', attrs: { content: description } },
      { selector: 'meta[property="og:title"]', attrs: { content: title } },
      { selector: 'meta[property="og:description"]', attrs: { content: description } },
      { selector: 'meta[property="og:image"]', attrs: { content: image } },
      { selector: 'meta[property="og:url"]', attrs: { content: url } },
      { selector: 'meta[property="og:type"]', attrs: { content: 'website' } },
      { selector: 'meta[name="twitter:card"]', attrs: { content: 'summary_large_image' } },
      { selector: 'meta[name="twitter:title"]', attrs: { content: title } },
      { selector: 'meta[name="twitter:description"]', attrs: { content: description } },
      { selector: 'meta[name="twitter:image"]', attrs: { content: image } },
    ];

    const prevTitles: string[] = [];
    const prevContents: Array<{ el: Element; content: string }> = [];

    for (const update of updates) {
      if (update.selector === 'title') {
        const el = document.querySelector('title');
        if (el) {
          prevTitles.push(el.textContent || '');
          el.textContent = title;
        }
      } else {
        const el = document.querySelector(update.selector);
        if (el) {
          prevContents.push({ el, content: el.getAttribute('content') || '' });
          for (const [attr, val] of Object.entries(update.attrs)) {
            el.setAttribute(attr, val);
          }
        }
      }
    }

    return () => {
      for (let i = 0; i < prevTitles.length; i++) {
        const el = document.querySelector('title');
        if (el) el.textContent = prevTitles[i];
      }
      for (const { el, content } of prevContents) {
        if (content) {
          el.setAttribute('content', content);
        }
      }
    };
  }, [tags]);
}
