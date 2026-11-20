/**
 * TabBarProvider: the bridge between screens and the tab bar. Screens and the bar are
 * siblings in the navigator's tree, so state that one writes and the other reads (panels,
 * the override slot, minimize-on-scroll) lives in a provider placed around the navigator.
 * Specs: docs/designs/panels.md, docs/designs/motion-and-rail.md.
 */
import {
  type ComponentRef,
  createContext,
  type ReactNode,
  use,
  useState,
  useSyncExternalStore,
} from 'react';
import type { View } from 'react-native';
import { type SharedValue, useSharedValue } from 'react-native-reanimated';

import type { TabFrame } from './TabList';

/** Where a panel rests: fully behind the bar, showing its peek height, or fully out. */
export type PanelState = 'hidden' | 'peek' | 'open';

/**
 * What a panel comes out from: the whole bar, or an element in the bar marked with
 * `usePanelAnchor(name)`. A union, so more anchor kinds can be added without a breaking change.
 */
export type PanelAnchor = 'bar' | { name: string };

export interface PanelRecord {
  id: string;
  content: ReactNode;
  anchor: PanelAnchor;
  /** 'bar' or `name:<name>`: panels with the same key share one visible slot. */
  anchorKey: string;
  peekHeight: number;
  state: PanelState;
  /** True once the declaring `<TabPanel>` unmounted: it animates to hidden, then is removed. */
  leaving: boolean;
  /** State to return to if the panel is declared again before it is removed. */
  restoreState: PanelState;
}

export interface Snapshot {
  /** Registered panels, in the order they were first declared. */
  panels: readonly PanelRecord[];
  /** Frames of named anchors, relative to `TabBarRoot`. */
  anchors: Readonly<Record<string, TabFrame>>;
  /** The element that replaces the bar's tabs, if a focused screen set one. */
  override: ReactNode | null;
}

/** Live values a drag gesture drives (see 'tabcn/gestures'). Registered by the panel layer. */
export interface PanelHandle {
  /** Points of the panel currently showing above its anchor. */
  visible: SharedValue<number>;
  /** Points showing when open (the content height). */
  openVisible: SharedValue<number>;
  /** Points showing at rest (the peek height, or 0). */
  restVisible: SharedValue<number>;
  /** Called on the JS thread when a drag ends. */
  settle: (open: boolean) => void;
}

interface MinimizeValues {
  /** 0 = full, 1 = minimized; animated. */
  progress: SharedValue<number>;
  /** 0 or 1: where `progress` is heading. */
  target: SharedValue<number>;
  /** True while a `TabBarRoot` with `minimizeBehavior="onScrollDown"` is mounted. */
  enabled: SharedValue<boolean>;
}

export const anchorKey = (anchor: PanelAnchor): string =>
  anchor === 'bar' ? 'bar' : `name:${anchor.name}`;

/** True while a panel is open (and not on its way out): it is then modal. */
export const anyPanelOpen = (snapshot: Snapshot): boolean =>
  snapshot.panels.some((p) => p.state === 'open' && !p.leaving);

interface PanelOptions {
  content: ReactNode;
  anchor: PanelAnchor;
  peekHeight: number;
}

/** Where a panel goes when it stops being open: its peek, or hidden when it has none. */
export const restingState = (panel: { peekHeight: number }): PanelState =>
  panel.peekHeight > 0 ? 'peek' : 'hidden';

const sameFrame = (a: TabFrame | undefined, b: TabFrame) =>
  !!a && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

