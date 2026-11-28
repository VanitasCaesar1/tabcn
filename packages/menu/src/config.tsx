import { createContext, type ReactNode, use, useMemo } from 'react';
import type { MenuRendererPreference } from './model';
import { glassAvailable } from './renderers/glass';
import { systemAvailable } from './renderers/system';
import { type MenuRendererChoice, resolveRenderer } from './resolve';

interface MenuConfig {
  renderer: MenuRendererPreference;
}

const MenuConfigContext = createContext<MenuConfig>({ renderer: 'auto' });

export interface MenuConfigProviderProps {
  /**
   * The renderer every menu below asks for unless it sets its own `renderer`. `'panel'` turns the
   * native menus off app-wide, for example from remote config after a bad release.
   */
  renderer?: MenuRendererPreference;
  children?: ReactNode;
}

export function MenuConfigProvider({ renderer = 'auto', children }: MenuConfigProviderProps) {
  const value = useMemo(() => ({ renderer }), [renderer]);
  return <MenuConfigContext value={value}>{children}</MenuConfigContext>;
}

/** The renderer a menu asks for: its own `renderer` prop, else the provider's. */
export function useRequestedRenderer(own?: MenuRendererPreference): MenuRendererPreference {
  const config = use(MenuConfigContext);
  return own ?? config.renderer;
}

/** Which renderers this build and device can use. Fixed for the life of the process. */
export function availableRenderers() {
  return { system: systemAvailable(), glass: glassAvailable() };
}

/**
 * The renderer a plain menu (or context menu) here would use, and why. A menu's contents can still
 * move it to PanelUI: a submenu on glass, an unknown child, a label that isn't text.
 */
export function useMenuRenderer(
  options: { renderer?: MenuRendererPreference; kind?: 'menu' | 'context-menu' } = {},
): MenuRendererChoice {
  const requested = useRequestedRenderer(options.renderer);
  const kind = options.kind ?? 'menu';
  return useMemo(
    () => resolveRenderer({ kind, requested, available: availableRenderers() }),
    [kind, requested],
  );
}
