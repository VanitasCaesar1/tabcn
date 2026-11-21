'use client';

import { useSyncExternalStore } from 'react';

// The catalogue keeps its group (?c=) and view (?view=list) in the URL, so a filtered view can be
// shared. replaceState fires no event of its own, so changing the URL announces it.
const URL_EVENT = 'tabcn-catalogue';

function subscribeUrl(onChange: () => void) {
  window.addEventListener(URL_EVENT, onChange);
  window.addEventListener('popstate', onChange);
  return () => {
    window.removeEventListener(URL_EVENT, onChange);
    window.removeEventListener('popstate', onChange);
  };
}

/** A search param, or null; null on the server and during hydration too. */
export function useParam(key: string) {
  return useSyncExternalStore(
    subscribeUrl,
    () => new URLSearchParams(location.search).get(key),
    () => null,
  );
}

export function setParam(key: string, value: string | null) {
  const url = new URL(location.href);
  if (value === null) url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  history.replaceState(history.state, '', url);
  window.dispatchEvent(new Event(URL_EVENT));
}
