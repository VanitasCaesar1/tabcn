// One place for the facts the layout, metadata and links repeat.
export const site = {
  url: 'https://vanitascaesar1.github.io/tabcn',
  name: 'tabcn',
  tagline: 'Animated tab bars for React Native and Expo',
  description:
    'Twenty animated tab bars for React Native and Expo. Install a small foundation package, copy in a design with the shadcn CLI, and make it yours.',
  repo: 'https://github.com/VanitasCaesar1/tabcn',
  locale: 'en_US',
} as const;

export function absoluteUrl(path = '/') {
  return `${site.url}${path.startsWith('/') ? path : `/${path}`}`;
}

export function designPath(id: string) {
  return `/designs/${id}/`;
}

export function sourceUrl(id: string) {
  return `${site.repo}/blob/main/registry/designs/${id}/${id}.tsx`;
}

export function registryUrl(id: string) {
  return absoluteUrl(`/r/${id}.json`);
}
