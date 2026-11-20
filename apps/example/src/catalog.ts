/**
 * Every design tabcn ships: the 20 tab bars of the reference set, in its order, then the
 * designs added after it (tab bars, then panels).
 * `ref` is the reference image number (see references/README.md), or 0 for a design that
 * isn't from the reference set; galleries show no number for those.
 * `kind` tells tab bars (passed to `tabBar()`) from panels (drawn behind a bar, under a
 * `TabBarProvider`; their layout is always 'panel').
 * Ids are working names; they become the registry ids users pass to `add`.
 */

export type Layout =
  | 'floating-pill'
  | 'pill-with-action'
  | 'docked-bar'
  | 'chip-rail'
  | 'floating-buttons'
  | 'center-action'
  | 'side-rail'
  | 'panel';

export type DesignStatus = 'planned' | 'in-progress' | 'ready';

export type DesignKind = 'bar' | 'panel';

export interface DesignEntry {
  id: string;
  /** Reference image number, or 0 when the design isn't from the reference set. */
  ref: number;
  title: string;
  kind: DesignKind;
  layout: Layout;
  summary: string;
  status: DesignStatus;
}

export const LAYOUT_LABELS: Record<Layout, string> = {
  'floating-pill': 'Floating pill',
  'pill-with-action': 'Pill + action button',
  'docked-bar': 'Docked bar',
  'chip-rail': 'Chip rail',
  'floating-buttons': 'Floating buttons',
  'center-action': 'Center action',
  'side-rail': 'Side rail',
  panel: 'Panel',
};

