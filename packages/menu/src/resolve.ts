import type { MenuIgnoredFeature, MenuModel, MenuRenderer, MenuRendererPreference } from './model';

export interface MenuRendererChoice {
  renderer: MenuRenderer;
  /** Why this renderer, in a sentence a developer can act on. */
  reason: string;
}

export interface ResolveInput {
  kind: 'menu' | 'context-menu';
  /** The `renderer` prop, else the `MenuConfigProvider` default. */
  requested: MenuRendererPreference;
  available: { system: boolean; glass: boolean };
  /** What the menu contains. Left out when only availability matters (`useMenuRenderer`). */
  model?: Pick<MenuModel, 'panelOnly' | 'unknown'>;
  /** Set once glass drawing has failed for this menu. */
  glassFailed?: boolean;
}

/** Picks the renderer for one menu. See `docs/designs/menu.md` §2. */
export function resolveRenderer(input: ResolveInput): MenuRendererChoice {
  const { kind, requested, available, model, glassFailed } = input;
  const panelOnly = model?.panelOnly;

  if (panelOnly?.has('unknown')) {
    return {
      renderer: 'panel',
      reason: `Only PanelUI can draw ${model?.unknown.join(', ') || 'an unknown child'} inside the menu.`,
    };
  }
  if (panelOnly?.has('rich-label')) {
    return {
      renderer: 'panel',
      reason: 'A row label is not plain text, which only PanelUI draws.',
    };
  }
  if (requested === 'panel') return { renderer: 'panel', reason: 'Asked for PanelUI.' };

  const system = (): MenuRendererChoice | null =>
    available.system ? { renderer: 'system', reason: "Apple's menu through @expo/ui." } : null;

  const glass = (): MenuRendererChoice | null => {
    if (kind !== 'menu' || !available.glass || glassFailed) return null;
    if (panelOnly?.has('submenu')) return null;
    return { renderer: 'glass', reason: 'The glass menu (Android 13+).' };
  };

  const fallback = (): MenuRendererChoice => {
    const panel = (reason: string): MenuRendererChoice => ({ renderer: 'panel', reason });
    if (requested === 'system') return panel('@expo/ui is not installed, or this is not iOS.');
    const wantsGlass = requested === 'glass' || available.glass;
    if (!wantsGlass) return panel('No native menu is available here.');
    if (kind !== 'menu') return panel('There is no glass context menu yet.');
    if (glassFailed) return panel('Glass drawing failed on this device.');
    if (panelOnly?.has('submenu')) return panel('The glass menu has no submenus.');
    return panel(
      'The glass module is not installed (Expo Go), or the device is below Android 13, low on memory, or cannot compile its shaders.',
    );
  };

  if (requested === 'system') return system() ?? fallback();
  if (requested === 'glass') return glass() ?? fallback();
  return system() ?? glass() ?? fallback();
}

const IGNORED_BY: Record<MenuRenderer, MenuIgnoredFeature[]> = {
  system: ['shortcut', 'trailing', 'background', 'on-press', 'react-icon'],
  glass: ['shortcut', 'trailing', 'background', 'on-press'],
  panel: [],
};

/** The features this menu uses that the chosen renderer won't draw. */
export function ignoredBy(renderer: MenuRenderer, model: Pick<MenuModel, 'ignored'>) {
  return IGNORED_BY[renderer].filter((feature) => model.ignored.has(feature));
}

const ADVICE: Record<MenuIgnoredFeature, string> = {
  shortcut: '`shortcut` is not drawn; put it in `description` if it matters',
  trailing: '`trailing` is not drawn',
  background: '`Menu.Background` is not drawn; the native menu has its own surface',
  'on-press': '`onPress` is not called; use `onSelect`',
  'react-icon': 'a React `icon` is not drawn; pass `systemImage` with an SF Symbol name',
};

const warned = new Set<string>();

/** One development warning per renderer and feature set. */
export function warnIgnored(renderer: MenuRenderer, features: MenuIgnoredFeature[]) {
  if (!__DEV__ || features.length === 0) return;
  const key = `${renderer}:${features.join(',')}`;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(
    `[react-native-tabcn-menu] The ${renderer} renderer ignores parts of this menu: ${features
      .map((feature) => ADVICE[feature])
      .join('; ')}.`,
  );
}

/** One development warning per message. */
export function warnOnce(message: string) {
  if (!__DEV__ || warned.has(message)) return;
  warned.add(message);
  console.warn(`[react-native-tabcn-menu] ${message}`);
}
