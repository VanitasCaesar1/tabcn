// The docs pages, in reading order. The sidebar, the docs index and each page's previous/next
// links read this list.
export interface DocPage {
  /** Path under the site, with the trailing slash the static export uses. */
  href: string;
  title: string;
  description: string;
}

export const docs: readonly DocPage[] = [
  {
    href: '/docs/',
    title: 'Introduction',
    description:
      'What tabcn is, what it needs, and how to add your first tab bar to an Expo or React Native app.',
  },
  {
    href: '/docs/panelui/',
    title: 'Using with PanelUI',
    description:
      'Make every tabcn design follow a PanelUI theme: Panel, Moon and Grass, light and dark.',
  },
];

export function docNeighbours(href: string) {
  const i = docs.findIndex((page) => page.href === href);
  return { previous: docs[i - 1] ?? null, next: docs[i + 1] ?? null };
}
