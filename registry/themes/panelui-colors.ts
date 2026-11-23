/**
 * PanelUI colours for tabcn designs: every design's `colors`, read from the PanelUI theme the
 * app is running, so the tab bar changes with Panel, Moon and Grass, light and dark.
 *
 * ```tsx
 * import { usePanelUIColors } from '@/components/tabcn/panelui-colors';
 *
 * <SoftPill colors={usePanelUIColors('soft-pill')} />
 * ```
 *
 * Needs PanelUI's theme in the app (`@import 'panelui-native/theme.css'` in global.css, and
 * Uniwind in metro.config.js): https://panelui.dev/docs/customization/theming. Tokens are read
 * with Uniwind's `useCSSVariable`, so the colours update on every theme switch.
 *
 * Each design maps its colour slots to PanelUI's semantic tokens below. A slot left out keeps
 * the design's own colour (brand marks, colours drawn over photos), and so does a slot whose
 * token the theme doesn't define. Change a mapping here to suit the app: this file is yours.
 *
 * tabcn is independent of PanelUI and not affiliated with it.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { useRef } from 'react';
import { useCSSVariable } from 'uniwind';

/** PanelUI's semantic colour tokens (`--color-<token>`) that the maps below use. */
export type PanelUIToken =
  | 'background'
  | 'foreground'
  | 'card'
  | 'card-foreground'
  | 'popover'
  | 'popover-foreground'
  | 'overlay'
  | 'overlay-foreground'
  | 'primary'
  | 'primary-foreground'
  | 'secondary'
  | 'muted'
  | 'muted-foreground'
  | 'accent'
  | 'destructive'
  | 'destructive-solid-foreground'
  | 'info'
  | 'info-soft'
  | 'border'
  | 'input'
  | 'surface'
  | 'surface-secondary'
  | 'surface-tertiary';

/** A token, or a token at an opacity (multiplied with the token's own alpha). */
export type PanelUISlot = PanelUIToken | readonly [PanelUIToken, number];

/** Badges in PanelUI's solid destructive style. */
const badge = { badge: 'destructive', badgeText: 'destructive-solid-foreground' } as const;

/**
 * Colour slot → PanelUI token, per design. Frosted Media, Segment Search and Center CTA are
 * left out: they draw white over photos or a fixed gradient, so their colours are the design.
 * Ambient Bar too: its colours are the glows the app gives each tab.
 */
