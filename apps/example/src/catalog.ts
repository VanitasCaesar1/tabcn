/**
 * The 20 tab bar designs tabcn plans to ship, in the order of the reference set.
 * `ref` is the reference image number (see references/README.md).
 * Ids are working names; they become the registry ids users pass to `add`.
 */

export type Layout =
  | 'floating-pill'
  | 'pill-with-action'
  | 'docked-bar'
  | 'chip-rail'
  | 'floating-buttons'
  | 'center-action';

export type DesignStatus = 'planned' | 'in-progress' | 'ready';

export interface DesignEntry {
  id: string;
  ref: number;
  title: string;
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
};

export const catalog: DesignEntry[] = [
  {
    id: 'glass-expand',
    ref: 1,
    title: 'Glass Expand',
    layout: 'floating-pill',
    summary: 'Frosted pill; the active tab grows into a glass capsule that shows its label.',
    status: 'ready',
  },
  {
    id: 'top-notch',
    ref: 2,
    title: 'Top Notch',
    layout: 'docked-bar',
    summary: 'Rounded card with icons and labels; a short bar slides along the top edge.',
    status: 'ready',
  },
  {
    id: 'chip-rail',
    ref: 3,
    title: 'Chip Rail',
    layout: 'chip-rail',
    summary: 'Dark rail with an avatar and text-only chips that scroll sideways.',
    status: 'planned',
  },
  {
    id: 'sticker-tiles',
    ref: 4,
    title: 'Sticker Tiles',
    layout: 'docked-bar',
    summary:
      'Illustrated icons with labels; the active tab sits on a lighter tile, with a dot badge.',
    status: 'planned',
  },
  {
    id: 'segment-search',
    ref: 5,
    title: 'Segment + Search',
    layout: 'pill-with-action',
    summary: 'Two-tab text segment control beside a separate round search button.',
    status: 'ready',
  },
  {
    id: 'pill-plus',
    ref: 6,
    title: 'Pill + Plus',
    layout: 'pill-with-action',
    summary: 'White icon-only pill with an avatar tab and a separate plus button.',
    status: 'planned',
  },
  {
    id: 'solid-dark',
    ref: 7,
    title: 'Solid Dark',
    layout: 'docked-bar',
    summary: 'Black bar, icons only, filled icon for the active tab and a center create icon.',
    status: 'ready',
  },
  {
    id: 'outline-dark',
    ref: 8,
    title: 'Outline Dark',
    layout: 'docked-bar',
    summary: 'Black bar with outline icons; the active icon brightens.',
    status: 'ready',
  },
  {
    id: 'orbs',
    ref: 9,
    title: 'Orbs',
    layout: 'floating-buttons',
    summary: 'Separate floating circles with live content and badges; the center one is larger.',
    status: 'planned',
  },
  {
    id: 'center-cta',
    ref: 10,
    title: 'Center CTA',
    layout: 'center-action',
    summary: 'Dark bar with a wide text button in the middle and image tabs on each side.',
    status: 'planned',
  },
  {
    id: 'soft-pill',
    ref: 11,
    title: 'Soft Pill',
    layout: 'floating-pill',
    summary: 'Light pill with icons and labels; a grey capsule marks the active tab.',
    status: 'ready',
  },
  {
    id: 'dark-capsule',
    ref: 12,
    title: 'Dark Capsule',
    layout: 'docked-bar',
    summary: 'Dark bar, icons only, an outlined capsule behind the active tab and an avatar tab.',
    status: 'ready',
  },
  {
    id: 'gradient-stickers',
    ref: 13,
    title: 'Gradient Stickers',
    layout: 'floating-pill',
    summary: 'Gradient pill with sticker-style icons; the active one sits in a soft circle.',
    status: 'ready',
  },
  {
    id: 'light-icons',
    ref: 14,
    title: 'Light Icons',
    layout: 'docked-bar',
    summary: 'Light grey bar, icons only; the active icon switches to its filled version.',
    status: 'ready',
  },
  {
    id: 'playful-tiles',
    ref: 15,
    title: 'Playful Tiles',
    layout: 'docked-bar',
    summary: 'White bar with colourful icons; the active tab gets a bordered tile.',
    status: 'ready',
  },
  {
    id: 'sliding-capsule',
    ref: 16,
    title: 'Sliding Capsule',
    layout: 'floating-pill',
    summary: 'White pill with icons and labels; a grey capsule slides to the active tab.',
    status: 'ready',
  },
  {
    id: 'labeled-plus',
    ref: 17,
    title: 'Labeled + Plus',
    layout: 'pill-with-action',
    summary: 'Labelled pill with a sliding capsule beside a separate plus button.',
    status: 'ready',
  },
  {
    id: 'frosted-media',
    ref: 18,
    title: 'Frosted Media',
    layout: 'floating-pill',
    summary: 'Blurred see-through pill over content; the active tab gets a raised glass capsule.',
    status: 'ready',
  },
  {
    id: 'glow-glass',
    ref: 19,
    title: 'Glow Glass',
    layout: 'pill-with-action',
    summary:
      'Dark glass pill with a coloured glow behind the active tab and a separate action button.',
    status: 'ready',
  },
  {
    id: 'mono-type',
    ref: 20,
    title: 'Mono Type',
    layout: 'docked-bar',
    summary:
      'White bar with line icons and uppercase monospace labels; the active tab takes the accent colour.',
    status: 'ready',
  },
];

export function findDesign(id: string): DesignEntry | undefined {
  return catalog.find((d) => d.id === id);
}
