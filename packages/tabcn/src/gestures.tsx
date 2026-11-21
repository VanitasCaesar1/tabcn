/**
 * tabcn/gestures: dragging for panels and sheets, and scrubbing the bar. A separate entry
 * point because it imports react-native-gesture-handler, an optional peer: apps that don't
 * drag never load it.
 * Specs: docs/designs/panels.md, docs/designs/bottom-components.md (Sheets, Scrub the bar).
 */
import {
  type ComponentRef,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  type AnimatedScrollViewProps,
  runOnJS,
  type SharedValue,
  useAnimatedScrollHandler,
  useComposedEventHandler,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { tabcnSpring } from './motion';
import { usePanelContext } from './panel-context';
import { type PanelHandle, useTabBarProvider, warnOnce } from './provider';
import { AT_STOP, settleStop } from './sheet-math';
import { type TabItem, useTabBar } from './state';
import { type TabFrame, TabListContext, type TabListContextValue } from './TabList';

const noopSubscribe = () => () => {};

/** Ends a drag on the UI thread: glides to the chosen stop and tells the store. */
function finishDrag(handle: PanelHandle, velocity: number) {
  'worklet';
  const stops = handle.stops.value;
  const index = settleStop(stops, handle.visible.value, velocity);
  handle.visible.value = withSpring(stops[index] ?? 0, tabcnSpring);
  runOnJS(handle.settle)(index);
}

/** Moves the panel to `start - translationY`, held between hidden and its highest stop. */
function dragTo(handle: PanelHandle, start: number, translationY: number) {
  'worklet';
  const next = start - translationY;
  handle.visible.value = Math.min(
    handle.openVisible.value,
    Math.max(handle.minVisible.value, next),
  );
}

/** The drag handle of panel `id` (or of the enclosing panel), once the panel layer has drawn it. */
function usePanelHandle(caller: string, id: string | undefined) {
  const store = useTabBarProvider()?.store;
  const context = usePanelContext();
  const panel = id ?? context?.id;
  if (!panel) warnOnce(`${caller} needs a \`panel\` id outside a panel's content.`);
  const handle = useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    () => (panel ? store?.getHandle(panel) : undefined),
    () => undefined,
  );
  return { panel: panel ?? '', handle, context };
}

/**
 * Makes its children a drag handle for a panel: inside a panel's content it drives that
 * panel; elsewhere pass its id as `panel`. While dragging, the panel follows the finger; on
 * release it settles on the nearest stop (its resting state, its open height, or a sheet's
 * snap points), or moves one stop in the flick's direction when released fast. A sheet
 * dragged below its lowest snap point with no peek slides away. Settling uses `tabcnSpring`
 * (no overshoot) and the drag is held between hidden and the highest stop.
 * Needs `react-native-gesture-handler` and a `GestureHandlerRootView` around the app.
 */
export function PanelDragArea({ panel: id, children }: { panel?: string; children?: ReactNode }) {
  const { panel, handle } = usePanelHandle('PanelDragArea', id);
  const start = useSharedValue(0);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetY([-8, 8])
      .failOffsetX([-16, 16])
      .withTestId(`tabcn-drag-${panel}`);
    if (!handle) return pan.enabled(false);
    return pan
      .onStart(() => {
        'worklet';
        start.value = handle.visible.value;
      })
      .onUpdate((e) => {
        'worklet';
        dragTo(handle, start.value, e.translationY);
      })
      .onEnd((e) => {
        'worklet';
        finishDrag(handle, e.velocityY);
      });
  }, [handle, start, panel]);

  return (
    <GestureDetector gesture={gesture}>
      <View collapsable={false}>{children}</View>
    </GestureDetector>
  );
}

/** Who a touch on a `PanelScrollView` moves, decided once per touch. */
const UNDECIDED = 0;
const SHEET = 1;
const CONTENT = 2;
/** Vertical points a finger moves on a `PanelScrollView` before its touch is decided. */
const DECIDE_Y = 8;
/** Sideways points that give the touch away first (to a horizontal list in the content). */
const DECIDE_FAIL_X = 16;

/**
 * Whether a vertical drag of `dy` points (positive is down) on a sheet's scroll view moves
 * the sheet: below the highest stop it always does; at the highest stop only a downward drag
 * from the content's own top does.
 */
