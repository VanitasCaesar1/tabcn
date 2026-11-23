/**
 * How the site and the showcase app sort and present the designs (docs/designs/site-redesign.md):
 * each design's look (`style`) and the app scene it is shown in (`scene`, `scheme`). Plain data with
 * no React Native imports, so the site's build can read it too.
 */

/** What a design looks like at a glance: the first filter on the site and the app's home. */
export type DesignStyle = 'glass' | 'minimal' | 'dark' | 'playful' | 'material';

export const STYLES: { id: DesignStyle; label: string; note: string }[] = [
  { id: 'glass', label: 'Glass', note: 'Liquid Glass, blur and see-through surfaces.' },
  { id: 'minimal', label: 'Minimal', note: 'Light, quiet bars that stay out of the way.' },
  { id: 'dark', label: 'Dark', note: 'Black and charcoal bars for dark apps.' },
  { id: 'playful', label: 'Playful', note: 'Colour, stickers and illustrated icons.' },
  { id: 'material', label: 'Material', note: 'Material 3 navigation for Android-first apps.' },
];

/** The app-like screen a design is shown in, and whether it uses the scene's light or dark palette. */
export type SceneName =
  | 'social'
  | 'music'
  | 'shop'
  | 'maps'
  | 'finance'
  | 'chat'
  | 'files'
  | 'health';
export type SceneScheme = 'light' | 'dark';

export interface DesignTags {
  style: DesignStyle;
  scene: SceneName;
  scheme: SceneScheme;
}

/** Every design in catalog.ts has an entry (the registry check fails otherwise). */
export const DESIGN_TAGS: Record<string, DesignTags> = {
  'glass-expand': { style: 'glass', scene: 'health', scheme: 'light' },
  'top-notch': { style: 'minimal', scene: 'music', scheme: 'light' },
  'chip-rail': { style: 'dark', scene: 'finance', scheme: 'dark' },
  'sticker-tiles': { style: 'playful', scene: 'social', scheme: 'light' },
  'segment-search': { style: 'minimal', scene: 'maps', scheme: 'light' },
  'pill-plus': { style: 'minimal', scene: 'maps', scheme: 'light' },
  'solid-dark': { style: 'dark', scene: 'social', scheme: 'dark' },
  'outline-dark': { style: 'dark', scene: 'files', scheme: 'dark' },
  orbs: { style: 'glass', scene: 'maps', scheme: 'light' },
  'center-cta': { style: 'dark', scene: 'maps', scheme: 'dark' },
  'soft-pill': { style: 'minimal', scene: 'social', scheme: 'light' },
  'dark-capsule': { style: 'dark', scene: 'social', scheme: 'dark' },
  'gradient-stickers': { style: 'playful', scene: 'social', scheme: 'light' },
  'light-icons': { style: 'dark', scene: 'maps', scheme: 'dark' },
  'playful-tiles': { style: 'playful', scene: 'social', scheme: 'light' },
  'sliding-capsule': { style: 'glass', scene: 'finance', scheme: 'light' },
  'labeled-plus': { style: 'glass', scene: 'social', scheme: 'light' },
  'frosted-media': { style: 'glass', scene: 'music', scheme: 'dark' },
  'glow-glass': { style: 'glass', scene: 'finance', scheme: 'dark' },
  'mono-type': { style: 'minimal', scene: 'health', scheme: 'light' },
  'split-search': { style: 'glass', scene: 'shop', scheme: 'light' },
  'material-pill': { style: 'material', scene: 'files', scheme: 'light' },
  'side-rail': { style: 'material', scene: 'files', scheme: 'light' },
  'search-dock': { style: 'minimal', scene: 'social', scheme: 'light' },
  'button-row': { style: 'minimal', scene: 'shop', scheme: 'light' },
  'color-flood': { style: 'playful', scene: 'finance', scheme: 'light' },
  'accent-dark': { style: 'dark', scene: 'maps', scheme: 'dark' },
  'tile-plus': { style: 'minimal', scene: 'social', scheme: 'light' },
  'offset-plus': { style: 'dark', scene: 'social', scheme: 'dark' },
  'tinted-icons': { style: 'dark', scene: 'social', scheme: 'light' },
  'badge-dock': { style: 'dark', scene: 'chat', scheme: 'dark' },
  'cart-pill': { style: 'minimal', scene: 'shop', scheme: 'light' },
  'glass-badges': { style: 'glass', scene: 'chat', scheme: 'light' },
  'section-sheet': { style: 'minimal', scene: 'maps', scheme: 'light' },
  'scrub-pill': { style: 'glass', scene: 'finance', scheme: 'light' },
  'composer-dock': { style: 'minimal', scene: 'chat', scheme: 'light' },
  'live-tabs': { style: 'minimal', scene: 'music', scheme: 'light' },
  'account-dock': { style: 'glass', scene: 'chat', scheme: 'light' },
  'ambient-bar': { style: 'glass', scene: 'finance', scheme: 'dark' },
  'mini-player': { style: 'glass', scene: 'music', scheme: 'dark' },
  'context-tray': { style: 'glass', scene: 'health', scheme: 'light' },
  'quick-create': { style: 'minimal', scene: 'social', scheme: 'light' },
  'bar-sheet': { style: 'minimal', scene: 'social', scheme: 'light' },
  'filter-chips': { style: 'dark', scene: 'shop', scheme: 'dark' },
  'companion-chip': { style: 'minimal', scene: 'shop', scheme: 'light' },
  'sub-tabs': { style: 'minimal', scene: 'music', scheme: 'light' },
  'slider-sheet': { style: 'dark', scene: 'finance', scheme: 'dark' },
};
