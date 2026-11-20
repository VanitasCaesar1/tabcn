/**
 * Panels: surfaces that live behind the tab bar and slide out of it.
 * Spec: docs/designs/panels.md.
 */
import {
  type ComponentRef,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import type { LayoutChangeEvent, View } from 'react-native';

import {
  type PanelAnchor,
  type PanelState,
  restingState,
  useStoreSelector,
  useTabBarProvider,
  warnOnce,
} from './provider';

export interface TabPanelProps {
  /**
   * Names the panel for `useTabPanel(id)`. If several mounted `<TabPanel>`s share an id (the
   * same screen pushed twice), the latest one's content is shown and the panel stays until
   * the last of them unmounts.
   */
  id: string;
  /** What the panel comes out from. Default `'bar'`. */
  anchor?: PanelAnchor;
  /** Points that show while the panel peeks; also reserved in the bar's reported height. Default 0. */
  peekHeight?: number;
  /** State when the panel is first declared. Default `'hidden'`. */
  initialState?: PanelState;
  children?: ReactNode;
}

/**
 * Declares a panel. Renders nothing where it is written: its children are drawn behind the
 * tab bar by `TabBarRoot`. The panel lives while the `<TabPanel>` is mounted: when it
 * unmounts, the panel slides to hidden and is removed. Declare it in a layout to keep it
 * across tabs. A tab's screen stays mounted after its first visit, so a panel declared in
 * a screen stays after switching tabs; hide it on blur (`useFocusEffect` with
 * `useTabPanel(id).hide`) if it belongs to that screen only.
 * The content renders inside the tab bar, so it sees the contexts around the navigator,
 * not the ones around the screen that declared it.
 */
export function TabPanel({
  id,
  anchor = 'bar',
  peekHeight = 0,
  initialState = 'hidden',
  children,
}: TabPanelProps) {
  const store = useTabBarProvider()?.store;
  const owner = useId();
  if (!store) warnOnce('<TabPanel> needs a <TabBarProvider> around the tabs navigator.');

  // Hand the latest content to the provider on every commit.
  useLayoutEffect(() => {
    store?.upsertPanel(id, owner, { content: children, anchor, peekHeight }, initialState);
  });
  useLayoutEffect(() => {
    if (!store) return;
    return () => store.releasePanel(id, owner);
  }, [store, id, owner]);

  return null;
}

/** Controls for one panel. */
export interface TabPanelControls {
  state: PanelState;
  peek: () => void;
  open: () => void;
  hide: () => void;
  /** Opens the panel, or returns an open panel to its resting state. */
  toggle: () => void;
}

const noop = () => {};

/**
 * Reads and controls the panel declared with `<TabPanel id={id}>`, from any component under
 * the `TabBarProvider`. Opening a panel returns any other open panel to its resting state.
 */
export function useTabPanel(id: string): TabPanelControls {
  const store = useTabBarProvider()?.store;
  if (!store) warnOnce('useTabPanel() needs a <TabBarProvider> around the tabs navigator.');
  const state = useStoreSelector(
    store,
    (s) => s.panels.find((p) => p.id === id && !p.leaving)?.state ?? 'hidden',
  );

  return useMemo(() => {
    if (!store) return { state, peek: noop, open: noop, hide: noop, toggle: noop };
    const set = (next: PanelState) => store.setPanelState(id, next);
    return {
      state,
      peek: () => set('peek'),
      open: () => set('open'),
      hide: () => set('hidden'),
      toggle: () => {
        const panel = store.getSnapshot().panels.find((p) => p.id === id);
        if (!panel) return;
        set(panel.state === 'open' ? restingState(panel) : 'open');
      },
    };
  }, [store, id, state]);
}

/**
 * Marks an element in a bar design (such as its + button) as a panel anchor. Spread the
 * result onto the element: it measures the element against `TabBarRoot` and, while a panel
 * is anchored to `name`, reports `expanded` (true while that panel is open). With no panel
 * anchored there, `expanded` is left out, so the button doesn't read as collapsible.
 *
 * ```tsx
 * <PressableScale {...usePanelAnchor('action')} onPress={toggle} />
 * ```
 */
export function usePanelAnchor(name: string): {
  ref: (node: ComponentRef<typeof View> | null) => void;
  onLayout: (event: LayoutChangeEvent) => void;
  accessibilityState: { expanded?: boolean };
} {
  const store = useTabBarProvider()?.store;
  const node = useRef<ComponentRef<typeof View> | null>(null);
  // undefined while no panel is anchored to `name`; otherwise whether one of them is open.
  const expanded = useStoreSelector(store, (s) => {
    const anchored = s.panels.filter((p) => p.anchorKey === `name:${name}` && !p.leaving);
    return anchored.length > 0 ? anchored.some((p) => p.state === 'open') : undefined;
  });

  const ref = useCallback((n: ComponentRef<typeof View> | null) => {
    node.current = n;
  }, []);
  const onLayout = useCallback(() => {
    const target = node.current;
    const relativeTo = store?.root.current;
    if (!store || !target || !relativeTo) return;
    target.measureLayout(relativeTo, (x, y, width, height) => {
      store.setAnchor(name, { x, y, width, height });
    });
  }, [store, name]);

  // `onLayout` only fires when the element moves within its parent; `TabBarRoot` asks every
  // anchor to re-measure when the root or the bar moves (a re-centred pill, a rotation).
  useEffect(() => {
    if (!store) return;
    const unregister = store.registerAnchor(name, onLayout);
    return () => {
      unregister();
      store.removeAnchor(name);
    };
  }, [store, name, onLayout]);

  return useMemo(
    () => ({ ref, onLayout, accessibilityState: expanded === undefined ? {} : { expanded } }),
    [ref, onLayout, expanded],
  );
}
