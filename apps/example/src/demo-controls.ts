/**
 * Which optional Customize controls each design supports, and the design prop each one sets
 * (docs/designs/site-redesign.md, Part 3). Plain data with no React Native imports: the site reads
 * it to show only controls that work, and demos.tsx reads it to pass the chosen values on.
 * Tab count, light/dark, theme and right to left apply to every design and are not listed here.
 */
export interface DemoControls {
  /**
   * The prop the accent colour sets (for example `activeColor`), or `colors.<key>` for a key of
   * the design's `colors` prop (for example `colors.active`), which is where most designs keep it.
   */
  accent?: string;
  /** The prop that turns labels on or off, and the value that means "on". */
  labels?: { prop: string; on: unknown; off: unknown };
  /** Fewest tabs the design looks right with (default 2). */
  minTabs?: number;
  /** The demo's own tab count, the most the tab-count control offers. */
  maxTabs?: number;
}

/**
 * Every design's controls. `accent` is listed only where one colour clearly marks the active tab
 * and the demo passes the design straight to the tab bar; `minTabs` where the demo's feature sits
 * on a later tab (Sub-Tabs' Library, Context Tray's Plan, Glass Badges' Chats, Live Tabs' Timer
 * and Downloads), or needs the bar's full width (Selection Toolbar's labels fill Soft Pill's five
 * tabs).
 */
export const DEMO_CONTROLS: Record<string, DemoControls> = {
  'accent-dark': { accent: 'colors.accent', maxTabs: 4 },
  'account-dock': { maxTabs: 3 },
  'ambient-bar': { maxTabs: 5 },
  'badge-dock': { accent: 'colors.active', maxTabs: 4 },
  'bar-sheet': { maxTabs: 5 },
  'button-row': { accent: 'colors.active', maxTabs: 5 },
  'cart-pill': { maxTabs: 4 },
  'center-cta': { maxTabs: 2 },
  'chip-rail': { accent: 'colors.active', maxTabs: 5 },
  'color-flood': { accent: 'colors.active', maxTabs: 3 },
  'companion-chip': { maxTabs: 5 },
  'composer-dock': { maxTabs: 4 },
  'context-tray': { minTabs: 3, maxTabs: 4 },
  'dark-capsule': { accent: 'colors.active', maxTabs: 5 },
  'filter-chips': { maxTabs: 5 },
  'frosted-media': { maxTabs: 3 },
  'glass-badges': { minTabs: 3, maxTabs: 4 },
  'glass-expand': { maxTabs: 4 },
  'glow-glass': { maxTabs: 4 },
  'gradient-stickers': { maxTabs: 5 },
  'ink-underline': { accent: 'colors.ink', maxTabs: 4 },
  'labeled-plus': { maxTabs: 2 },
  'light-icons': { accent: 'colors.active', maxTabs: 5 },
  'live-tabs': { accent: 'colors.accent', minTabs: 3, maxTabs: 4 },
  'material-pill': { maxTabs: 3 },
  'mini-player': { maxTabs: 5 },
  'mono-type': { accent: 'colors.accent', maxTabs: 5 },
  'offset-plus': { maxTabs: 4 },
  orbs: { maxTabs: 3 },
  'outline-dark': { maxTabs: 3 },
  'pill-plus': { accent: 'colors.active', maxTabs: 3 },
  'playful-tiles': { maxTabs: 6 },
  'quick-create': { maxTabs: 2 },
  'scrub-pill': { accent: 'colors.accent', maxTabs: 5 },
  'search-dock': { accent: 'colors.active', maxTabs: 3 },
  'section-sheet': { maxTabs: 3 },
  'segment-search': { maxTabs: 2 },
  'selection-toolbar': { minTabs: 5, maxTabs: 5 },
  'side-rail': { maxTabs: 4 },
  'slider-sheet': { maxTabs: 5 },
  'sliding-capsule': { maxTabs: 4 },
  'soft-pill': { maxTabs: 5 },
  'solid-dark': { accent: 'colors.active', maxTabs: 5 },
  'split-search': { accent: 'colors.active', maxTabs: 5 },
  'sticker-tiles': { maxTabs: 6 },
  'sub-tabs': { minTabs: 3, maxTabs: 5 },
  'thumb-arc': { accent: 'colors.accent', maxTabs: 5 },
  'tile-plus': { maxTabs: 4 },
  'tinted-icons': { maxTabs: 5 },
  'top-notch': { accent: 'colors.active', maxTabs: 5 },
};
