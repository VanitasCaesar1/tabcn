// The docs pages, in reading order and grouped as the sidebar shows them. The sidebar, the
// phone menu and each page's previous/next links read this list.
export interface DocPage {
  /** Path under the site, with the trailing slash the static export uses. */
  href: string;
  title: string;
  description: string;
  group: DocGroup;
}

export type DocGroup = 'Getting started' | 'Guides';

export const docs: readonly DocPage[] = [
  {
    href: '/docs/',
    group: 'Getting started',
    title: 'Introduction',
    description:
      'What tabcn is, what it needs, and how to add your first tab bar to an Expo or React Native app.',
  },
  {
    href: '/docs/panelui/',
    group: 'Getting started',
    title: 'Using with PanelUI',
    description:
      'Make every tabcn design follow a PanelUI theme: Panel, Moon and Grass, light and dark.',
  },
  {
    href: '/docs/panels/',
    group: 'Guides',
    title: 'Panels',
    description:
      'Surfaces that live behind the tab bar and slide out of it: a mini player, a create menu, or a screen’s own controls in the bar’s place.',
  },
  {
    href: '/docs/sheets/',
    group: 'Guides',
    title: 'Sheets',
    description:
      'A panel with snap points rises from the bottom edge, behind the bar, and drags between them.',
  },
  {
    href: '/docs/minimize-on-scroll/',
    group: 'Guides',
    title: 'Minimize on scroll',
    description:
      'The bar shrinks while a screen scrolls down, as iOS 26’s tab bars do, and comes back when it scrolls up.',
  },
  {
    href: '/docs/companions/',
    group: 'Guides',
    title: 'Companions',
    description:
      'A small control against the bar, such as a locate button or a views chip, that moves with it.',
  },
  {
    href: '/docs/toasts/',
    group: 'Guides',
    title: 'Toasts',
    description: 'Keep toasts clear of the bar, a peeking panel and its companions.',
  },
  {
    href: '/docs/sub-tabs/',
    group: 'Guides',
    title: 'Sub-tabs',
    description: 'A drawer that slides up from behind one tab when it is held.',
  },
  {
    href: '/docs/sheet-navigation/',
    group: 'Guides',
    title: 'Sheet navigation',
    description:
      'One sheet over full-screen content, with the sections in its header, instead of a bar.',
  },
  {
    href: '/docs/scrubbing/',
    group: 'Guides',
    title: 'Scrubbing',
    description: 'Press and slide along the bar; lifting picks the tab under the finger.',
  },
  {
    href: '/docs/live-tabs/',
    group: 'Guides',
    title: 'Live tabs',
    description:
      'Show a tab’s live progress and a short status line, such as a timer or a download.',
  },
];

export const DOC_GROUPS: readonly DocGroup[] = ['Getting started', 'Guides'];

export function docNeighbours(href: string) {
  const i = docs.findIndex((page) => page.href === href);
  return { previous: docs[i - 1] ?? null, next: docs[i + 1] ?? null };
}

/** The guide that explains a design's feature, for a link from its page. */
const GUIDE_FOR: Record<string, string> = {
  'mini-player': '/docs/panels/',
  'context-tray': '/docs/panels/',
  'quick-create': '/docs/panels/',
  'bar-sheet': '/docs/sheets/',
  'split-search': '/docs/minimize-on-scroll/',
  'side-rail': '/docs/minimize-on-scroll/',
  'companion-chip': '/docs/companions/',
  'sub-tabs': '/docs/sub-tabs/',
  'section-sheet': '/docs/sheet-navigation/',
  'scrub-pill': '/docs/scrubbing/',
  'composer-dock': '/docs/scrubbing/',
  'live-tabs': '/docs/live-tabs/',
};

export function guideFor(designId: string): DocPage | null {
  const href = GUIDE_FOR[designId];
  return href ? (docs.find((page) => page.href === href) ?? null) : null;
}