function sheetTakesDrag(handle: PanelHandle, offset: SharedValue<number>, dy: number): boolean {
  'worklet';
  const atTop = handle.visible.value >= handle.openVisible.value - AT_STOP;
  return !atTop || (offset.value <= 0 && dy > 0);
}

export type PanelScrollViewProps = AnimatedScrollViewProps & {
  /** The panel it scrolls in. Default: the panel whose content it is drawn in. */
  panel?: string;
};

/**
 * A scroll view for a sheet's content. It scrolls only while the sheet is at its highest
 * snap point; below that, or at the top of its content with a downward drag, a vertical
 * drag moves the sheet instead (and settles it as `PanelDragArea` does). Pads its content's
 * bottom by the part of the sheet hidden behind the bar, so the last row can scroll into
 * view. Takes `Animated.ScrollView`'s props. Not for inverted or virtualised lists in v1.
 * Needs `react-native-gesture-handler` and a `GestureHandlerRootView` around the app.
 */
export function PanelScrollView({
  panel: id,
  contentContainerStyle,
  scrollViewOffset,
  onScroll,
  ...rest
}: PanelScrollViewProps) {
  const { panel, handle, context } = usePanelHandle('PanelScrollView', id);
  const ownOffset = useSharedValue(0);
  // The content's scroll offset, tracked on the UI thread (the caller's, if it passes one).
  const offset = scrollViewOffset ?? ownOffset;
  // Tracked with a scroll handler, not Animated.ScrollView's `scrollViewOffset`: that one
  // needs the scroll view's own animated ref, and GestureDetector puts its ref there instead
  // (it crashes with "animatedRef.observe is not a function"). A caller's `onScroll` made
  // with useAnimatedScrollHandler still runs.
  const track = useAnimatedScrollHandler((e) => {
    offset.value = e.contentOffset.y;
  });
  const handleScroll = useComposedEventHandler([
    track,
    (onScroll ?? null) as Parameters<typeof useComposedEventHandler>[0][number],
  ]);
  const start = useSharedValue(0);
  const mode = useSharedValue(UNDECIDED);
  const touchX = useSharedValue(0);
  const touchY = useSharedValue(0);
  const decided = useSharedValue(false);

  // The sheet's pan and the native scroll never run together. The pan decides each touch
  // once, after a few points of vertical movement: it activates when the sheet takes the
  // drag, and fails otherwise. The native scroll waits for it to fail (`Exclusive`), so while
  // the sheet moves the content never scrolls, and no scroll momentum is left over when the
  // sheet settles. A touch that moves the content keeps moving the content until it lifts.
  const gesture = useMemo(() => {
    const native = Gesture.Native();
    const pan = Gesture.Pan().manualActivation(true).withTestId(`tabcn-scroll-${panel}`);
    if (!handle) return Gesture.Simultaneous(pan.enabled(false), native);
    return Gesture.Exclusive(
      pan
        .onTouchesDown((e) => {
          'worklet';
          const touch = e.allTouches[0];
          if (!touch || decided.value) return;
          touchX.value = touch.absoluteX;
          touchY.value = touch.absoluteY;
        })
        .onTouchesMove((e, manager) => {
          'worklet';
          const touch = e.allTouches[0];
          if (!touch || decided.value) return;
          const dx = touch.absoluteX - touchX.value;
          const dy = touch.absoluteY - touchY.value;
          if (Math.abs(dy) < DECIDE_Y) {
            if (Math.abs(dx) > DECIDE_FAIL_X) {
              decided.value = true;
              manager.fail();
            }
            return;
          }
          decided.value = true;
          if (sheetTakesDrag(handle, offset, dy)) manager.activate();
          else manager.fail();
        })
        .onStart(() => {
          'worklet';
          mode.value = UNDECIDED;
        })
        .onUpdate((e) => {
          'worklet';
          if (mode.value === UNDECIDED) {
            // The same rule the touch was activated by, so a touch never switches halfway.
            mode.value = sheetTakesDrag(handle, offset, e.translationY) ? SHEET : CONTENT;
            // Start from where the sheet is, so it doesn't jump by the points already moved.
            start.value = handle.visible.value + e.translationY;
          }
          if (mode.value === SHEET) dragTo(handle, start.value, e.translationY);
        })
        .onEnd((e) => {
          'worklet';
          if (mode.value === SHEET) finishDrag(handle, e.velocityY);
        })
        .onFinalize(() => {
          'worklet';
          mode.value = UNDECIDED;
          decided.value = false;
        }),
      native,
    );
  }, [handle, panel, start, mode, offset, touchX, touchY, decided]);

  // The part of the sheet that never shows is added to the content's own bottom padding.
  const own = StyleSheet.flatten(contentContainerStyle as never) as
    | { paddingBottom?: unknown; paddingVertical?: unknown; padding?: unknown }
    | undefined;
  const ownBottom = [own?.paddingBottom, own?.paddingVertical, own?.padding].find(
    (v): v is number => typeof v === 'number',
  );
  const paddingBottom = (ownBottom ?? 0) + (context?.hiddenBottom ?? 0);
  return (
    <GestureDetector gesture={gesture}>
      <Animated.ScrollView
        scrollEventThrottle={16}
        {...rest}
        onScroll={handleScroll}
        contentContainerStyle={[contentContainerStyle, { paddingBottom }]}
      />
    </GestureDetector>
  );
}