export const catalog: DesignEntry[] = [
  {
    id: 'glass-expand',
    ref: 1,
    title: 'Glass Expand',
    kind: 'bar',
    layout: 'floating-pill',
    summary:
      'Near-white glass pill with icon-only tabs; a flat grey capsule glides behind the active icon (Liquid Glass on iOS 26).',
    status: 'ready',
  },
  {
    id: 'top-notch',
    ref: 2,
    title: 'Top Notch',
    kind: 'bar',
    layout: 'docked-bar',
    summary: 'Rounded card with icons and labels; a short bar slides along the top edge.',
    status: 'ready',
  },
  {
    id: 'chip-rail',
    ref: 3,
    title: 'Chip Rail',
    kind: 'bar',
    layout: 'chip-rail',
    summary: 'Dark docked bar with an avatar and text-only chips that scroll sideways.',
    status: 'ready',
  },
  {
    id: 'sticker-tiles',
    ref: 4,
    title: 'Sticker Tiles',
    kind: 'bar',
    layout: 'docked-bar',
    summary:
      'Illustrated icons with labels; the active tab sits on a lighter tile, with a dot badge.',
    status: 'ready',
  },
  {
    id: 'segment-search',
    ref: 5,
    title: 'Segment + Search',
    kind: 'bar',
    layout: 'pill-with-action',
    summary: 'Two-tab text segment control beside a separate round search button.',
    status: 'ready',
  },
  {
    id: 'pill-plus',
    ref: 6,
    title: 'Pill + Plus',
    kind: 'bar',
    layout: 'pill-with-action',
    summary: 'White icon-only capsule with an avatar tab and a grey plus action at its end.',
    status: 'ready',
  },
  {
    id: 'solid-dark',
    ref: 7,
    title: 'Solid Dark',
    kind: 'bar',
    layout: 'docked-bar',
    summary:
      'Black bar, icons only; the active filled icon fades in over its outline, with a center create icon.',
    status: 'ready',
  },
  {
    id: 'outline-dark',
    ref: 8,
    title: 'Outline Dark',
    kind: 'bar',
    layout: 'docked-bar',
    summary:
      'Docked, icon-only black bar from Blank Spaces: grey outline glyphs, the active one crossfades to a white filled glyph.',
    status: 'ready',
  },
  {
    id: 'orbs',
    ref: 9,
    title: 'Orbs',
    kind: 'bar',
    layout: 'floating-buttons',
    summary:
      'Separate floating glass circles with live content and badges; the center one is larger, and the active one brightens.',
    status: 'ready',
  },
  {
    id: 'center-cta',
    ref: 10,
    title: 'Center CTA',
    kind: 'bar',
    layout: 'center-action',
    summary: 'Dark bar with a wide text button in the middle and image tabs on each side.',
    status: 'ready',
  },
  {
    id: 'soft-pill',
    ref: 11,
    title: 'Soft Pill',
    kind: 'bar',
    layout: 'floating-pill',
    summary: 'Light pill with icons and labels; a grey capsule glides to the active tab.',
    status: 'ready',
  },
  {
    id: 'dark-capsule',
    ref: 12,
    title: 'Dark Capsule',
    kind: 'bar',
    layout: 'docked-bar',
    summary: 'Dark bar, icons only, an outlined capsule behind the active tab and an avatar tab.',
    status: 'ready',
  },
  {
    id: 'gradient-stickers',
    ref: 13,
    title: 'Gradient Stickers',
    kind: 'bar',
    layout: 'floating-pill',
    summary: 'Gradient pill with sticker-style icons; the active one sits in a soft circle.',
    status: 'ready',
  },
  {
    id: 'light-icons',
    ref: 14,
    title: 'Dark Icons',
    kind: 'bar',
    layout: 'docked-bar',
    summary:
      'Icons straight on a near-black screen, no labels; grey outlines turn white, and the record tab is drawn larger.',
    status: 'ready',
  },
  {
    id: 'playful-tiles',
    ref: 15,
    title: 'Playful Tiles',
    kind: 'bar',
    layout: 'docked-bar',
    summary: 'White bar with colourful icons; the active tab gets a bordered tile.',
    status: 'ready',
  },
  {
    id: 'sliding-capsule',
    ref: 16,
    title: 'Sliding Capsule',
    kind: 'bar',
    layout: 'floating-pill',
    summary:
      "Wise's near-white glass pill (Liquid Glass on iOS 26) with green outline icons and labels; a grey capsule glides to the active tab.",
    status: 'ready',
  },
  {
    id: 'labeled-plus',
    ref: 17,
    title: 'Labeled + Plus',
    kind: 'bar',
    layout: 'pill-with-action',
    summary:
      'iOS 26-style glass pill with labelled tabs and a gliding grey capsule, beside a round glass plus button that runs an action (Liquid Glass, blur fallback).',
    status: 'ready',
  },
  {
    id: 'frosted-media',
    ref: 18,
    title: 'Frosted Media',
    kind: 'bar',
    layout: 'floating-pill',
    summary: 'Blurred see-through pill over content; the active tab gets a raised glass capsule.',
    status: 'ready',
  },
  {
    id: 'glow-glass',
    ref: 19,
    title: 'Glow Glass',
    kind: 'bar',
    layout: 'pill-with-action',
    summary:
      'Dark glass pill with a coloured glow behind the active tab and a separate action button.',
    status: 'ready',
  },
  {
    id: 'mono-type',
    ref: 20,
    title: 'Mono Type',
    kind: 'bar',
    layout: 'docked-bar',
    summary:
      'White bar with line icons and uppercase monospace labels; the active tab takes the accent colour.',
    status: 'ready',
  },
  {
    id: 'split-search',
    ref: 0,
    title: 'Split Search',
    kind: 'bar',
    layout: 'pill-with-action',
    summary:
      'iOS 26 Liquid Glass pill of labelled tabs with Search as a separate round glass tab; minimizes to the active icon on scroll, and a tap expands it.',
    status: 'ready',
  },
  {
    id: 'material-pill',
    ref: 0,
    title: 'Material Pill',
    kind: 'bar',
    layout: 'docked-bar',
    summary:
      'Material 3 navigation bar: flat docked bar with labels always shown; a pill grows sideways out of the active icon while it fills in.',
    status: 'ready',
  },
  {
    id: 'side-rail',
    ref: 0,
    title: 'Side Rail',
    kind: 'bar',
    layout: 'side-rail',
    summary:
      'Material 3 navigation rail on the left edge for tablets, with labelled icons and a light-blue pill gliding to the active one; a docked bottom bar on phones.',
    status: 'ready',
  },
  {
    id: 'mini-player',
    ref: 0,
    title: 'Mini Player',
    kind: 'panel',
    layout: 'panel',
    summary:
      'Dark glass now-playing strip that peeks out from behind the bar; drag or tap it open into a large-artwork player with progress and previous/play/next.',
    status: 'ready',
  },
  {
    id: 'context-tray',
    ref: 0,
    title: 'Context Tray',
    kind: 'panel',
    layout: 'panel',
    summary:
      "A screen's own controls in the bar's place: a progress pill and a round close button crossfade in over the tabs while the screen is focused.",
    status: 'ready',
  },
  {
    id: 'quick-create',
    ref: 0,
    title: 'Quick Create',
    kind: 'panel',
    layout: 'panel',
    summary:
      "A create menu that slides up from behind the bar's + button: icon-and-label actions in a column as wide as the button; choosing one runs it and closes the menu.",
    status: 'ready',
  },
];

export function findDesign(id: string): DesignEntry | undefined {
  return catalog.find((d) => d.id === id);
}
