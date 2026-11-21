// One place for the facts the layout, metadata and links repeat.
export const site = {
  url: 'https://vanitascaesar1.github.io/tabcn',
  name: 'tabcn',
  tagline: 'Animated tab bars for React Native and Expo',
  description:
    '36 animated tab bars and six panels for React Native and Expo. Install a small foundation package, copy in a design with the shadcn CLI, and make it yours.',
  repo: 'https://github.com/VanitasCaesar1/tabcn',
  /** The author's X handle, without the @. */
  x: 'phantommenace_x',
  locale: 'en_US',
} as const;

export function absoluteUrl(path = '/') {
  return `${site.url}${path.startsWith('/') ? path : `/${path}`}`;
}

export function designPath(id: string) {
  return `/designs/${id}/`;
}

/** The catalogue on the home page, showing one group. */
export function groupPath(id: string) {
  return `/?c=${id}#designs`;
}

/** Below this many stars the header's GitHub button shows no count. */
export const STAR_FLOOR = 10;

export function sourceUrl(id: string) {
  return `${site.repo}/blob/main/registry/designs/${id}/${id}.tsx`;
}

export function registryUrl(id: string) {
  return absoluteUrl(`/r/${id}.json`);
}