// Scrub the bar --------------------------------------------------------------------------

/** Sideways points a finger moves before a scrub starts (a tap never gets there). */
const SCRUB_START_X = 10;
/** Vertical points that give the touch away first: the home-indicator swipe, a scroll. */
const SCRUB_FAIL_Y = 12;
/**
 * How long after touching down a sideways drag can still start a scrub. A finger that held
 * still this long has fired the tab's long press (Pressable's default delay), so the touch
 * stays with the tab instead.
 */
const SCRUB_START_MS = 500;
/** Points above or below the tabs a finger can lift and still choose the tab under it. */
const SCRUB_LIFT_SLOP = 44;
/** How long a committed tab may take to become active before the indicator lets go. */
const SCRUB_COMMIT_MS = 500;

/**
 * The index of the tab under `x` (points from the list's left edge): the tab whose frame
 * holds it, or the nearest one when `x` is in a gap or past either end. -1 with no frames.
 * Frames are physical (left to right) in either layout direction, so this is too.
 */
function tabAt(frames: Record<number, TabFrame>, count: number, x: number): number {
  'worklet';
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < count; i++) {
    const frame = frames[i];
    if (!frame) continue;
    const distance =
      x < frame.x ? frame.x - x : x > frame.x + frame.width ? x - frame.x - frame.width : 0;
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Where the indicator goes while the finger is at `x` over tab `index`: as big as that tab,
 * centred on the finger and kept between the first and last tabs' outer edges. With
 * `snap` (reduce motion) it is the tab's own frame, so the indicator moves tab by tab.
 */
function scrubTarget(
  frames: Record<number, TabFrame>,
  count: number,
  x: number,
  index: number,
  snap: boolean,
): TabFrame | null {
  'worklet';
  const frame = frames[index];
  if (!frame) return null;
  if (snap) return frame;
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < count; i++) {
    const f = frames[i];
    if (!f) continue;
    left = Math.min(left, f.x);
    right = Math.max(right, f.x + f.width);
  }
  const start = Math.min(Math.max(x - frame.width / 2, left), right - frame.width);
  return { x: start, y: frame.y, width: frame.width, height: frame.height };
}

/** Whether `y` is close enough to the tabs' rows to choose a tab by lifting there. */
function nearTabs(frames: Record<number, TabFrame>, count: number, y: number): boolean {
  'worklet';
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < count; i++) {
    const f = frames[i];
    if (!f) continue;
    top = Math.min(top, f.y);
    bottom = Math.max(bottom, f.y + f.height);
  }
  return y >= top - SCRUB_LIFT_SLOP && y <= bottom + SCRUB_LIFT_SLOP;
}

