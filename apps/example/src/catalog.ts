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
  | 'sheet'
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
  sheet: 'Sheet',
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
    id: 'search-dock',
    ref: 0,
    title: 'Search Dock',
    kind: 'bar',
    layout: 'floating-buttons',
    summary:
      'Three separate white rounded tiles over the feed: Home, a search field that fills the row, and a Profile avatar. The glyphs crossfade, and the dock slides away on scroll.',
    status: 'ready',
  },
  {
    id: 'button-row',
    ref: 0,
    title: 'Button Row',
    kind: 'bar',
    layout: 'floating-buttons',
    summary:
      'No bar: separate white buttons float in a row (circle, circle, a wide Search pill, circle, circle) over a white fade; the active icon turns from a grey outline to filled black.',
    status: 'ready',
  },
  {
    id: 'color-flood',
    ref: 0,
    title: 'Colour Flood',
    kind: 'bar',
    layout: 'docked-bar',
    summary:
      'Icon-only docked bar with no surface of its own; a tab floods the screen and bar with its colour (Cash green on Pay), and the colours crossfade.',
    status: 'ready',
  },
  {
    id: 'accent-dark',
    ref: 0,
    title: 'Accent Dark',
    kind: 'bar',
    layout: 'docked-bar',
    summary:
      'Flat charcoal docked bar under a dark hairline, with white icons and labels; the active tab turns orange and its outline icon fills in, with no indicator.',
    status: 'ready',
  },
  {
    id: 'tile-plus',
    ref: 0,
    title: 'Tile Plus',
    kind: 'bar',
    layout: 'center-action',
    summary:
      'Plain white docked bar with icon-only tabs that turn from grey outlines to black filled glyphs, and a grey plus on a permanent light-grey rounded tile in the middle that runs an action.',
    status: 'ready',
  },
  {
    id: 'offset-plus',
    ref: 0,
    title: 'Offset Plus',
    kind: 'bar',
    layout: 'center-action',
    summary:
      'Solid black docked bar with outline icons over small labels that fill and turn white when active; the centre create button is a white rounded rectangle over cyan and red copies offset left and right.',
    status: 'ready',
  },
  {
    id: 'tinted-icons',
    ref: 0,
    title: 'Tinted Icons',
    kind: 'bar',
    layout: 'docked-bar',
    summary:
      'Flat black bar of outline icons, each tab with its own colour; a small triangle slides under the active one.',
    status: 'ready',
  },
  {
    id: 'badge-dock',
    ref: 0,
    title: 'Badge Dock',
    kind: 'bar',
    layout: 'docked-bar',
    summary:
      'Dark docked bar with five labelled tabs; outline grey icons turn solid white when active, with coral-red count badges and a dot badge over the icons.',
    status: 'ready',
  },
  {
    id: 'cart-pill',
    ref: 0,
    title: 'Cart Pill',
    kind: 'bar',
    layout: 'pill-with-action',
    summary:
      "Shop's frosted pill of filled icons with a sliding white capsule, centred between an optional back button and a purple cart button with the count cut out of the basket; soft bottom-edge blur (Liquid Glass, blur fallback).",
    status: 'ready',
  },
  {
    id: 'glass-badges',
    ref: 0,
    title: 'Glass Badges',
    kind: 'bar',
    layout: 'pill-with-action',
    summary:
      "Telegram's iOS 26 glass pill of labelled tabs with red count badges ringed into the glass; a grey capsule slides to the active tab, beside a round glass search button (Liquid Glass, blur fallback).",
    status: 'ready',
  },
  {
    id: 'section-sheet',
    ref: 0,
    title: 'Section Sheet',
    kind: 'bar',
    layout: 'sheet',
    summary:
      'No tab bar: one sheet rests over full-screen content with the sections in its header; drag it to half or full, and switching sections keeps its height.',
    status: 'ready',
  },
  {
    id: 'scrub-pill',
    ref: 0,
    title: 'Scrub Pill',
    kind: 'bar',
    layout: 'floating-pill',
    summary:
      'Light pill with a tinted lens behind the active tab; press and slide along the bar to scrub through tabs, with a haptic per tab, and lift to choose.',
    status: 'ready',
  },
  {
    id: 'composer-dock',
    ref: 0,
    title: 'Composer Dock',
    kind: 'bar',
    layout: 'docked-bar',
    summary:
      'A chat composer over four icon tabs on the screen colour: scrub the tabs with a dark name pill over the finger, hold one for a card of its recent items, and the composer opens into a card that rides the keyboard.',
    status: 'ready',
  },
  {
    id: 'live-tabs',
    ref: 0,
    title: 'Live Tabs',
    kind: 'bar',
    layout: 'docked-bar',
    summary:
      'Docked bar whose tabs show live state: a ring fills around the icon while something is in progress, and a countdown or now-playing line replaces the label.',
    status: 'ready',
  },
  {
    id: 'account-dock',
    ref: 0,
    title: 'Account Dock',
    kind: 'bar',
    layout: 'pill-with-action',
    summary:
      'A pill of tabs with an account chip: tapping the chip folds the tabs into an account bar, and a sheet rises to switch workspace or account and set a status.',
    status: 'ready',
  },
  {
    id: 'ambient-bar',
    ref: 0,
    title: 'Ambient Bar',
    kind: 'bar',
    layout: 'docked-bar',
    summary:
      'A bar with no colour of its own: a deep blur of the screen scrolling behind it, so content’s colours glow through, and a lens that brightens what is under the active tab.',
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
  {
    id: 'bar-sheet',
    ref: 0,
    title: 'Bar Sheet',
    kind: 'panel',
    layout: 'panel',
    summary:
      'A comments sheet that rises from the bottom edge, passing behind the bar, to 60%; drag the header to full height, where the body scrolls.',
    status: 'ready',
  },
  {
    id: 'filter-chips',
    ref: 0,
    title: 'Filter Chips',
    kind: 'panel',
    layout: 'panel',
    summary:
      'A dark strip of filter chips that peeks out from behind the bar; tapping a chip grows the strip into a card of options, and Apply folds the choice back into the chip.',
    status: 'ready',
  },
  {
    id: 'companion-chip',
    ref: 0,
    title: 'Companion Chip',
    kind: 'panel',
    layout: 'panel',
    summary:
      "A frosted locate button, search pill or '32 views' chip that sits above the bar's end and moves with it.",
    status: 'ready',
  },
  {
    id: 'sub-tabs',
    ref: 0,
    title: 'Sub-Tabs',
    kind: 'panel',
    layout: 'panel',
    summary:
      'Long-press a tab and its sub-tabs slide up from behind it; choosing one closes the drawer.',
    status: 'ready',
  },
  {
    id: 'slider-sheet',
    ref: 0,
    title: 'Slider Sheet',
    kind: 'panel',
    layout: 'panel',
    summary:
      'A dark card above the bar for choosing how much: drag the chip and it becomes a knob with a live percentage bubble, the amount updates as you go, and it snaps to the nearest quarter.',
    status: 'ready',
  },
];

export function findDesign(id: string): DesignEntry | undefined {
  return catalog.find((d) => d.id === id);
}