/** Plain store read with `useSyncExternalStore`, so writers never re-render themselves. */
export function createTabBarStore() {
  let snapshot: Snapshot = { panels: [], anchors: {}, override: null };
  let overrideOwner: string | null = null;
  const handles = new Map<string, PanelHandle>();
  /**
   * The mounted `<TabPanel>`s declaring each id, in mount order, with their options. The
   * latest one's content is shown; the panel is released when the last one unmounts.
   */
  const owners = new Map<string, Map<string, PanelOptions>>();
  /** Re-measures each named anchor against the root, keyed by anchor name. */
  const anchorMeasures = new Map<string, () => void>();
  /** Whether the tab navigator is focused (set by the adapters); true without one. */
  let focusSource: (() => boolean) | null = null;
  /** The mounted `TabBarRoot`'s outer view: anchors are measured against it. */
  const root: { current: ComponentRef<typeof View> | null } = { current: null };
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const listener of listeners) listener();
  };
  const commit = (next: Partial<Snapshot>) => {
    snapshot = { ...snapshot, ...next };
    emit();
  };
  const find = (id: string) => snapshot.panels.find((p) => p.id === id);

  /** Applies a state change with the panel rules: one open panel, one visible panel per anchor. */
  const withState = (
    panels: readonly PanelRecord[],
    id: string,
    next: PanelState,
  ): PanelRecord[] => {
    const target = panels.find((p) => p.id === id);
    if (!target) return [...panels];
    return panels.map((p) => {
      if (p.id === id) return { ...p, state: next };
      let state = p.state;
      if (next === 'open' && state === 'open') state = restingState(p);
      if (next !== 'hidden' && p.anchorKey === target.anchorKey && state !== 'hidden') {
        state = 'hidden';
      }
      return state === p.state ? p : { ...p, state };
    });
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    root,

    /** A mounted `<TabPanel>` (`owner`) declares panel `id`; called on every commit. */
    upsertPanel(id: string, owner: string, options: PanelOptions, initialState: PanelState) {
      let declared = owners.get(id);
      if (!declared) {
        declared = new Map();
        owners.set(id, declared);
      }
      if (!declared.has(owner) && declared.size > 0) {
        warnOnce(
          `more than one <TabPanel id="${id}"> is mounted; the latest one's content is shown.`,
        );
      }
      declared.set(owner, options);
      // Only the latest-mounted declaration draws the panel.
      if ([...declared.keys()].at(-1) !== owner) return;
      const key = anchorKey(options.anchor);
      const existing = find(id);
      if (!existing) {
        const record: PanelRecord = {
          id,
          ...options,
          anchorKey: key,
          state: 'hidden',
          leaving: false,
          restoreState: 'hidden',
        };
        const panels = [...snapshot.panels, record];
        commit({
          panels: initialState === 'hidden' ? panels : withState(panels, id, initialState),
        });
        return;
      }
      let panels = snapshot.panels.map((p) =>
        p.id === id ? { ...p, ...options, anchorKey: key, leaving: false } : p,
      );
      if (existing.leaving && existing.restoreState !== 'hidden') {
        panels = withState(panels, id, existing.restoreState);
      }
      commit({ panels });
    },

    /**
     * A declaring `<TabPanel>` unmounted. If another still declares the id, its content is
     * shown; otherwise the panel animates to hidden, then `removePanel` drops it.
     */
    releasePanel(id: string, owner: string) {
      const declared = owners.get(id);
      declared?.delete(owner);
      const remaining = declared ? [...declared.values()].at(-1) : undefined;
      if (remaining) {
        const key = anchorKey(remaining.anchor);
        commit({
          panels: snapshot.panels.map((p) =>
            p.id === id ? { ...p, ...remaining, anchorKey: key } : p,
          ),
        });
        return;
      }
      owners.delete(id);
      const existing = find(id);
      if (!existing || existing.leaving) return;
      commit({
        panels: snapshot.panels.map((p) =>
          p.id === id ? { ...p, leaving: true, restoreState: p.state, state: 'hidden' } : p,
        ),
      });
    },

    removePanel(id: string) {
      if (!find(id)?.leaving) return;
      commit({ panels: snapshot.panels.filter((p) => p.id !== id) });
    },

    setPanelState(id: string, next: PanelState) {
      const existing = find(id);
      if (!existing || existing.leaving || existing.state === next) return;
      commit({ panels: withState(snapshot.panels, id, next) });
    },

    setAnchor(name: string, frame: TabFrame) {
      if (sameFrame(snapshot.anchors[name], frame)) return;
      commit({ anchors: { ...snapshot.anchors, [name]: frame } });
    },

    /** Registers how to re-measure anchor `name`; returns the unregister function. */
    registerAnchor(name: string, measure: () => void) {
      anchorMeasures.set(name, measure);
      return () => {
        if (anchorMeasures.get(name) === measure) anchorMeasures.delete(name);
      };
    },
    /** Re-measures every anchor: the root or the bar moved, which anchors can't see. */
    measureAnchors() {
      for (const measure of anchorMeasures.values()) measure();
    },

    setFocusSource(source: (() => boolean) | null) {
      focusSource = source;
    },
    /** Whether the tab navigator is focused (not covered by a screen pushed over it). */
    isNavigatorFocused: () => (focusSource ? focusSource() : true),

    removeAnchor(name: string) {
      if (!(name in snapshot.anchors)) return;
      const { [name]: _removed, ...anchors } = snapshot.anchors;
      commit({ anchors });
    },

    setOverride(owner: string, element: ReactNode) {
      overrideOwner = owner;
      if (snapshot.override === element) return;
      commit({ override: element });
    },

    clearOverride(owner: string) {
      if (overrideOwner !== owner) return;
      overrideOwner = null;
      if (snapshot.override === null) return;
      commit({ override: null });
    },

    setHandle(id: string, handle: PanelHandle) {
      handles.set(id, handle);
      emit();
    },
    deleteHandle(id: string, handle: PanelHandle) {
      if (handles.get(id) !== handle) return;
      handles.delete(id);
      emit();
    },
    getHandle: (id: string) => handles.get(id),
  };
}

export type TabBarStore = ReturnType<typeof createTabBarStore>;

export interface TabBarProviderValue {
  store: TabBarStore;
  minimize: MinimizeValues;
}

const TabBarProviderContext = createContext<TabBarProviderValue | null>(null);

/**
 * Place around the tabs navigator (in Expo Router, around `<Tabs>` in the tabs layout) to
 * let screens drive the bar: panels (`TabPanel`, `useTabPanel`), the override slot
 * (`useTabBarOverride`) and minimize on scroll (`useMinimizeOnScroll`). Without it those
 * APIs are inert and the bar renders as it always has.
 */
export function TabBarProvider({ children }: { children?: ReactNode }) {
  const [store] = useState(createTabBarStore);
  const progress = useSharedValue(0);
  const target = useSharedValue(0);
  const enabled = useSharedValue(false);
  const [value] = useState<TabBarProviderValue>(() => ({
    store,
    minimize: { progress, target, enabled },
  }));
  return <TabBarProviderContext value={value}>{children}</TabBarProviderContext>;
}

/** The provider, or null when there is none. Internal. */
export function useTabBarProvider(): TabBarProviderValue | null {
  return use(TabBarProviderContext);
}

const emptySnapshot: Snapshot = { panels: [], anchors: {}, override: null };
const noopSubscribe = () => () => {};

/** Subscribes to a value derived from the store; returns `fallback` without a provider. */
export function useStoreSelector<T>(
  store: TabBarStore | undefined,
  select: (snapshot: Snapshot) => T,
): T {
  return useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    () => select(store ? store.getSnapshot() : emptySnapshot),
    () => select(emptySnapshot),
  );
}

const warned = new Set<string>();
/** Logs a development warning once per message. */
export function warnOnce(message: string) {
  if (!__DEV__ || warned.has(message)) return;
  warned.add(message);
  console.warn(`tabcn: ${message}`);
}
