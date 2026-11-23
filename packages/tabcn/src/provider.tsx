/**
 * TabBarProvider: the bridge between screens and the tab bar. Screens and the bar are
 * siblings in the navigator's tree, so state that one writes and the other reads (panels,
 * the override slot, minimize-on-scroll) lives in a provider placed around the navigator.
 * Specs: docs/designs/panels.md, docs/designs/motion-and-rail.md,
 * docs/designs/bottom-components.md.
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
import { makeMutable, type SharedValue, useSharedValue } from 'react-native-reanimated';

import type { TabFrame } from './TabList';

/** Where a panel rests: fully behind the bar, showing its peek height, or fully out. */

/** Points of a panel behind a floating bar's top edge, and the overlap before any bar reports. */
export const DEFAULT_PANEL_OVERLAP = 16;
export type PanelState = 'hidden' | 'peek' | 'open';

/**
 * What a panel comes out from: the whole bar, or an element in the bar marked with
 * `usePanelAnchor(name)`. A union, so more anchor kinds can be added without a breaking change.
 */
export type PanelAnchor = 'bar' | { name: string };

/**
 * A height a sheet can rest at: points above its anchor's top edge, or a share of the room
 * between that edge and the top safe area (`'100%'` reaches the top safe area).
 */
export type SnapPoint = number | `${number}%`;

export interface PanelRecord {
  id: string;
  anchor: PanelAnchor;
  /** 'bar' or `name:<name>`: panels with the same key share one visible slot. */
  anchorKey: string;
  peekHeight: number;
  /** Heights the panel rests at while open, lowest first; empty for a plain panel. */
  snapPoints: readonly SnapPoint[];
  /** While open, the bar slides away and the panel moves into its place (floating bars). */
  coversBar: boolean;
  /** The panel has a backdrop. The backdrop itself is in its `PanelContent`. */
  hasBackdrop: boolean;
  state: PanelState;
  /** Index into `snapPoints` while open; -1 otherwise, and always -1 without snap points. */
  snap: number;
  /** True once the declaring `<TabPanel>` unmounted: it animates to hidden, then is removed. */
  leaving: boolean;
  /** State to return to if the panel is declared again before it is removed. */
  restoreState: PanelState;
  /** Snap point to return to with `restoreState`. */
  restoreSnap: number;
}

/**
 * What a panel draws. Kept out of the snapshot with a subscription per panel: a screen that
 * declares a panel hands over new elements on each of its renders, and that should re-render
 * that panel's content only, not the bar and every other panel.
 */
export interface PanelContent {
  content: ReactNode;
  /** Drawn over the whole screen behind the panel while it is open; null for none. */
  backdrop: ReactNode;
}

export interface Snapshot {
  /** Registered panels, in the order they were first declared. */
  panels: readonly PanelRecord[];
  /** Frames of named anchors, relative to `TabBarRoot`. */
  anchors: Readonly<Record<string, TabFrame>>;
  /**
   * Whether a focused screen set an element to replace the bar's tabs. The element itself has
   * its own subscription (`getOverride`), for the same reason as `PanelContent`.
   */
  overrideActive: boolean;
  /** False while a screen pushed over the tab navigator covers it (set by the adapters). */
  navigatorFocused: boolean;
}

/** Where a companion sits against the bar box. */
export type CompanionPosition = 'above' | 'above-start' | 'above-end' | 'start' | 'end';

/** One mounted `<TabBarCompanion>`. */
export interface CompanionRecord {
  /** The declaring component's id. */
  owner: string;
  position: CompanionPosition;
  gap: number;
  visible: boolean;
  content: ReactNode;
}

/** Live values a drag gesture drives (see 'react-native-tabcn/gestures'). Registered by the panel layer. */
export interface PanelHandle {
  /** Points of the panel currently showing above its window's bottom edge. */
  visible: SharedValue<number>;
  /** Points showing at the highest stop (the content height of a plain panel). */
  openVisible: SharedValue<number>;
  /** Points showing at rest (the peek height, or the hidden position). */
  restVisible: SharedValue<number>;
  /** The lowest a drag can take the panel: the hidden position. */
  minVisible: SharedValue<number>;
  /**
   * Every height the panel can settle at, lowest first: its resting state, then its open
   * height (a plain panel) or each snap point (a sheet).
   */
  stops: SharedValue<number[]>;
  /** Called on the JS thread when a drag takes the panel, before any `settle`. */
  begin: () => void;
  /** Called on the JS thread when a drag ends, with the index into `stops` it settled on. */
  settle: (stop: number) => void;
}

