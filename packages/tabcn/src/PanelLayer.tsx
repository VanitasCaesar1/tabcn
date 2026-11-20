/**
 * Draws registered panels behind the bar. Internal: rendered by `TabBarRoot` before its
 * children, so the bar draws over each panel's lower edge and the panel seems to come out
 * from behind it. Spec: docs/designs/panels.md.
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
import {
  anyPanelOpen,
  type PanelHandle,
  type PanelRecord,
  restingState,
  type Snapshot,
  type TabBarStore,
  warnOnce,
} from './provider';
import type { TabFrame } from './TabList';

interface PanelLayerProps {
  store: TabBarStore;
  snapshot: Snapshot;
  /** The bar's frame relative to `TabBarRoot`. */
  barFrame: TabFrame | null;
  /** Points a panel's bottom edge sits below its anchor's top edge (hidden behind the bar). */
  overlap: number;
}

export function PanelLayer({ store, snapshot, barFrame, overlap }: PanelLayerProps) {
  if (snapshot.panels.length === 0) return null;
  // The open panel draws above the peeking ones (later siblings draw on top).
  const ordered = [...snapshot.panels].sort(
    (a, b) => Number(a.state === 'open') - Number(b.state === 'open'),
  );
  const modal = anyPanelOpen(snapshot);
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {ordered.map((panel) => (
        <PanelView
          key={panel.id}
          store={store}
          panel={panel}
          frame={panel.anchor === 'bar' ? barFrame : snapshot.anchors[panel.anchor.name]}
          overlap={overlap}
          modal={modal}
          barLaidOut={barFrame != null}
        />
      ))}
    </View>
  );
}

/** How long a laid-out bar gets to measure a panel's named anchor before tabcn warns. */
const ANCHOR_GRACE_MS = 1000;

function targetVisible(state: PanelRecord['state'], peekHeight: number, contentHeight: number) {
  if (state === 'open') return contentHeight;
  if (state === 'peek') return Math.min(peekHeight, contentHeight);
  return 0;
}

function PanelView({
  store,
  panel,
  frame,
  overlap,
  modal,
  barLaidOut,
}: {
  store: TabBarStore;
  panel: PanelRecord;
  frame: TabFrame | null | undefined;
  overlap: number;
  /** A panel is open: every other panel is hidden from screen readers. */
  modal: boolean;
  /** The bar has laid out, so its anchors have been measured (or are about to be). */
  barLaidOut: boolean;
}) {
  const { id, state, peekHeight, leaving } = panel;
  const [contentHeight, setContentHeight] = useState(0);
  const measured = contentHeight > 0 && !!frame;
  const target = targetVisible(state, peekHeight, contentHeight);
  const rest = restingState(panel);

  const visible = useSharedValue(0);
  const openVisible = useSharedValue(0);
  const restVisible = useSharedValue(0);
  const lastState = useRef<PanelRecord['state'] | null>(null);
  const contentRef = useRef<ComponentRef<typeof View>>(null);

  // State changes glide on tabcnSpring; size changes ease with tabcnTiming. Both finish
  // instantly with "reduce motion". A leaving panel is removed once it is hidden; a panel
  // that opens takes screen-reader focus once it is in place.
  useEffect(() => {
    openVisible.value = contentHeight;
    restVisible.value = targetVisible(rest, peekHeight, contentHeight);
    if (!measured) {
      if (leaving) store.removePanel(id);
      return;
    }
    const remove = () => store.removePanel(id);
    const focus = () => {
      if (contentRef.current) AccessibilityInfo.sendAccessibilityEvent(contentRef.current, 'focus');
    };
    const opening = state === 'open' && !leaving && lastState.current !== 'open';
    if (lastState.current === null) {
      visible.value = target;
      lastState.current = state;
      if (leaving) remove();
      else if (opening) focus();
      return;
    }
    const done =
      leaving || opening
        ? (finished?: boolean) => {
            'worklet';
            if (!finished) return;
            if (leaving) runOnJS(remove)();
            else runOnJS(focus)();
          }
        : undefined;
    visible.value =
      lastState.current !== state
        ? withSpring(target, tabcnSpring, done)
        : withTiming(target, tabcnTiming, done);
    lastState.current = state;
  }, [
    store,
    id,
    state,
    target,
    rest,
    peekHeight,
    contentHeight,
    measured,
    leaving,
    visible,
    openVisible,
    restVisible,
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
      settle: (open: boolean) => {
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
        store.setPanelState(id, open ? 'open' : restingState(current));
      },
    }),
    [store, id, visible, openVisible, restVisible],
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

  const anchor = frame ?? { x: 0, y: 0, width: 0, height: 0 };
  const shown = state !== 'hidden' && !leaving;
  const exposed = shown && (open || !modal);

  return (
    <View
      pointerEvents={shown ? 'box-none' : 'none'}
      importantForAccessibility={exposed ? 'auto' : 'no-hide-descendants'}
      accessibilityElementsHidden={!exposed}
      accessibilityViewIsModal={open}
      onAccessibilityEscape={open ? () => store.setPanelState(id, rest) : undefined}
      style={{
        position: 'absolute',
        left: anchor.x,
        width: anchor.width,
        // Bottom edge `overlap` points below the anchor's top edge, behind the bar.
        top: anchor.y + overlap - contentHeight,
        // The panel's own window clips it, so a hidden panel taller than the bar
        // never shows below a floating bar.
        overflow: 'hidden',
        opacity: measured ? 1 : 0,
      }}
    >
      <Animated.View
        ref={contentRef}
        style={contentStyle}
        onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
      >
        {panel.content}
      </Animated.View>
    </View>
  );
}
