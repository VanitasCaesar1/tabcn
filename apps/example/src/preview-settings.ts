/**
 * What the site's Customize panel can change in a live preview (docs/designs/site-redesign.md, Part 3),
 * and the messages that carry it. Plain data with no React Native imports, so the site imports it too.
 *
 * Site -> preview iframe: `{ type: 'tabcn:settings', settings }` by same-origin postMessage, on every
 * change. Right to left is not a setting: the site reloads the iframe with `&rtl=1` (or without it).
 * Preview -> site: `{ type: 'tabcn:ready' }` once the design is on screen (embed.ts).
 */
export interface PreviewSettings {
  /** How many tabs to show: 2 up to the demo's own tab count. */
  tabs?: number;
  /** The scene's light or dark palette. */
  scheme?: 'light' | 'dark';
  /** A PanelUI theme family ('tabcn' is the design's own look). */
  theme?: string;
  /** Only for designs whose controls list `accent`. */
  accent?: string;
  /** Only for designs whose controls list `labels`. */
  labels?: boolean;
}

export const SETTINGS_MESSAGE = 'tabcn:settings';