/** One tab's live values (`useLiveTab`), created the first time any caller asks for them. */
export interface LiveEntry {
  /** 0 to 1, read and written on the UI thread. */
  progress: SharedValue<number>;
  text: string | undefined;
  /** Components that read `text`. */
  listeners: Set<() => void>;
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

/** True while a panel is open at any height (and not on its way out). */
export const anyPanelOpen = (panels: readonly PanelRecord[]): boolean =>
  panels.some((p) => p.state === 'open' && !p.leaving);

/**
 * Whether a peeking panel is covered: another panel on the same anchor is open. The panel
 * layer draws a covered panel behind the bar and hides it from screen readers; it keeps its
 * `peek` state (and its peek stays reserved in the reported height), so it comes back when
 * the open panel rests.
 */
export const isCovered = (panel: PanelRecord, panels: readonly PanelRecord[]): boolean =>
  panel.state === 'peek' &&
  !panel.leaving &&
  panels.some(
    (p) => p !== panel && p.anchorKey === panel.anchorKey && p.state === 'open' && !p.leaving,
  );

/** Whether this panel is open at its highest height, which makes it modal. */
export const isModal = (panel: PanelRecord): boolean =>
  panel.state === 'open' &&
  !panel.leaving &&
  (panel.snapPoints.length === 0 || panel.snap === panel.snapPoints.length - 1);

/**
 * True while a panel is open at its highest height: it is then modal, and the screens, the
 * tabs, the override and the other panels are hidden from screen readers. A plain panel has
 * one open height; a sheet open at a lower snap point leaves the screen behind usable.
 */
export const modalPanel = (panels: readonly PanelRecord[]): boolean => panels.some(isModal);

interface PanelOptions {
  content: ReactNode;
  anchor: PanelAnchor;
  peekHeight: number;
  snapPoints: readonly SnapPoint[];
  coversBar: boolean;
  backdrop: ReactNode;
}

/**
 * Keeps a snap index inside the panel's snap points; -1 when it has none. `highestOnly` (a
 * screen reader is on) always picks the highest: lower down, part of the sheet's content is
 * off-screen but still in the accessibility tree.
 */
const clampSnap = (snapPoints: readonly SnapPoint[], snap: number, highestOnly = false) => {
  if (snapPoints.length === 0) return -1;
  if (highestOnly) return snapPoints.length - 1;
  return Math.min(Math.max(0, Math.round(snap)), snapPoints.length - 1);
};

/** Where a panel goes when it stops being open: its peek, or hidden when it has none. */
export const restingState = (panel: { peekHeight: number }): PanelState =>
  panel.peekHeight > 0 ? 'peek' : 'hidden';

const sameFrame = (a: TabFrame | undefined, b: TabFrame) =>
  !!a && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

const sameSnapPoints = (a: readonly SnapPoint[], b: readonly SnapPoint[]) =>
  a.length === b.length && a.every((point, i) => point === b[i]);

const EMPTY_CONTENT: PanelContent = { content: null, backdrop: null };

/**
 * `panel` with a declaration's options applied, or `panel` itself when they change nothing.
 * A screen passes new objects on each render (`anchor={{ name }}`, `snapPoints={['50%']}`),
 * so they are compared by value: an unchanged record keeps the bar from re-rendering.
 */
function withOptions(panel: PanelRecord, options: PanelOptions): PanelRecord {
  const key = anchorKey(options.anchor);
  const snapPoints = sameSnapPoints(panel.snapPoints, options.snapPoints)
    ? panel.snapPoints
    : options.snapPoints;
  const hasBackdrop = options.backdrop != null;
  if (
    panel.anchorKey === key &&
    panel.snapPoints === snapPoints &&
    panel.peekHeight === options.peekHeight &&
    panel.coversBar === options.coversBar &&
    panel.hasBackdrop === hasBackdrop
  ) {
    return panel;
  }
  return {
    ...panel,
    anchor: panel.anchorKey === key ? panel.anchor : options.anchor,
    anchorKey: key,
    peekHeight: options.peekHeight,
    snapPoints,
    coversBar: options.coversBar,
    hasBackdrop,
  };
}

/** Plain store read with `useSyncExternalStore`, so writers never re-render themselves. */
export function createTabBarStore() {
  let snapshot: Snapshot = {
    panels: [],
    anchors: {},
    overrideActive: false,
    navigatorFocused: true,
  };
  let overrideOwner: string | null = null;
  let override: ReactNode | null = null;
  const overrideListeners = new Set<() => void>();
  /** Each panel's content, with a subscription per panel id. */
  const contents = new Map<string, PanelContent>();
  const contentListeners = new Map<string, Set<() => void>>();
  const setContent = (id: string, options: PanelOptions) => {
    const current = contents.get(id);
    if (current && current.content === options.content && current.backdrop === options.backdrop) {
      return;
    }
    contents.set(id, { content: options.content, backdrop: options.backdrop });
    for (const listener of contentListeners.get(id) ?? []) listener();
  };
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
  /** Companions have their own subscription, so a re-rendered companion touches only them. */
  let companions: readonly CompanionRecord[] = [];
  const companionListeners = new Set<() => void>();
  /** `useTabBarInset()`'s number, also with its own subscription. */
  let inset = 0;
  const insetListeners = new Set<() => void>();
  // Points of a panel hidden behind the bar's top edge: 16 under a floating bar, 0 under a
  // docked one. 16 until a bar reports, as it was before the bar said.
  let overlap = DEFAULT_PANEL_OVERLAP;
  const overlapListeners = new Set<() => void>();
  /** Tab navigators attached through an adapter: one per provider. */
  const navigators = new Set<string>();
  /** A screen reader is on: sheets open only to their highest snap point. */
  let screenReader = false;
  /**
   * Live tab values by route name. Kept out of the snapshot: progress lives on the UI thread
   * and text has a subscription per name, so a write re-renders only that name's readers.
   */
  const live = new Map<string, LiveEntry>();
  const liveEntry = (name: string): LiveEntry => {
    let entry = live.get(name);
    if (!entry) {
      entry = { progress: makeMutable(0), text: undefined, listeners: new Set() };
      live.set(name, entry);
    }
    return entry;
  };

  const emit = () => {
    for (const listener of listeners) listener();
  };
  const commit = (next: Partial<Snapshot>) => {
    snapshot = { ...snapshot, ...next };
    emit();
  };
  /** Commits `panels` unless it holds the same records as now. */
  const commitPanels = (panels: readonly PanelRecord[]) => {
    const same =
      panels.length === snapshot.panels.length && panels.every((p, i) => p === snapshot.panels[i]);
    if (!same) commit({ panels });
  };
  const find = (id: string) => snapshot.panels.find((p) => p.id === id);

  /**
   * Applies a state change with the panel rules: one open panel at a time, and one peeking
   * panel per anchor. An open panel covers a peeking one on its anchor instead of replacing
   * it (see `isCovered`), so a mini player under a sheet comes back when the sheet rests.
   */
  const withState = (
    panels: readonly PanelRecord[],
    id: string,
    next: PanelState,
    snap = 0,
  ): PanelRecord[] => {
    const target = panels.find((p) => p.id === id);
    if (!target) return [...panels];
    return panels.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          state: next,
          snap: next === 'open' ? clampSnap(p.snapPoints, snap, screenReader) : -1,
        };
      }
      let state = p.state;
      if (next === 'open' && state === 'open') state = restingState(p);
      if (next === 'peek' && p.anchorKey === target.anchorKey && state !== 'hidden') {
        state = 'hidden';
      }
      return state === p.state ? p : { ...p, state, snap: -1 };
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
      setContent(id, options);
      const existing = find(id);
      if (!existing) {
        const record: PanelRecord = {
          id,
          anchor: options.anchor,
          anchorKey: anchorKey(options.anchor),
          peekHeight: options.peekHeight,
          snapPoints: options.snapPoints,
          coversBar: options.coversBar,
          hasBackdrop: options.backdrop != null,
          state: 'hidden',
          snap: -1,
          leaving: false,
          restoreState: 'hidden',
          restoreSnap: -1,
        };
        const panels = [...snapshot.panels, record];
        commit({
          panels: initialState === 'hidden' ? panels : withState(panels, id, initialState),
        });
        return;
      }
      let panels = snapshot.panels.map((p) => {
        if (p.id !== id) return p;
        const next = withOptions(p, options);
        // Snap points can change between renders; keep the index inside them.
        const snap =
          next.state === 'open' ? clampSnap(next.snapPoints, next.snap, screenReader) : -1;
        return next.leaving || next.snap !== snap ? { ...next, leaving: false, snap } : next;
      });
      if (existing.leaving && existing.restoreState !== 'hidden') {
        panels = withState(panels, id, existing.restoreState, existing.restoreSnap);
      }
      commitPanels(panels);
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
        setContent(id, remaining);
        commitPanels(snapshot.panels.map((p) => (p.id === id ? withOptions(p, remaining) : p)));
        return;
      }
      owners.delete(id);
      const existing = find(id);
      if (!existing || existing.leaving) return;
      commit({
        panels: snapshot.panels.map((p) =>
          p.id === id
            ? {
                ...p,
                leaving: true,
                restoreState: p.state,
                restoreSnap: p.snap,
                state: 'hidden',
                snap: -1,
              }
            : p,
        ),
      });
    },

    removePanel(id: string) {
      if (!find(id)?.leaving) return;
      contents.delete(id);
      commit({ panels: snapshot.panels.filter((p) => p.id !== id) });
    },

    /** Panel `id`'s content; read by its view only, so new content re-renders only it. */
    subscribePanelContent(id: string, listener: () => void) {
      let set = contentListeners.get(id);
      if (!set) {
        set = new Set();
        contentListeners.set(id, set);
      }
      set.add(listener);
      return () => {
        set.delete(listener);
        if (set.size === 0 && contentListeners.get(id) === set) contentListeners.delete(id);
      };
    },
    getPanelContent: (id: string): PanelContent => contents.get(id) ?? EMPTY_CONTENT,

    /** Moves a panel to `next`; an open sheet goes to snap point `snap` (default the lowest). */
    setPanelState(id: string, next: PanelState, snap = 0) {
      const existing = find(id);
      if (!existing || existing.leaving) return;
      const nextSnap = next === 'open' ? clampSnap(existing.snapPoints, snap, screenReader) : -1;
      if (existing.state === next && existing.snap === nextSnap) return;
      commit({ panels: withState(snapshot.panels, id, next, nextSnap) });
    },

    /**
     * Whether a screen reader is on (set by the panel layer). While it is, sheets open only
     * to their highest snap point, so nothing a screen reader can reach is off-screen; a
     * sheet already open lower down moves up there.
     */
    setScreenReader(on: boolean) {
      if (screenReader === on) return;
      screenReader = on;
      if (!on) return;
      const raised = snapshot.panels.map((p) =>
        p.state === 'open' && p.snapPoints.length > 0 && p.snap !== p.snapPoints.length - 1
          ? { ...p, snap: p.snapPoints.length - 1 }
          : p,
      );
      if (raised.some((p, i) => p !== snapshot.panels[i])) commit({ panels: raised });
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
    /** The adapters push focus changes, so `useTabBarInset()` drops to 0 under a pushed screen. */
    setNavigatorFocused(focused: boolean) {
      if (snapshot.navigatorFocused === focused) return;
      commit({ navigatorFocused: focused });
    },
    /** A tab navigator's bar attached to this provider; returns the detach function. */
    attachNavigator(token: string) {
      navigators.add(token);
      if (navigators.size > 1) {
        warnOnce(
          'more than one tab navigator is attached to one <TabBarProvider>. Use one provider ' +
            'per tab navigator: panels, companions and overrides would reach the wrong bar.',
        );
      }
      return () => {
        navigators.delete(token);
      };
    },

    removeAnchor(name: string) {
      if (!(name in snapshot.anchors)) return;
      const { [name]: _removed, ...anchors } = snapshot.anchors;
      commit({ anchors });
    },

    setOverride(owner: string, element: ReactNode) {
      overrideOwner = owner;
      if (override === element) return;
      override = element;
      for (const listener of overrideListeners) listener();
      if (!snapshot.overrideActive) commit({ overrideActive: true });
    },

    clearOverride(owner: string) {
      if (overrideOwner !== owner) return;
      overrideOwner = null;
      if (override === null) return;
      override = null;
      for (const listener of overrideListeners) listener();
      commit({ overrideActive: false });
    },

    /** The override element; read by the bar's override slot only (see `PanelContent`). */
    subscribeOverride(listener: () => void) {
      overrideListeners.add(listener);
      return () => {
        overrideListeners.delete(listener);
      };
    },
    getOverride: () => override,

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

    subscribeCompanions(listener: () => void) {
      companionListeners.add(listener);
      return () => {
        companionListeners.delete(listener);
      };
    },
    getCompanions: () => companions,
    /** A mounted `<TabBarCompanion>` declares or updates itself; called on every commit. */
    upsertCompanion(record: CompanionRecord) {
      const index = companions.findIndex((c) => c.owner === record.owner);
      const current = companions[index];
      if (
        current &&
        current.position === record.position &&
        current.gap === record.gap &&
        current.visible === record.visible &&
        current.content === record.content
      ) {
        return;
      }
      companions =
        index < 0 ? [...companions, record] : companions.map((c, i) => (i === index ? record : c));
      for (const listener of companionListeners) listener();
    },
    releaseCompanion(owner: string) {
      if (!companions.some((c) => c.owner === owner)) return;
      companions = companions.filter((c) => c.owner !== owner);
      for (const listener of companionListeners) listener();
    },

    /** The live values of the tab for route `name` (`useLiveTab`). */
    liveEntry,
    setLiveText(name: string, text: string | undefined) {
      const entry = liveEntry(name);
      if (entry.text === text) return;
      entry.text = text;
      for (const listener of entry.listeners) listener();
    },
    subscribeLive(name: string, listener: () => void) {
      const entry = liveEntry(name);
      entry.listeners.add(listener);
      return () => {
        entry.listeners.delete(listener);
      };
    },

    subscribeInset(listener: () => void) {
      insetListeners.add(listener);
      return () => {
        insetListeners.delete(listener);
      };
    },
    getInset: () => inset,
    /** Written by `TabBarRoot` when the number changes. */
    setInset(next: number) {
      if (inset === next) return;
      inset = next;
      for (const listener of insetListeners) listener();
    },

    subscribeOverlap(listener: () => void) {
      overlapListeners.add(listener);
      return () => {
        overlapListeners.delete(listener);
      };
    },
    getOverlap: () => overlap,
    /** Written by `TabBarRoot` when its placement changes the overlap. */
    setOverlap(next: number) {
      if (overlap === next) return;
      overlap = next;
      for (const listener of overlapListeners) listener();
    },
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
 * let screens drive the bar: panels and sheets (`TabPanel`, `useTabPanel`), the override slot
 * (`useTabBarOverride`), companions (`TabBarCompanion`), minimize on scroll
 * (`useMinimizeOnScroll`), live tabs (`useLiveTab`) and `useTabBarInset()`. Without it those
 * APIs are inert and the bar renders as it always has.
 *
 * It may also sit higher, around the root stack, so a toast host beside the stack can read
 * `useTabBarInset()`. The rule then: one tab navigator per provider, and screens of the root
 * stack (modals, screens pushed over the tabs) don't declare panels, companions or overrides,
 * because they would reach the tab bar underneath.
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

const emptySnapshot: Snapshot = {
  panels: [],
  anchors: {},
  overrideActive: false,
  navigatorFocused: true,
};
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
