/**
 * Draws registered panels behind the bar. Internal: rendered by `TabBarRoot` before its
 * children, so the bar draws over each panel's lower edge and the panel seems to come out
 * from behind it. A panel with snap points is drawn as a sheet.
 * Specs: docs/designs/panels.md, docs/designs/bottom-components.md (Sheets).
 */
import {
  type ComponentRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { physicalLeft } from './indicator';
import { tabcnSpring, tabcnTiming } from './motion';
import { PanelContext, type PanelContextValue } from './panel-context';
import {
  isCovered,
  isModal,
  modalPanel,
  type PanelHandle,
  type PanelRecord,
  restingState,
  type SnapPoint,
  type Snapshot,
  type TabBarStore,
  useStoreSelector,
  warnOnce,
} from './provider';
import type { TabFrame } from './TabList';

/** Where a panel rests, to tell whether something moved it during a drag. */
const dragStamp = (panel: { state: string; snap: number }) => `${panel.state}:${panel.snap}`;

/** The bit of the DOM's `document` the web Escape handler uses (the package has no DOM types). */
interface KeyTarget {
  addEventListener(type: 'keydown', listener: (event: { key: string }) => void): void;
  removeEventListener(type: 'keydown', listener: (event: { key: string }) => void): void;
}

/** Where the root sits on screen, so sheets can size themselves without measuring the window. */
export interface SheetGeometry {
  /** The root's own size. */
  width: number;
  height: number;
  /** A sheet's inset from the root's left and right edges (a docked root spans the safe areas). */
  left: number;
  right: number;
  /** Points from the top safe-area edge down to the root's top edge. */
  roomAboveRoot: number;
  /** Points from the root's bottom edge down to the screen's bottom edge. */
  belowRoot: number;
  /** A docked bar: sheets end at its top edge instead of the screen's bottom edge. */
  docked: boolean;
}

interface PanelLayerProps {
  store: TabBarStore;
  panels: readonly PanelRecord[];
  /** The bar's frame relative to `TabBarRoot`. */
  barFrame: TabFrame | null;
  /** Points a panel's bottom edge sits below its anchor's top edge (hidden behind the bar). */
  overlap: number;
  /** Null until the root has laid out; sheets wait for it. */
  geometry: SheetGeometry | null;
  /**
   * 0 to 1 while a `coversBar` panel opens over a floating bar: the bar slides away and that
   * panel's window moves down by the bar's height. Always 0 under other bars.
   */
  cover: SharedValue<number>;
}

/**
 * Tells the store whether a screen reader (VoiceOver, TalkBack) is on, so sheets open only
 * to their highest snap point while it is.
 */
function useScreenReaderRule(store: TabBarStore) {
  useEffect(() => {
    // react-native-web always reports a screen reader as on, which would hold every sheet at
    // its highest snap point on the web; there is no reliable way to tell there, so assume off.
    if (Platform.OS === 'web') return;
    let live = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((on) => {
        if (live) store.setScreenReader(on);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', (on: boolean) =>
      store.setScreenReader(on),
    );
    return () => {
      live = false;
      sub?.remove();
      store.setScreenReader(false);
    };
  }, [store]);
}

const selectAnchors = (s: Snapshot) => s.anchors;

/**
 * Memoised, as is each panel: the root re-renders for things that don't touch them (its own
 * size, the keyboard), and each panel's content has its own subscription (see `PanelContent`).
 */
export const PanelLayer = memo(function PanelLayer({
  store,
  panels,
  barFrame,
  overlap,
  geometry,
  cover,
}: PanelLayerProps) {
  useScreenReaderRule(store);
  const anchors = useStoreSelector(store, selectAnchors);
  if (panels.length === 0) return null;
  // The open panel draws above the peeking ones (later siblings draw on top).
  const ordered = [...panels].sort(
    (a, b) => Number(a.state === 'open') - Number(b.state === 'open'),
  );
  const modal = modalPanel(panels);
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {ordered.map((panel) => (
        <PanelView
          key={panel.id}
          store={store}
          panel={panel}
          frame={panel.anchor === 'bar' ? barFrame : anchors[panel.anchor.name]}
          overlap={overlap}
          geometry={geometry}
          modal={modal}
          covered={isCovered(panel, panels)}
          barLaidOut={barFrame != null}
          cover={cover}
        />
      ))}
    </View>
  );
});

/** A sheet's layout: its window, its content's fixed height and the heights it rests at. */
export interface SheetLayout {
  /** The window's frame relative to the root. */
  left: number;
  width: number;
  top: number;
  /** The content's height (and the window's): laid out once, at the highest snap point. */
  contentHeight: number;
  /** Visible points at each snap point, lowest first. */
  snapVisible: number[];
  /** Visible points while peeking. */
  peekVisible: number;
  /** Visible points while hidden: below 0 when the sheet sinks below the screen's edge. */
  hiddenVisible: number;
  /** Points of the content's bottom that never show (behind the bar and below the screen). */
  hiddenBottom: number;
}

/**
 * Resolves a sheet's snap points and window. Visible points are measured, as for every
 * panel, from the window's reference line `overlap` points below the anchor's top edge, so
 * a snap point of `h` shows `h` points above the anchor's top edge. A percentage is a share
 * of the room between that edge and the top safe area. Under a floating bar the window runs
 * down to the screen's bottom edge and a hidden sheet sits fully below it; under a docked bar
 * it ends at the bar's top edge, as other docked panels do.
 */
export function resolveSheet(
  snapPoints: readonly SnapPoint[],
  peekHeight: number,
  frame: TabFrame,
  overlap: number,
  geometry: SheetGeometry,
): SheetLayout {
  const room = Math.max(0, geometry.roomAboveRoot + frame.y);
  const heights = snapPoints.map((point) => {
    const points = typeof point === 'number' ? point : (Number.parseFloat(point) / 100) * room;
    return Math.min(room, Math.max(0, Number.isFinite(points) ? points : 0));
  });
  const snapVisible = heights.map((h) => h + overlap);
  const highest = Math.max(0, ...snapVisible);
  const below = geometry.docked ? 0 : geometry.height - (frame.y + overlap) + geometry.belowRoot;
  return {
    left: geometry.left,
    width: Math.max(0, geometry.width - geometry.left - geometry.right),
    top: frame.y + overlap - highest,
    contentHeight: highest + below,
    snapVisible,
    peekVisible: Math.min(peekHeight, highest),
    hiddenVisible: below === 0 ? 0 : -below,
    hiddenBottom: overlap + below,
  };
}

/** How long a laid-out bar gets to measure a panel's named anchor before tabcn warns. */
const ANCHOR_GRACE_MS = 1000;

/** Visible points for each state of a plain panel (no snap points). */
function plainVisible(state: PanelRecord['state'], peekHeight: number, contentHeight: number) {
  if (state === 'open') return contentHeight;
  if (state === 'peek') return Math.min(peekHeight, contentHeight);
  return 0;
}

/** Visible points for each state of a sheet. */
function sheetVisible(state: PanelRecord['state'], snap: number, sheet: SheetLayout) {
  if (state === 'open') return sheet.snapVisible[Math.max(0, snap)] ?? 0;
  if (state === 'peek') return sheet.peekVisible;
  return sheet.hiddenVisible;
}

/** The panel's content and backdrop, read through the panel's own subscription. */
function usePanelContent(store: TabBarStore, id: string) {
  const subscribe = useCallback(
    (listener: () => void) => store.subscribePanelContent(id, listener),
    [store, id],
  );
  const get = useCallback(() => store.getPanelContent(id), [store, id]);
  return useSyncExternalStore(subscribe, get, get);
}

const PanelView = memo(function PanelView({
  store,
  panel,
  frame,
  overlap,
  geometry,
  modal,
  covered,
  barLaidOut,
  cover,
}: {
  store: TabBarStore;
  panel: PanelRecord;
  frame: TabFrame | null | undefined;
  overlap: number;
  geometry: SheetGeometry | null;
  /** A panel is modal: every other panel is hidden from screen readers. */
  modal: boolean;
  /** Peeking, with another panel open on its anchor: drawn hidden until that one rests. */
  covered: boolean;
  /** The bar has laid out, so its anchors have been measured (or are about to be). */
  barLaidOut: boolean;
  cover: SharedValue<number>;
}) {
  const { id, state, snap, peekHeight, leaving, snapPoints } = panel;
  const { content, backdrop: backdropElement } = usePanelContent(store, id);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const sheet =
    snapPoints.length > 0 && frame && geometry
      ? resolveSheet(snapPoints, peekHeight, frame, overlap, geometry)
      : null;
  const isSheet = snapPoints.length > 0;
  const contentHeight = sheet ? sheet.contentHeight : measuredHeight;
  const measured = isSheet ? !!sheet && sheet.contentHeight > 0 : measuredHeight > 0 && !!frame;
  const rest = restingState(panel);
  const visibleFor = (s: PanelRecord['state'], index: number) =>
    sheet ? sheetVisible(s, index, sheet) : plainVisible(s, peekHeight, contentHeight);
  const target = visibleFor(covered ? 'hidden' : state, snap);
  const restTarget = visibleFor(rest, -1);
  const openTarget = sheet ? Math.max(0, ...sheet.snapVisible) : contentHeight;
  const minTarget = sheet ? sheet.hiddenVisible : 0;
  // Joined into a string so the effect below only runs when a height actually changes.
  const stopsKey = [restTarget, ...(sheet ? sheet.snapVisible : [contentHeight])].join(',');
  const selfModal = isModal(panel);

  const visible = useSharedValue(0);
  const openVisible = useSharedValue(0);
  const restVisible = useSharedValue(0);
  const minVisible = useSharedValue(0);
  const stops = useSharedValue<number[]>([0, 0]);
  const lastKey = useRef<string | null>(null);
  // Where the store's state puts the panel, for a drag the store doesn't accept (see `settle`).
  const glideTarget = useRef(target);
  // The panel's state and snap when a drag took it. If something else moves the panel during
  // the drag (Android back, a tab switch, \`hide()\`), the drag must not undo that on release.
  const dragStart = useRef<string | null>(null);
  const lastModal = useRef(false);
  const pendingFocus = useRef(false);
  const contentRef = useRef<ComponentRef<typeof View>>(null);

  // State, snap and cover changes glide on tabcnSpring; size changes (content, rotation) ease
  // with tabcnTiming. Both finish instantly with "reduce motion". A leaving panel is removed once
  // it is hidden; a panel that becomes modal takes screen-reader focus once it is in place.
  useEffect(() => {
    glideTarget.current = target;
    openVisible.value = openTarget;
    restVisible.value = restTarget;
    minVisible.value = minTarget;
    stops.value = stopsKey.split(',').map(Number);
    if (!measured) {
      if (leaving) store.removePanel(id);
      return;
    }
    const remove = () => store.removePanel(id);
    const focus = () => {
      // react-native-web has no sendAccessibilityEvent: calling it there threw.
      if (contentRef.current && typeof AccessibilityInfo.sendAccessibilityEvent === 'function') {
        AccessibilityInfo.sendAccessibilityEvent(contentRef.current, 'focus');
      }
    };
    const key = `${state}:${snap}:${covered}`;
    const becomingModal = selfModal && !lastModal.current;
    lastModal.current = selfModal;
    // Focus moves in once the panel is in place. Kept pending across re-runs: if the open
    // animation is retargeted (its content resized as it opened), the first one ends unfinished
    // and focus would never move.
    if (becomingModal) pendingFocus.current = true;
    if (!selfModal) pendingFocus.current = false;
    const settleFocus = () => {
      if (!pendingFocus.current) return;
      pendingFocus.current = false;
      focus();
    };
    if (lastKey.current === null) {
      visible.value = target;
      lastKey.current = key;
      if (leaving) remove();
      else settleFocus();
      return;
    }
    const done =
      leaving || pendingFocus.current
        ? (finished?: boolean) => {
            'worklet';
            if (!finished) return;
            if (leaving) runOnJS(remove)();
            else runOnJS(settleFocus)();
          }
        : undefined;
    visible.value =
      lastKey.current !== key
        ? withSpring(target, tabcnSpring, done)
        : withTiming(target, tabcnTiming, done);
    lastKey.current = key;
  }, [
    store,
    id,
    state,
    snap,
    covered,
    selfModal,
    target,
    openTarget,
    restTarget,
    minTarget,
    stopsKey,
    measured,
    leaving,
    visible,
    openVisible,
    restVisible,
    minVisible,
    stops,
  ]);

  // A panel anchored to a name no element in the bar marks with `usePanelAnchor` has nowhere
  // to draw and stays invisible. Say so in development, once the bar has had time to measure
  // its anchors.
  const anchorName = panel.anchor === 'bar' ? null : panel.anchor.name;
  const anchorMissing = anchorName !== null && barLaidOut && !frame;
  useEffect(() => {
    if (!__DEV__ || !anchorMissing || anchorName === null) return;
    const timer = setTimeout(() => {
      if (store.getSnapshot().anchors[anchorName]) return;
      warnOnce(
        `<TabPanel id="${id}"> is anchored to "${anchorName}", but no element in the tab bar ` +
          `uses usePanelAnchor('${anchorName}'), so the panel can't be shown. Use a bar that ` +
          `marks that element, or anchor the panel to 'bar'.`,
      );
    }, ANCHOR_GRACE_MS);
    return () => clearTimeout(timer);
  }, [store, id, anchorName, anchorMissing]);

  // Drag handle for 'react-native-tabcn/gestures'.
  const handle = useMemo<PanelHandle>(
    () => ({
      visible,
      openVisible,
      restVisible,
      minVisible,
      stops,
      begin: () => {
        const current = store.getSnapshot().panels.find((p) => p.id === id);
        dragStart.current = current ? dragStamp(current) : null;
      },
      settle: (stop: number) => {
        const current = store.getSnapshot().panels.find((p) => p.id === id);
        const started = dragStart.current;
        dragStart.current = null;
        if (!current) return;
        if (current.leaving) {
          // Released mid-drag: the drag cancelled the slide out, so slide out again and
          // remove the panel at the end, whatever the drag asked for.
          const remove = () => store.removePanel(id);
          visible.value = withSpring(0, tabcnSpring, (finished) => {
            'worklet';
            if (finished) runOnJS(remove)();
          });
          return;
        }
        if (started !== null && started !== dragStamp(current)) {
          // Moved by something else while the finger was down: that wins. Glide to where the
          // store has the panel now instead of the stop the drag was let go at.
          visible.value = withSpring(glideTarget.current, tabcnSpring);
          return;
        }
        if (stop <= 0) store.setPanelState(id, restingState(current));
        else store.setPanelState(id, 'open', stop - 1);
        // The drag has already started gliding to the stop it was let go at. The store can keep
        // the panel where it was instead (a screen reader holds a sheet at its highest snap
        // point): then nothing changes, the effect above doesn't run, and the panel would rest
        // at a stop the store doesn't report. Glide back to where the store has it.
        if (store.getSnapshot().panels.find((p) => p.id === id) === current) {
          visible.value = withSpring(glideTarget.current, tabcnSpring);
        }
      },
    }),
    [store, id, visible, openVisible, restVisible, minVisible, stops],
  );
  useEffect(() => {
    store.setHandle(id, handle);
    return () => store.deleteHandle(id, handle);
  }, [store, id, handle]);

  const open = state === 'open' && !leaving;

  // Android back returns an open panel to rest, unless a screen pushed over the tab
  // navigator is showing: that screen's back comes first.
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!store.isNavigatorFocused()) return false;
      store.setPanelState(id, rest);
      return true;
    });
    return () => sub.remove();
  }, [open, store, id, rest]);

  // On the web, Escape does what Android back does: an open panel returns to rest.
  useEffect(() => {
    const doc = (globalThis as { document?: KeyTarget }).document;
    if (!open || Platform.OS !== 'web' || !doc) return;
    const onKey = (event: { key: string }) => {
      if (event.key === 'Escape' && store.isNavigatorFocused()) store.setPanelState(id, rest);
    };
    doc.addEventListener('keydown', onKey);
    return () => doc.removeEventListener('keydown', onKey);
  }, [open, store, id, rest]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: openVisible.value - visible.value }],
  }));

  const hiddenBottom = sheet ? sheet.hiddenBottom : 0;
  const context = useMemo<PanelContextValue>(
    () => ({ id, sheet: isSheet, hiddenBottom }),
    [id, isSheet, hiddenBottom],
  );

  const anchor = frame ?? { x: 0, y: 0, width: 0, height: 0 };
  const shown = state !== 'hidden' && !leaving && !covered;
  const exposed = shown && (selfModal || !modal);
  // Frames are physical (measured from the left edge); in a right-to-left layout React Native
  // reads `left` as the start edge, the right, so pin to the physical left as the indicator does.
  const physical = (x: number) => ('left' in physicalLeft() ? { left: x } : { right: x });
  const windowFrame = sheet
    ? { ...physical(sheet.left), width: sheet.width, top: sheet.top, height: sheet.contentHeight }
    : {
        ...physical(anchor.x),
        width: anchor.width,
        // Bottom edge `overlap` points below the anchor's top edge, behind the bar.
        top: anchor.y + overlap - contentHeight,
      };

  // A panel that covers the bar moves down into the bar's place as the bar slides away.
  const coversBar = panel.coversBar;
  const barHeight = anchor.height;
  const windowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: coversBar ? cover.value * barHeight : 0 }],
  }));
  // The backdrop fades with the panel's own slide, between where it rests and open.
  const backdropStyle = useAnimatedStyle(() => {
    const span = openVisible.value - restVisible.value;
    const t = span > 0 ? (visible.value - restVisible.value) / span : 0;
    return { opacity: Math.min(1, Math.max(0, t)) };
  });
  const backdrop =
    panel.hasBackdrop && backdropElement != null ? (
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[
          styles.backdrop,
          {
            // The whole screen, past the root on every side (sheets reach above it too).
            top: -(geometry?.roomAboveRoot ?? 0) - SCREEN_MARGIN,
            bottom: -(geometry?.belowRoot ?? 0) - SCREEN_MARGIN,
          },
          backdropStyle,
        ]}
      >
        <Pressable
          accessible={false}
          style={StyleSheet.absoluteFill}
          onPress={() => store.setPanelState(id, rest)}
        >
          {backdropElement}
        </Pressable>
      </Animated.View>
    ) : null;

  const panelWindow = (
    <View
      pointerEvents={shown ? 'box-none' : 'none'}
      importantForAccessibility={exposed ? 'auto' : 'no-hide-descendants'}
      accessibilityElementsHidden={!exposed}
      accessibilityViewIsModal={selfModal}
      onAccessibilityEscape={open ? () => store.setPanelState(id, rest) : undefined}
      style={{
        position: 'absolute',
        ...windowFrame,
        // The panel's own window clips it, so a hidden panel taller than the bar
        // never shows below a floating bar.
        overflow: 'hidden',
        opacity: measured ? 1 : 0,
      }}
    >
      <Animated.View
        ref={contentRef}
        // A sheet's content is laid out once, at its highest snap point.
        style={[sheet ? { height: sheet.contentHeight } : null, contentStyle]}
        onLayout={isSheet ? undefined : (e) => setMeasuredHeight(e.nativeEvent.layout.height)}
      >
        <PanelContext value={context}>{content}</PanelContext>
      </Animated.View>
    </View>
  );

  return (
    <>
      {backdrop}
      {coversBar ? (
        <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, windowStyle]}>
          {panelWindow}
        </Animated.View>
      ) : (
        panelWindow
      )}
    </>
  );
});

/** How far a backdrop reaches past the root's frame: covers the status bar and the edges. */
const SCREEN_MARGIN = 120;

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', left: -SCREEN_MARGIN, right: -SCREEN_MARGIN },
});
