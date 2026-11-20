/**
 * Panels: surfaces that live behind the tab bar and slide out of it. A panel with snap
 * points is a sheet. Specs: docs/designs/panels.md, docs/designs/bottom-components.md
 * (Sheets, Sub-tabs).
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
  type SnapPoint,
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
  /**
   * Points that show while the panel peeks; also reserved in the bar's reported height.
   * While it peeks, the rest of the content is laid out out of sight but stays in the
   * accessibility tree: hide that part from screen readers until the panel opens (read
   * `state` from `useTabPanel`). Default 0.
   */
  peekHeight?: number;
  /** State when the panel is first declared. Default `'hidden'`. */
  initialState?: PanelState;
  /**
   * Heights the panel can rest at while open, lowest first. With snap points the panel is a
   * sheet: it takes the bar's full width, its content is laid out once at the highest snap
   * point, and `open()` goes to the lowest. It is modal only at the highest. Content below
   * the visible height is off-screen, so don't pin controls to the content's bottom.
   * `'100%'` reaches the top safe area. Heights assume the tab navigator fills the screen: a
   * stack header shown above the tabs would cover the top of a tall sheet, so hide that
   * header on screens with sheets. While a screen reader is on, a sheet opens only to
   * its highest snap point. Bar-anchored panels only: on a named anchor they're ignored, with
   * a development warning. Without snap points, open is the content's own height, as before.
   */
  snapPoints?: readonly SnapPoint[];
  children?: ReactNode;
}

const NO_SNAP_POINTS: readonly SnapPoint[] = [];

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
  snapPoints = NO_SNAP_POINTS,
  children,
}: TabPanelProps) {
  const store = useTabBarProvider()?.store;
  const owner = useId();
  if (!store) warnOnce('<TabPanel> needs a <TabBarProvider> around the tabs navigator.');
  // Sheets grow out of the whole bar; a panel on a named anchor keeps its content's height.
  const sheetPoints = anchor === 'bar' ? snapPoints : NO_SNAP_POINTS;
  if (anchor !== 'bar' && snapPoints.length > 0) {
    warnOnce(
      `<TabPanel id="${id}"> has snapPoints but is anchored to "${anchor.name}". Snap points ` +
        "only work on panels anchored to 'bar', so they are ignored here.",
    );
  }

  // Hand the latest content to the provider on every commit.
  useLayoutEffect(() => {
    store?.upsertPanel(
      id,
      owner,
      { content: children, anchor, peekHeight, snapPoints: sheetPoints },
      initialState,
    );
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
  /** Opens the panel (a sheet at its lowest snap point), or returns an open panel to rest. */
  toggle: () => void;
  /** Index into `snapPoints` while open; -1 otherwise (and always -1 without snap points). */
  snap: number;
  /** Opens the panel at `snapPoints[index]` (clamped). Without snap points it just opens. */
  snapTo: (index: number) => void;
}

const noop = () => {};

/**
 * Reads and controls the panel declared with `<TabPanel id={id}>`, from any component under
 * the `TabBarProvider`. Opening a panel returns any other open panel to its resting state.
 * A panel opened on the anchor of a peeking panel (a sheet over a mini player) covers it: the
 * peeking panel slides behind the bar, keeps its `peek` state and its reserved height, and
 * comes back when the open one rests. Peeking a panel hides any other peeking panel on its
 * anchor.
 */
export function useTabPanel(id: string): TabPanelControls {
  const store = useTabBarProvider()?.store;
  if (!store) warnOnce('useTabPanel() needs a <TabBarProvider> around the tabs navigator.');
  const state = useStoreSelector(
    store,
    (s) => s.panels.find((p) => p.id === id && !p.leaving)?.state ?? 'hidden',
  );
  const snap = useStoreSelector(
    store,
    (s) => s.panels.find((p) => p.id === id && !p.leaving)?.snap ?? -1,
  );

  return useMemo(() => {
    if (!store) {
      return { state, snap, peek: noop, open: noop, hide: noop, toggle: noop, snapTo: noop };
    }
    const set = (next: PanelState) => store.setPanelState(id, next);
    return {
      state,
      snap,
      peek: () => set('peek'),
      open: () => set('open'),
      hide: () => set('hidden'),
      toggle: () => {
        const panel = store.getSnapshot().panels.find((p) => p.id === id);
        if (!panel) return;
        set(panel.state === 'open' ? restingState(panel) : 'open');
      },
      snapTo: (index: number) => store.setPanelState(id, 'open', index),
    };
  }, [store, id, state, snap]);
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
