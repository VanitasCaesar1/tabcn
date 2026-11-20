/**
 * Draws registered panels behind the bar. Internal: rendered by `TabBarRoot` before its
 * children, so the bar draws over each panel's lower edge and the panel seems to come out
 * from behind it. A panel with snap points is drawn as a sheet.
 * Specs: docs/designs/panels.md, docs/designs/bottom-components.md (Sheets).
 */
import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

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
  warnOnce,
} from './provider';
import type { TabFrame } from './TabList';

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
  snapshot: Snapshot;
  /** The bar's frame relative to `TabBarRoot`. */
  barFrame: TabFrame | null;
  /** Points a panel's bottom edge sits below its anchor's top edge (hidden behind the bar). */
  overlap: number;
  /** Null until the root has laid out; sheets wait for it. */
  geometry: SheetGeometry | null;
}

/**
 * Tells the store whether a screen reader (VoiceOver, TalkBack) is on, so sheets open only
 * to their highest snap point while it is.
 */
function useScreenReaderRule(store: TabBarStore) {
  useEffect(() => {
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

export function PanelLayer({ store, snapshot, barFrame, overlap, geometry }: PanelLayerProps) {
  useScreenReaderRule(store);
  if (snapshot.panels.length === 0) return null;
  // The open panel draws above the peeking ones (later siblings draw on top).
  const ordered = [...snapshot.panels].sort(
    (a, b) => Number(a.state === 'open') - Number(b.state === 'open'),
  );
  const modal = modalPanel(snapshot);
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {ordered.map((panel) => (
        <PanelView
          key={panel.id}
          store={store}
          panel={panel}
          frame={panel.anchor === 'bar' ? barFrame : snapshot.anchors[panel.anchor.name]}
          overlap={overlap}
          geometry={geometry}
          modal={modal}
          covered={isCovered(panel, snapshot)}
          barLaidOut={barFrame != null}
        />
      ))}
    </View>
  );
}

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

function PanelView({
  store,
  panel,
  frame,
  overlap,
  geometry,
  modal,
  covered,
  barLaidOut,
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
}) {
  const { id, state, snap, peekHeight, leaving, snapPoints } = panel;
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
  const lastModal = useRef(false);
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
      if (contentRef.current) AccessibilityInfo.sendAccessibilityEvent(contentRef.current, 'focus');
    };
    const key = `${state}:${snap}:${covered}`;
    const becomingModal = selfModal && !lastModal.current;
    lastModal.current = selfModal;
    if (lastKey.current === null) {
      visible.value = target;
      lastKey.current = key;
      if (leaving) remove();
      else if (becomingModal) focus();
      return;
    }
    const done =
      leaving || becomingModal
        ? (finished?: boolean) => {
            'worklet';
            if (!finished) return;
            if (leaving) runOnJS(remove)();
            else runOnJS(focus)();
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

  // Drag handle for 'tabcn/gestures'.
  const handle = useMemo<PanelHandle>(
    () => ({
      visible,
      openVisible,
      restVisible,
      minVisible,
      stops,
      settle: (stop: number) => {
        const current = store.getSnapshot().panels.find((p) => p.id === id);
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
  const windowFrame = sheet
    ? { left: sheet.left, width: sheet.width, top: sheet.top, height: sheet.contentHeight }
    : {
        left: anchor.x,
        width: anchor.width,
        // Bottom edge `overlap` points below the anchor's top edge, behind the bar.
        top: anchor.y + overlap - contentHeight,
      };

  return (
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
        <PanelContext value={context}>{panel.content}</PanelContext>
      </Animated.View>
    </View>
  );
}