export interface TabScrubProps {
  /**
   * Runs on the JS thread each time the finger slides onto another tab while scrubbing
   * (not when the scrub starts). Play a selection haptic here.
   */
  onTabCross?: (tab: TabItem) => void;
  /**
   * Runs on the JS thread when a scrub starts, with the tab under the finger. Show a label
   * for the tab under the finger here (and update it in `onTabCross`).
   */
  onScrubStart?: (tab: TabItem) => void;
  /**
   * Runs on the JS thread when a scrub ends: with the tab the finger lifted on, or `null`
   * when it lifted far above or below the bar or the system took the touch. Runs before
   * that tab is pressed. Lifting on the active tab passes the active tab.
   */
  onScrubEnd?: (tab: TabItem | null) => void;
  /** Turns scrubbing off; the list still works as a plain `TabList`. Default true. */
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * A `TabList` you can scrub: press, then slide a finger along the bar to move through the
 * tabs, and lift to choose the tab under it, as on iOS 26's tab bar. Use it in place of
 * `TabList`, with the same children (a `TabIndicator`, then the `TabButton`s).
 *
 * While scrubbing, `TabIndicator` (and `useTabIndicator`) follows the finger: it keeps the
 * size of the tab under the finger, centred on the finger and held between the first and
 * last tabs, gliding on the indicator's spring (critically damped, so it trails the finger
 * and never passes it). With "reduce motion" on it moves tab by tab instead. Lifting on
 * another tab presses it (the navigator's `tabPress` event, so `preventDefault` still
 * works); lifting on the active tab, lifting far above or below the bar, or the system
 * taking the touch changes nothing.
 *
 * A tap is still a tap: a scrub starts only after a sideways drag of a few points, and a
 * vertical move first (the home-indicator swipe, a scroll) gives the touch away. A finger
 * that held still for 500 ms (Pressable's long-press delay) doesn't scrub when it then
 * slides: the scrub never starts, so the tab keeps the touch and its long press (such as a
 * sub-tab drawer) still fires, even when the JS thread is slow to report it. Keep the tabs'
 * `delayLongPress` at its default inside `TabScrub`: with a shorter one, a long press and a
 * scrub can both happen. Items in a drawer opened by the long press can't be chosen by
 * sliding: lift, then tap. Works in right-to-left layouts. Screen readers select tabs as before; the list keeps the
 * `tablist` role. Not for a side rail.
 * Needs `react-native-gesture-handler` and a `GestureHandlerRootView` around the app.
 *
 * ```tsx
 * <TabScrub onTabCross={() => Haptics.selectionAsync()}>
 *   <TabIndicator style={styles.lens} />
 *   {tabs.map((tab) => <Tab key={tab.key} tab={tab} />)}
 * </TabScrub>
 * ```
 */
export function TabScrub({
  onTabCross,
  onScrubStart,
  onScrubEnd,
  enabled = true,
  style,
  children,
}: TabScrubProps) {
  const { tabs, activeIndex } = useTabBar();
  const listRef = useRef<ComponentRef<typeof View>>(null);
  const frames = useSharedValue<Record<number, TabFrame>>({});
  const scrub = useSharedValue<TabFrame | null>(null);
  const hovered = useSharedValue(-1);
  const startedAt = useSharedValue(0);
  const downX = useSharedValue(0);
  const downY = useSharedValue(0);
  const decided = useSharedValue(false);
  const inTime = useSharedValue(false);
  const scrubbing = useSharedValue(false);
  const reduceMotion = useReducedMotion();
  const count = tabs.length;

  // The latest tabs and callback, read when the gesture calls back to the JS thread.
  const latest = useRef({ tabs, activeIndex, onTabCross, onScrubStart, onScrubEnd });
  latest.current = { tabs, activeIndex, onTabCross, onScrubStart, onScrubEnd };

  // A tab chosen by lifting stays under the indicator until the navigator makes it active
  // (or, if the press was prevented, for a moment, after which the indicator returns).
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const letGo = useRef(() => {
    if (pending.current !== null) clearTimeout(pending.current);
    pending.current = null;
    scrub.value = null;
  }).current;
  // biome-ignore lint/correctness/useExhaustiveDependencies: let go whenever the active tab changes.
  useEffect(() => {
    if (pending.current !== null) letGo();
  }, [activeIndex, letGo]);
  useEffect(() => letGo, [letGo]);

  const gesture = useMemo(() => {
    const cross = (index: number) => {
      const tab = latest.current.tabs[index];
      if (tab) latest.current.onTabCross?.(tab);
    };
    const start = (index: number) => {
      const tab = latest.current.tabs[index];
      if (tab) latest.current.onScrubStart?.(tab);
    };
    const end = (index: number) => {
      latest.current.onScrubEnd?.(latest.current.tabs[index] ?? null);
    };
    const commit = (index: number) => {
      const { tabs: current, activeIndex: active } = latest.current;
      const tab = current[index];
      if (!tab || index === active) {
        letGo();
        return;
      }
      if (pending.current !== null) clearTimeout(pending.current);
      pending.current = setTimeout(letGo, SCRUB_COMMIT_MS);
      tab.press();
    };
    // The pan activates only by hand: a slide it refuses fails without ever becoming active,
    // so gesture handler never cancels the tab's press or long press.
    return Gesture.Pan()
      .enabled(enabled)
      .manualActivation(true)
      .withTestId('tabcn-scrub')
      .onBegin(() => {
        'worklet';
        startedAt.value = Date.now();
        inTime.value = false;
        scrubbing.value = false;
      })
      .onTouchesDown((e) => {
        'worklet';
        const touch = e.allTouches[0];
        if (!touch || decided.value) return;
        downX.value = touch.absoluteX;
        downY.value = touch.absoluteY;
      })
      .onTouchesMove((e, manager) => {
        'worklet';
        const touch = e.allTouches[0];
        if (!touch || decided.value) return;
        // A vertical move first (the home-indicator swipe, a scroll) gives the touch away.
        if (Math.abs(touch.absoluteY - downY.value) > SCRUB_FAIL_Y) {
          decided.value = true;
          manager.fail();
          return;
        }
        if (Math.abs(touch.absoluteX - downX.value) <= SCRUB_START_X) return;
        decided.value = true;
        // A finger that held still long enough for a long press leaves the touch to the tab.
        if (Date.now() - startedAt.value > SCRUB_START_MS) {
          manager.fail();
          return;
        }
        inTime.value = true;
        manager.activate();
      })
      .onStart((e) => {
        'worklet';
        // Activated by the slide above, within the time limit. Activations that don't come
        // from touches (tests) go by the same clock.
        if (!inTime.value && Date.now() - startedAt.value > SCRUB_START_MS) return;
        const index = tabAt(frames.value, count, e.x);
        if (index < 0) return;
        scrubbing.value = true;
        hovered.value = index;
        scrub.value = scrubTarget(frames.value, count, e.x, index, reduceMotion);
        runOnJS(start)(index);
      })
      .onUpdate((e) => {
        'worklet';
        if (!scrubbing.value) return;
        const index = tabAt(frames.value, count, e.x);
        if (index >= 0 && index !== hovered.value) {
          hovered.value = index;
          runOnJS(cross)(index);
        }
        scrub.value = scrubTarget(frames.value, count, e.x, hovered.value, reduceMotion);
      })
      .onEnd((e, success) => {
        'worklet';
        if (!scrubbing.value) return;
        scrubbing.value = false;
        const index = hovered.value;
        if (!success || index < 0 || !nearTabs(frames.value, count, e.y)) {
          scrub.value = null;
          runOnJS(end)(-1);
          return;
        }
        scrub.value = frames.value[index] ?? null;
        runOnJS(end)(index);
        runOnJS(commit)(index);
      })
      .onFinalize(() => {
        'worklet';
        decided.value = false;
        inTime.value = false;
        // Cancelled before it ended (the system took the touch): back to the active tab.
        if (!scrubbing.value) return;
        scrubbing.value = false;
        scrub.value = null;
        runOnJS(end)(-1);
      });
  }, [
    enabled,
    count,
    reduceMotion,
    frames,
    scrub,
    hovered,
    startedAt,
    downX,
    downY,
    decided,
    inTime,
    scrubbing,
    letGo,
  ]);

  const context = useMemo<TabListContextValue>(() => ({ listRef, frames, scrub }), [frames, scrub]);
  return (
    <TabListContext value={context}>
      <GestureDetector gesture={gesture}>
        <View
          ref={listRef}
          role="tablist"
          collapsable={false}
          style={[{ flexDirection: 'row' }, style]}
        >
          {children}
        </View>
      </GestureDetector>
    </TabListContext>
  );
}
