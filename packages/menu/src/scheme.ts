import { useThemeMode } from 'panelui-native/theme';
import { useCSSVariable } from 'uniwind';

/**
 * Light or dark for a colour: hex (`#rgb`, `#rrggbb`, `#rrggbbaa`) or `rgb()`/`rgba()`, by
 * relative luminance. `null` for anything else.
 */
export function schemeOf(color: unknown): 'light' | 'dark' | null {
  if (typeof color !== 'string') return null;
  const value = color.trim().toLowerCase();
  let rgb: number[] | null = null;
  const hex = value.match(/^#([0-9a-f]{3,8})$/)?.[1];
  if (hex && (hex.length === 3 || hex.length === 6 || hex.length === 8)) {
    const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex;
    rgb = [0, 2, 4].map((at) => Number.parseInt(full.slice(at, at + 2), 16));
  } else {
    const parts = value
      .match(/^rgba?\(([^)]+)\)$/)?.[1]
      ?.split(/[\s,/]+/)
      .filter(Boolean);
    if (parts && parts.length >= 3) rgb = parts.slice(0, 3).map(Number);
  }
  if (!rgb || rgb.some((channel) => !Number.isFinite(channel))) return null;
  const [r = 0, g = 0, b = 0] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.18 ? 'dark' : 'light';
}

/**
 * The scheme the native menus draw in, taken from PanelUI's menu surface (`--color-overlay`), the
 * colour the native menu stands in for. PanelUI's `useThemeMode` alone reports `light` for a theme
 * the app registers itself, which would put light glass in a dark app.
 */
export function useMenuScheme(): 'light' | 'dark' {
  const { mode } = useThemeMode();
  const surface = useCSSVariable('--color-overlay');
  return schemeOf(surface) ?? mode;
}
