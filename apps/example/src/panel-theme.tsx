/**
 * The demo's PanelUI theme switcher: shows every design in PanelUI's Panel, Moon and Grass
 * themes (light or dark with the system), through registry/themes/panelui-colors.ts, the file
 * an app installs to do the same. "tabcn" shows each design in its own colours.
 */
import {
  type PanelUIColors,
  type PanelUIDesign,
  panelUIColorMaps,
  usePanelUIColors,
} from '@registry-themes/panelui-colors';
import {
  type ComponentType,
  createContext,
  type ReactNode,
  use,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform, useColorScheme } from 'react-native';
import { Uniwind, useCSSVariable } from 'uniwind';

import { embed } from '@/embed';

export type PanelFamily = 'tabcn' | 'panel' | 'moon' | 'grass';
export const PANEL_FAMILIES: { id: PanelFamily; label: string }[] = [
  { id: 'tabcn', label: 'tabcn' },
  { id: 'panel', label: 'Panel' },
  { id: 'moon', label: 'Moon' },
  { id: 'grass', label: 'Grass' },
];

const PanelThemeContext = createContext<{
  family: PanelFamily;
  setFamily: (family: PanelFamily) => void;
}>({ family: 'tabcn', setFamily: () => {} });

const isFamily = (value: unknown): value is PanelFamily =>
  PANEL_FAMILIES.some((option) => option.id === value);

export function PanelThemeProvider({ children }: { children: ReactNode }) {
  // The site's live preview picks the theme in the URL, then switches it with postMessage.
  const [family, setFamily] = useState<PanelFamily>(isFamily(embed?.theme) ? embed.theme : 'tabcn');
  const dark = useColorScheme() === 'dark';
  useEffect(() => {
    if (!embed || Platform.OS !== 'web') return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; theme?: unknown } | null;
      if (data?.type === 'tabcn:theme' && isFamily(data.theme)) setFamily(data.theme);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  useEffect(() => {
    // Panel is PanelUI's light/dark pair, which Uniwind follows with the system on its own.
    // Moon and Grass are extra themes: pick the half that matches the system.
    if (family === 'moon' || family === 'grass') {
      Uniwind.setTheme(dark ? `${family}-dark` : family);
    } else {
      Uniwind.setTheme('system');
    }
  }, [family, dark]);
  const value = useMemo(() => ({ family, setFamily }), [family]);
  return <PanelThemeContext value={value}>{children}</PanelThemeContext>;
}

export function usePanelFamily() {
  return use(PanelThemeContext);
}

const isMapped = (id: string): id is PanelUIDesign => id in panelUIColorMaps;

/** A design's PanelUI colours while a PanelUI theme is on; undefined for "tabcn". */
export function useDemoColors<D extends PanelUIDesign>(design: D): PanelUIColors<D> | undefined {
  const { family } = usePanelFamily();
  const colors = usePanelUIColors(design);
  return family === 'tabcn' ? undefined : colors;
}

/**
 * `Component` with its `colors` taken from the PanelUI theme while one is on. Colours the demo
 * passes itself still win.
 */
export function themed<P extends { colors?: object }>(
  design: string,
  Component: ComponentType<P>,
): ComponentType<P> {
  if (!isMapped(design)) return Component;
  function Themed(props: P) {
    const colors = useDemoColors(design as PanelUIDesign);
    const merged = colors ? { ...colors, ...props.colors } : props.colors;
    return <Component {...props} colors={merged} />;
  }
  Themed.displayName = `Themed(${Component.displayName ?? Component.name})`;
  return Themed;
}

/** The demo screen's colours under a PanelUI theme; undefined for "tabcn". */
export function useDemoScreenColors() {
  const { family } = usePanelFamily();
  const [background, foreground, secondary] = useCSSVariable([
    '--color-background',
    '--color-foreground',
    '--color-secondary',
  ]);
  if (family === 'tabcn') return undefined;
  return {
    background: String(background ?? '#ffffff'),
    text: String(foreground ?? '#111114'),
    chip: String(secondary ?? 'rgba(0,0,0,0.06)'),
  };
}