export const panelUIColorMaps = {
  'account-dock': {
    surface: ['card', 0.97],
    sheet: 'popover',
    border: 'border',
    capsule: 'secondary',
    foreground: 'card-foreground',
    muted: 'muted-foreground',
    accent: 'primary',
    ...badge,
  },
  'accent-dark': {
    background: 'background',
    hairline: 'border',
    accent: 'primary',
    foreground: 'muted-foreground',
    ...badge,
  },
  'badge-dock': {
    background: 'background',
    hairline: 'border',
    active: 'foreground',
    inactive: 'muted-foreground',
    dot: 'destructive',
    ...badge,
  },
  'bar-sheet': {
    surface: 'popover',
    border: 'border',
    grabber: ['muted-foreground', 0.35],
    foreground: 'popover-foreground',
    muted: 'muted-foreground',
  },
  'button-row': {
    background: 'card',
    border: 'input',
    foreground: 'muted-foreground',
    active: 'foreground',
    scrim: 'background',
    badge: 'primary',
    badgeText: 'primary-foreground',
  },
  'cart-pill': {
    background: ['card', 0.78],
    fallback: 'surface',
    glassTint: ['card', 0.7],
    rim: 'border',
    capsule: 'card',
    active: 'foreground',
    inactive: 'muted-foreground',
    chevron: 'foreground',
    cart: 'primary',
    cartGlyph: 'primary-foreground',
    badge: 'primary',
    badgeText: 'primary-foreground',
  },
  'chip-rail': {
    background: 'background',
    chip: 'secondary',
    chipBorder: 'border',
    active: 'primary',
    activeText: 'primary-foreground',
    text: 'muted-foreground',
  },
  'color-flood': {
    background: 'background',
    active: 'foreground',
    inactive: 'muted-foreground',
    ...badge,
  },
  'companion-chip': {
    surface: ['card', 0.78],
    pressed: 'surface-secondary',
    border: 'border',
    foreground: 'card-foreground',
    accent: 'info',
  },
  'composer-dock': {
    background: 'background',
    glassTint: ['background', 0.72],
    composer: ['card', 0.6],
    border: 'border',
    foreground: 'foreground',
    muted: 'muted-foreground',
    placeholder: 'muted-foreground',
    control: 'secondary',
    dictate: 'muted-foreground',
    onForeground: 'background',
    menu: 'overlay',
    menuIcon: 'muted-foreground',
    menuPressed: 'accent',
    unread: 'info',
    scrim: ['background', 0.74],
    held: 'secondary',
    heldGlassTint: ['surface-tertiary', 0.6],
    label: 'primary',
    labelText: 'primary-foreground',
  },
  'context-tray': {
    surface: ['card', 0.94],
    border: 'border',
    foreground: 'card-foreground',
    muted: 'muted-foreground',
    track: 'muted',
    progress: 'primary',
    closePressed: 'surface-secondary',
  },
  'dark-capsule': {
    background: 'background',
    capsule: 'secondary',
    capsuleBorder: 'border',
    active: 'foreground',
    inactive: 'muted-foreground',
    badge: 'destructive',
  },
  'filter-chips': {
    surface: 'popover',
    control: 'secondary',
    divider: 'border',
    foreground: 'popover-foreground',
    muted: 'muted-foreground',
    accent: 'primary',
    onAccent: 'primary-foreground',
    chosen: ['primary', 0.14],
    backdrop: ['background', 0.3],
  },
  'glass-badges': {
    background: ['card', 0.72],
    solid: ['card', 0.92],
    rim: 'border',
    capsule: 'secondary',
    foreground: 'muted-foreground',
    active: 'primary',
    badgeRing: 'card',
    badgeRingActive: 'surface-tertiary',
    ...badge,
  },
  'glass-expand': {
    background: ['card', 0.7],
    shade: ['foreground', 0.035],
    sheen: ['card', 0.23],
    glassTint: ['card', 0.6],
    border: 'border',
    capsule: 'surface-tertiary',
    foreground: 'foreground',
  },
  'glow-glass': {
    background: ['card', 0.72],
    border: 'border',
    capsule: 'secondary',
    active: 'foreground',
    inactive: 'muted-foreground',
    inactiveIcon: 'muted-foreground',
  },
  'gradient-stickers': { badge: 'destructive' },
  'labeled-plus': {
    background: ['card', 0.86],
    glassTint: ['card', 0.78],
    border: 'border',
    capsule: 'secondary',
    foreground: 'foreground',
    inactive: 'muted-foreground',
    action: 'muted-foreground',
    badge: 'destructive',
  },
  'light-icons': {
    background: 'background',
    active: 'foreground',
    inactive: 'muted-foreground',
    badge: 'destructive',
  },
  'live-tabs': {
    background: 'background',
    border: 'border',
    foreground: 'foreground',
    muted: 'muted-foreground',
    accent: 'destructive',
    track: 'muted',
  },
  'material-pill': {
    background: 'surface',
    indicator: 'surface-tertiary',
    activeIcon: 'foreground',
    activeLabel: 'foreground',
    inactive: 'muted-foreground',
    pressed: 'accent',
    ...badge,
  },
  'mini-player': {
    background: ['popover', 0.94],
    border: 'border',
    foreground: 'popover-foreground',
    muted: 'muted-foreground',
    track: 'muted',
    artwork: 'surface-tertiary',
    control: 'primary',
    onControl: 'primary-foreground',
  },
  'mono-type': {
    background: 'background',
    rule: 'foreground',
    accent: 'primary',
    foreground: 'muted-foreground',
    badge: 'destructive',
  },
  'offset-plus': {
    background: 'background',
    foreground: 'foreground',
    inactive: 'muted-foreground',
    actionFace: 'primary',
    actionGlyph: 'primary-foreground',
    ...badge,
  },
  orbs: { badge: 'destructive' },
  'outline-dark': {
    background: 'background',
    icon: 'foreground',
    inactive: 'muted-foreground',
    badge: 'destructive',
  },
  'pill-plus': {
    background: 'card',
    active: 'foreground',
    inactive: 'muted-foreground',
    plus: 'muted-foreground',
  },
  'playful-tiles': {
    background: 'background',
    tile: 'info-soft',
    tileBorder: 'info',
    badge: 'destructive',
  },
  'quick-create': {
    surface: ['overlay', 0.96],
    border: 'border',
    foreground: 'overlay-foreground',
    pressed: 'accent',
  },
  'scrub-pill': {
    background: ['card', 0.97],
    border: 'border',
    lens: 'secondary',
    accent: 'primary',
    muted: 'muted-foreground',
  },
  'search-dock': {
    tile: 'card',
    foreground: 'foreground',
    active: 'foreground',
    placeholder: 'muted-foreground',
    ...badge,
  },
  'section-sheet': {
    surface: 'popover',
    border: 'border',
    grabber: ['muted-foreground', 0.35],
    track: 'muted',
    thumb: 'overlay',
    foreground: 'popover-foreground',
    muted: 'muted-foreground',
  },
  'side-rail': {
    background: 'surface',
    indicator: 'surface-tertiary',
    activeIcon: 'foreground',
    activeLabel: 'foreground',
    inactive: 'muted-foreground',
    pressed: 'accent',
    action: 'primary',
    actionIcon: 'primary-foreground',
    ...badge,
  },
  'sliding-capsule': {
    background: 'surface',
    glassTint: ['surface', 0.55],
    capsule: 'surface-tertiary',
    foreground: 'foreground',
    rim: 'border',
    badge: 'destructive',
  },
  'soft-pill': {
    background: 'surface',
    capsule: 'surface-tertiary',
    foreground: 'foreground',
  },
  'solid-dark': {
    background: 'background',
    active: 'foreground',
    inactive: 'muted-foreground',
    ...badge,
  },
  'split-search': {
    background: ['card', 0.86],
    rim: 'border',
    capsule: 'secondary',
    foreground: 'muted-foreground',
    active: 'primary',
    ...badge,
  },
  'sticker-tiles': {
    background: 'primary',
    tile: ['primary-foreground', 0.33],
    label: 'primary-foreground',
    badge: 'destructive',
  },
  'sub-tabs': {
    surface: ['overlay', 0.97],
    border: 'border',
    foreground: 'overlay-foreground',
    pressed: 'accent',
  },
  'tile-plus': {
    background: 'background',
    foreground: 'foreground',
    inactive: 'muted-foreground',
    tile: 'surface-secondary',
    tilePressed: 'surface-tertiary',
    action: 'muted-foreground',
    ...badge,
  },
  'tinted-icons': {
    background: 'background',
    inactive: 'muted-foreground',
    ...badge,
  },
  'top-notch': {
    background: 'surface',
    active: 'primary',
    inactive: 'muted-foreground',
    badge: 'destructive',
  },
} as const satisfies Record<string, Record<string, PanelUISlot>>;

