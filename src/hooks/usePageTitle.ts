import { useEffect } from 'react';

const APP_NAME = 'FLCHRMS';

/**
 * Sets the document title for the current page.
 * Automatically cleans up when the component unmounts.
 *
 * @example usePageTitle('Dashboard');  // => "Dashboard — FLCHRMS"
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} — ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