/** A design with a PanelUI mapping. */
export type PanelUIDesign = keyof typeof panelUIColorMaps;

/** The colours `usePanelUIColors` returns for a design: pass them as its `colors`. */
export type PanelUIColors<D extends PanelUIDesign> = Partial<
  Record<keyof (typeof panelUIColorMaps)[D], string>
>;

/**
 * A design's `colors`, from the running PanelUI theme. Re-renders when the theme changes;
 * between changes it returns the same object, so the bar doesn't redraw for nothing.
 */
export function usePanelUIColors<D extends PanelUIDesign>(design: D): PanelUIColors<D> {
  const map: Record<string, PanelUISlot> = panelUIColorMaps[design];
  const slots = Object.keys(map);
  const values = useCSSVariable(
    slots.map((slot) => `--color-${tokenOf(map[slot] as PanelUISlot)}`),
  );
  const key = `${design}:${values.join('|')}`;
  const cache = useRef<{ key: string; colors: PanelUIColors<D> } | null>(null);
  if (cache.current?.key !== key) {
    const colors: Record<string, string> = {};
    slots.forEach((slot, i) => {
      const value = values[i];
      // An undefined slot would override the design's own colour, so leave it out.
      if (typeof value !== 'string' || value.trim() === '') return;
      const spec = map[slot] as PanelUISlot;
      colors[slot] = typeof spec === 'string' ? value.trim() : withAlpha(value.trim(), spec[1]);
    });
    cache.current = { key, colors: colors as PanelUIColors<D> };
  }
  return cache.current.colors;
}

function tokenOf(slot: PanelUISlot): PanelUIToken {
  return typeof slot === 'string' ? slot : slot[0];
}

/** `color` with its alpha multiplied by `alpha`. Hex and rgb()/rgba() only; else unchanged. */
export function withAlpha(color: string, alpha: number): string {
  let rgb: number[];
  let a = 1;
  const hex = /^#([0-9a-f]{3,8})$/i.exec(color)?.[1];
  if (hex && hex.length !== 5 && hex.length !== 7) {
    const full =
      hex.length <= 4
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex;
    rgb = [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16));
    if (full.length === 8) a = Number.parseInt(full.slice(6, 8), 16) / 255;
  } else {
    const fn = /^rgba?\(([^)]+)\)$/i.exec(color)?.[1];
    if (!fn) return color;
    const parts = fn.split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3 || parts.some((p) => p.endsWith('%'))) return color;
    rgb = parts.slice(0, 3).map(Number);
    if (parts[3] !== undefined) a = Number(parts[3]);
  }
  const out = Math.round(a * alpha * 1000) / 1000;
  return `rgba(${rgb.join(', ')}, ${out})`;
}
