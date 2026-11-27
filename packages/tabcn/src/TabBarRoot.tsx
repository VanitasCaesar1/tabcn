import {
  type ComponentRef,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  Keyboard,
  Platform,
  type StyleProp,
  StyleSheet,
  useWindowDimensions,
  type View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  ReduceMotion,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CompanionLayer } from './companions';
import { useRestoreOnFocusChange } from './minimize';
import { HIDDEN_OPACITY, tabcnSpring, tabcnTiming } from './motion';
import { PanelLayer, type SheetGeometry } from './PanelLayer';
import {
  anyPanelOpen,
  DEFAULT_PANEL_OVERLAP,
  modalPanel,
  type Snapshot,
  type TabBarStore,
  useStoreSelector,
  useTabBarProvider,
  warnOnce,
} from './provider';
import { ScreenFrameContext } from './screen-frame';
import { useTabBar } from './state';
import type { TabFrame } from './TabList';

export interface TabBarRootProps {
  /**
   * `docked`: stays in the layout and pads the bottom safe area; screens end above it.
   * `floating`: floats over the screens, centred, `offset` above the bottom safe area.
   * `rail`: a vertical bar on the left edge, full height, padded by the top, left and bottom
   * safe areas. Use it with the navigator's `tabBarPosition: 'left'`, which lays the
   * screens out beside it.
   */
  placement: 'docked' | 'floating' | 'rail';
  /** Gap between a floating bar and the bottom safe area. Default 12. */
  offset?: number;
  /**
   * `onScrollDown`: screens that use `useMinimizeOnScroll()` minimize the bar while scrolling
   * down; the design reads `useTabBarMinimized()` to draw its compact form, and the reported
   * height follows the bar's measured (compact) height once the change has settled. The bar
   * comes back when the focused tab or screen changes. Needs a `TabBarProvider`.
   * Default `none`.
   */
  minimizeBehavior?: 'none' | 'onScrollDown';
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children?: ReactNode;
}

function useKeyboardVisible(enabled: boolean): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    // Start from where the keyboard is now: while not listening (another tab, or a rail), it
    // may have opened or closed, and a stale value left the bar hidden and untouchable.
    setVisible(Keyboard.isVisible());
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subs = [
      Keyboard.addListener(show, () => setVisible(true)),
      Keyboard.addListener(hide, () => setVisible(false)),
    ];
    return () => {
      for (const s of subs) s.remove();
    };
  }, [enabled]);
  return enabled && visible;
}

/** Layout keys a design's `style` can use to arrange its children. */
const CONTENT_LAYOUT_KEYS = [
  'flexDirection',
  'flexWrap',
  'alignItems',
  'alignContent',
  'justifyContent',
  'gap',
  'rowGap',
  'columnGap',
] as const;

/** Every padding key, so the root's padding can move onto the children's wrapper. */
const PADDING_KEYS = [
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingHorizontal',
  'paddingVertical',
  'paddingStart',
  'paddingEnd',
  'paddingBlock',
  'paddingBlockStart',
  'paddingBlockEnd',
  'paddingInline',
  'paddingInlineStart',
  'paddingInlineEnd',
] as const;
const NO_PADDING = Object.fromEntries(PADDING_KEYS.map((key) => [key, 0])) as ViewStyle;

/**
 * A floating box under a provider leaves its content layout to the children's wrapper. Kept as
 * a row, the box would grow the wrapper (`flexGrow: 1`) along it to the screen's width, so a
 * design whose root is a row (a pill and a round button) sat against the leading edge instead
 * of centred.
 */
const NO_CONTENT_LAYOUT: ViewStyle = {
  flexDirection: 'column',
  flexWrap: 'nowrap',
  alignItems: 'stretch',
  alignContent: 'flex-start',
  justifyContent: 'flex-start',
  gap: 0,
  rowGap: 0,
  columnGap: 0,
};

// Narrow selectors: each returns a value that keeps its identity until it changes, so the root
// re-renders only for what it draws (not for anchor frames, which only the panel layer reads).
const selectPanels = (s: Snapshot) => s.panels;
const selectOverrideActive = (s: Snapshot) => s.overrideActive;
const selectNavigatorFocused = (s: Snapshot) => s.navigatorFocused;

const noSubscribe = () => () => {};
const noOverride = () => null;

/**
 * The override element. It subscribes on its own, so a screen that re-renders its override
 * re-renders only this slot. While the override fades out it keeps drawing the last element
 * (the same instance) until the fade finishes.
 */
function OverrideSlot({ store }: { store: TabBarStore | undefined }) {
  const element = useSyncExternalStore(
    store?.subscribeOverride ?? noSubscribe,
    store?.getOverride ?? noOverride,
    noOverride,
  );
  const [last, setLast] = useState<ReactNode>(element);
  if (element != null && element !== last) setLast(element);
  return element ?? last;
}

/**
 * Crossfade between the design's own children and an override element set by a focused
 * screen (`useTabBarOverride`).
 */
function useOverride(active: boolean) {
  // Tracked during render, so the commit in which the override turns off still draws it.
  const [wasActive, setWasActive] = useState(active);
  const [fadingOut, setFadingOut] = useState(false);
  if (wasActive !== active) {
    setWasActive(active);
    setFadingOut(!active);
  }
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    const done = () => setFadingOut(false);
    progress.value = withTiming(active ? 1 : 0, tabcnTiming, (finished) => {
      'worklet';
      if (finished && !active) runOnJS(done)();
    });
  }, [active, progress]);

  // Staggered, not a plain crossfade: at the midpoint of a crossfade both are half visible and
  // the tabs show through the override. The tabs clear in the first half; the override comes
  // in over the last 70%, so they overlap only lightly. The tabs stay mounted under the
  // override, so they stop at HIDDEN_OPACITY, not 0, for any glass in them.
  const childrenStyle = useAnimatedStyle(() => ({
    opacity: Math.max(HIDDEN_OPACITY, 1 - progress.value * 2),
  }));
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, (progress.value - 0.3) / 0.7)),
  }));
  return { active, shown: active || fadingOut, childrenStyle, overlayStyle };
}

interface Size {
  width: number;
  height: number;
}

const sameSize = (a: Size | null, b: Size) => !!a && a.width === b.width && a.height === b.height;

/**
 * The root's size, which sets the height `TabBarRoot` reports and the room sheets resolve
 * against. While the bar minimizes or restores, a design that animates its size lays out on
 * every frame; applying each of those would re-render every screen that reads the bar height
 * (shifting its padding mid-scroll) and re-resolve every sheet on every frame. So while a
 * minimize change is in flight, layouts are held and only the settled size is applied.
 */
function useSettledSize(holdWhileMinimizing: boolean) {
  const [size, setSize] = useState<Size | null>(null);
  const minimize = useTabBarProvider()?.minimize;
  const fallback = useSharedValue(0);
  const progress = minimize?.progress ?? fallback;
  const target = minimize?.target ?? fallback;
  const pending = useRef<Size | null>(null);

  const apply = useCallback((next: Size) => {
    setSize((current) => (sameSize(current, next) ? current : next));
  }, []);
  const onSize = useCallback(
    (next: Size) => {
      // `.get()`, not `.value`: the React Compiler treats a `.value` read in a callback as a
      // memo dependency and reads it on every render, which Reanimated warns about.
      if (holdWhileMinimizing && progress.get() !== target.get()) {
        pending.current = { width: next.width, height: next.height };
        return;
      }
      pending.current = null;
      apply({ width: next.width, height: next.height });
    },
    [holdWhileMinimizing, progress, target, apply],
  );
  const flush = useCallback(() => {
    const next = pending.current;
    if (next === null) return;
    pending.current = null;
    apply(next);
  }, [apply]);
  useAnimatedReaction(
    () => progress.value === target.value,
    (settled, previous) => {
      if (settled && previous === false) runOnJS(flush)();
    },
    // No dependency list: native Reanimated ignores it and warns ("Dependencies should only be
    // used on the web"); the worklet picks up `flush` from its closure.
  );
  return [size, onSize] as const;
}

/**
 * Outer container of a tab bar. Positions it, pads the safe area, reports the
 * space it covers to the navigator (`useBottomTabBarHeight()` in screens), and
 * hides it while the keyboard is open when the screen sets `tabBarHideOnKeyboard`.
 * Under a `TabBarProvider` it also draws panels behind the bar, reserves their peek
 * height, and shows a screen's override element in place of the tabs.
 */
export function TabBarRoot({
  placement,
  offset = 12,
  minimizeBehavior = 'none',
  style,
  testID,
  children,
}: TabBarRootProps) {
  const { insets, hideOnKeyboard, reportHeight, tabs: items, activeIndex } = useTabBar();
  const provider = useTabBarProvider();
  const store = provider?.store;
  const panelRecords = useStoreSelector(store, selectPanels);
  const overrideActive = useStoreSelector(store, selectOverrideActive);
  const navigatorFocused = useStoreSelector(store, selectNavigatorFocused);
  const rail = placement === 'rail';
  const floating = placement === 'floating';
  // The keyboard is tracked when the screen hides the bar for it, and under a provider for
  // useTabBarInset(), which is 0 while the keyboard is up either way.
  const keyboardUp = useKeyboardVisible((hideOnKeyboard || !!provider) && !rail);
  const keyboardVisible = hideOnKeyboard && keyboardUp;
  const minimizes = !!provider && minimizeBehavior === 'onScrollDown';
  const [rootSize, onRootSize] = useSettledSize(minimizes);
  const height = rootSize?.height ?? null;
  // The floating bar box's frame; a docked bar's is the root's own (settled) size.
  const [floatingFrame, setFloatingFrame] = useState<TabFrame | null>(null);
  const barFrame = useMemo<TabFrame | null>(
    () =>
      floating
        ? floatingFrame
        : rootSize
          ? { x: 0, y: 0, width: rootSize.width, height: rootSize.height }
          : null,
    [floating, floatingFrame, rootSize],
  );
  // The screen's size: the navigator's safe-area frame, or the window's without an adapter.
  const windowSize = useWindowDimensions();
  const screenHeight = use(ScreenFrameContext)?.height ?? windowSize.height;
  // Anchors (`usePanelAnchor`) measure themselves against this view.
  const rootRef = useCallback(
    (node: ComponentRef<typeof View> | null) => {
      if (store) store.root.current = node;
    },
    [store],
  );
  const hidden = useSharedValue(0);
  const override = useOverride(overrideActive);
  // A `coversBar` panel is open: the floating bar box slides away and the panel takes its
  // place (PanelLayer moves its window down by the bar's height on the same spring).
  const covering =
    floating && panelRecords.some((p) => p.coversBar && p.state === 'open' && !p.leaving);
  if (!floating && !rail && panelRecords.some((p) => p.coversBar)) {
    warnOnce(
      'coversBar only works under a floating bar (TabBarRoot placement="floating"); it is ignored here.',
    );
  }
  const cover = useSharedValue(0);
  useEffect(() => {
    cover.value = withSpring(covering ? 1 : 0, tabcnSpring);
  }, [covering, cover]);

  useEffect(() => {
    hidden.value = withTiming(keyboardVisible ? 1 : 0, {
      duration: 200,
      reduceMotion: ReduceMotion.System,
    });
  }, [keyboardVisible, hidden]);

  // Opt in to minimize on scroll while this bar is mounted.
  const minimize = provider?.minimize;
  useEffect(() => {
    if (!minimize || minimizeBehavior !== 'onScrollDown') return;
    minimize.enabled.value = true;
    return () => {
      minimize.enabled.value = false;
      minimize.target.value = 0;
      minimize.progress.value = withTiming(0, tabcnTiming);
    };
  }, [minimize, minimizeBehavior]);
  // A minimized bar comes back on another tab: only the scrolled screen could restore it.
  useRestoreOnFocusChange(items[activeIndex]?.key);
  // A minimized design draws less than its box (a circle where the pill was, a row moved down),
  // so while minimized the box lets touches through to the screen wherever it draws nothing.
  // Not always: a design may paint the box itself, and its background must keep its taps.
  const minimizeTarget = minimize?.target;
  const [passThrough, setPassThrough] = useState(() => minimizes && minimizeTarget?.value === 1);
  useAnimatedReaction(
    () => minimizes && minimizeTarget?.value === 1,
    (next, previous) => {
      if (next !== previous) runOnJS(setPassThrough)(next);
    },
    [minimizes, minimizeTarget],
  );

  // Anchors measure against this root, so they re-measure whenever it or the bar moves.
  const onRootLayout = (size: Size) => {
    onRootSize(size);
    store?.measureAnchors();
  };

  const bottomGap = floating ? insets.bottom + offset : 0;
  // Peeking and open panels reserve their peek height; open panels overlay the screen.
  let peek = 0;
  if (!rail) {
    for (const panel of panelRecords) {
      if (panel.state !== 'hidden' && !panel.leaving) peek += panel.peekHeight;
    }
  }
  // A rail sits beside the screens, so it covers no height at the bottom. An empty floating bar
  // (a sheet standing in for it) covers none either, though its root keeps 1 pt (see below).
  const emptyFloating = floating && floatingFrame?.height === 0;
  const barHeight = emptyFloating ? 0 : height;
  const reported = barHeight === null ? null : rail ? 0 : barHeight + bottomGap + peek;
  useEffect(() => {
    if (reported !== null) reportHeight(reported);
  }, [reported, reportHeight]);

  // Hidden for the keyboard or covered by a panel, the bar stays mounted: it fades to
  // HIDDEN_OPACITY, not 0, so any glass in it keeps drawing when it comes back.
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: Math.max(HIDDEN_OPACITY, 1 - hidden.value),
    transform: [{ translateY: hidden.value * ((height ?? 0) + bottomGap) }],
  }));
  const boxHeight = floatingFrame?.height ?? 0;
  const coverStyle = useAnimatedStyle(() => ({
    opacity: Math.max(HIDDEN_OPACITY, 1 - cover.value * 1.6),
    transform: [{ translateY: cover.value * (boxHeight + bottomGap) }],
  }));

  // While a panel is open at its highest height it is modal: the bar's root hides its
  // siblings (the screens) from VoiceOver, and the tabs and the override are hidden inside it.
  // A sheet open lower down leaves them readable.
  const panelOpen = !rail && modalPanel(panelRecords);

  // Companions: above-positions ride the peek of the last bar panel that showed.
  const [companionsAbove, setCompanionsAbove] = useState(0);
  const liftPanel = useRef<string | null>(null);
  const shownBarPanel = panelRecords.find(
    (p) => p.anchorKey === 'bar' && p.state !== 'hidden' && !p.leaving,
  );
  if (shownBarPanel) liftPanel.current = shownBarPanel.id;
  else if (!panelRecords.some((p) => p.id === liftPanel.current)) liftPanel.current = null;

  // useTabBarInset(): the reported height plus companions above, or 0 when the bar isn't
  // what's at the bottom: a rail, a covered navigator, or the keyboard up (toast libraries
  // add the keyboard's height themselves, whether or not the bar hides for it).
  const inset =
    !store || rail || keyboardUp || !navigatorFocused || reported === null
      ? 0
      : reported + companionsAbove;
  useEffect(() => {
    store?.setInset(inset);
  }, [store, inset]);
  useEffect(() => {
    if (!store) return;
    return () => store.setInset(0);
  }, [store]);

  // The padding of the box the design's children sit in: the root's, or for a floating bar
  // the design's own `style`.
  const flatStyle = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
  // An edge's inset plus the design's own padding on it. The root sets each edge explicitly,
  // and an explicit edge wins over `paddingHorizontal`/`padding` whatever their order, so a
  // design's shorthand padding would be dropped; add it here instead. A design that sets the
  // edge itself (`paddingLeft`) keeps full control, as before.
  const edge = (side: 'Top' | 'Bottom' | 'Left' | 'Right', inset: number) => {
    if (flatStyle[`padding${side}`] !== undefined) return inset;
    const axis =
      side === 'Left' || side === 'Right' ? flatStyle.paddingHorizontal : flatStyle.paddingVertical;
    const own = axis ?? flatStyle.padding;
    return inset + (typeof own === 'number' ? own : 0);
  };
  const basePadding: ViewStyle =
    placement === 'docked'
      ? {
          paddingBottom: edge('Bottom', insets.bottom),
          paddingLeft: edge('Left', insets.left),
          paddingRight: edge('Right', insets.right),
        }
      : rail
        ? {
            paddingTop: edge('Top', insets.top),
            paddingBottom: edge('Bottom', insets.bottom),
            paddingLeft: edge('Left', insets.left),
          }
        : {};

  // A floating bar's rounded ends hide the join; a docked bar's top edge is straight. An
  // empty floating bar (zero height, as under a sheet that stands in for the bar) hides
  // nothing, so panels meet its top edge exactly and the visible strip matches the height
  // the bar reports.
  const overlap =
    floating && (barFrame === null || barFrame.height > 0) ? DEFAULT_PANEL_OVERLAP : 0;
  // Panels read it (`usePanelOverlap`) to size what they show above the bar.
  useEffect(() => {
    store?.setOverlap(overlap);
  }, [store, overlap]);
  // Sheets size themselves from where the root sits on screen. The root's size is the settled
  // one, so a minimizing bar doesn't move a sheet's heights on every frame.
  // Memoised so the panel layer (memoised too) skips renders that change none of it.
  const geometry = useMemo<SheetGeometry | null>(
    () =>
      rootSize
        ? {
            width: rootSize.width,
            height: rootSize.height,
            left: floating ? 0 : insets.left,
            right: floating ? 0 : insets.right,
            roomAboveRoot: screenHeight - bottomGap - rootSize.height - insets.top,
            belowRoot: bottomGap,
            docked: !floating,
          }
        : null,
    [rootSize, floating, insets.left, insets.right, insets.top, screenHeight, bottomGap],
  );

  // Under a provider, the design's children sit in a wrapper that can fade out for an
  // override. The wrapper is always a box and takes over the root's padding, so the root's
  // padding box, which the design's absolutely positioned children (backgrounds, blur) fill,
  // is the wrapper's too and never changes size when an override comes or goes.
  let tabs: ReactNode = children;
  if (provider) {
    const flat = (StyleSheet.flatten([basePadding, style]) ?? {}) as Record<string, unknown>;
    const layout: Record<string, unknown> = { flexGrow: 1, alignSelf: 'stretch' };
    for (const key of CONTENT_LAYOUT_KEYS) if (flat[key] !== undefined) layout[key] = flat[key];
    for (const key of PADDING_KEYS) if (flat[key] !== undefined) layout[key] = flat[key];
    const hideTabs = override.active || panelOpen;
    tabs = (
      <Animated.View
        pointerEvents={override.active ? 'none' : 'box-none'}
        importantForAccessibility={hideTabs ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={hideTabs}
        style={[layout as ViewStyle, override.childrenStyle]}
      >
        {children}
      </Animated.View>
    );
  }
  // The root keeps no padding of its own under a provider: the wrapper holds it.
  const boxPadding = provider ? NO_PADDING : null;
  const overlayFrame: ViewStyle =
    placement === 'floating'
      ? StyleSheet.absoluteFill
      : placement === 'docked'
        ? {
            position: 'absolute',
            top: 0,
            left: insets.left,
            right: insets.right,
            bottom: insets.bottom,
          }
        : {
            position: 'absolute',
            top: insets.top,
            bottom: insets.bottom,
            left: insets.left,
            right: 0,
          };
  const overlay = override.shown ? (
    <Animated.View
      pointerEvents={override.active ? 'box-none' : 'none'}
      importantForAccessibility={panelOpen ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={panelOpen}
      style={[overlayFrame, override.overlayStyle]}
    >
      <OverrideSlot store={store} />
    </Animated.View>
  ) : null;
  const panels =
    store && !rail ? (
      <PanelLayer
        store={store}
        panels={panelRecords}
        barFrame={barFrame}
        overlap={overlap}
        geometry={geometry}
        cover={cover}
      />
    ) : null;

  const companions =
    store && !rail ? (
      <CompanionLayer
        store={store}
        docked={!floating}
        side={Math.max(insets.left, insets.right)}
        hidden={anyPanelOpen(panelRecords)}
        liftPanel={liftPanel.current}
        overlap={overlap}
        clipped={flatStyle.overflow === 'hidden'}
        onAboveHeight={setCompanionsAbove}
      />
    ) : null;

  if (rail) {
    return (
      <Animated.View
        ref={rootRef}
        testID={testID}
        style={[basePadding, style, boxPadding]}
        onLayout={(e) => onRootLayout(e.nativeEvent.layout)}
      >
        {tabs}
        {overlay}
      </Animated.View>
    );
  }

  if (floating) {
    return (
      <Animated.View
        ref={rootRef}
        testID={testID}
        pointerEvents={keyboardVisible ? 'none' : 'box-none'}
        importantForAccessibility={keyboardVisible ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={keyboardVisible}
        accessibilityViewIsModal={panelOpen}
        style={[
          {
            position: 'absolute',
            left: insets.left,
            right: insets.right,
            bottom: bottomGap,
            alignItems: 'center',
            // iOS leaves everything inside a zero-height view out of the accessibility tree, so
            // under an empty bar (Section Sheet) VoiceOver couldn't reach the panels. The root
            // keeps 1 pt with the bar at its bottom edge: panels and sheets are placed from the
            // bar's frame, so nothing moves on screen.
            minHeight: 1,
            justifyContent: 'flex-end',
          },
          animatedStyle,
        ]}
        onLayout={(e) => onRootLayout(e.nativeEvent.layout)}
      >
        {panels}
        <Animated.View
          pointerEvents={covering ? 'none' : passThrough ? 'box-none' : undefined}
          importantForAccessibility={covering ? 'no-hide-descendants' : 'auto'}
          accessibilityElementsHidden={covering}
          // Centred, the box would size to its content and never learn the screen's width, so
          // a design's `maxWidth: '100%'` couldn't shrink a bar wider than a narrow phone.
          style={[
            styles.floatingBox,
            style,
            boxPadding,
            provider ? NO_CONTENT_LAYOUT : null,
            coverStyle,
          ]}
          onLayout={
            store
              ? (e) => {
                  const { x, y, width, height: h } = e.nativeEvent.layout;
                  setFloatingFrame((current) =>
                    current &&
                    current.x === x &&
                    current.y === y &&
                    current.width === width &&
                    current.height === h
                      ? current
                      : { x, y, width, height: h },
                  );
                  store.measureAnchors();
                }
              : undefined
          }
        >
          {companions}
          {tabs}
          {overlay}
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      ref={rootRef}
      testID={testID}
      pointerEvents={keyboardVisible ? 'none' : 'auto'}
      importantForAccessibility={keyboardVisible ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={keyboardVisible}
      accessibilityViewIsModal={panelOpen}
      style={[
        basePadding,
        keyboardVisible ? { position: 'absolute', left: 0, right: 0, bottom: 0 } : null,
        animatedStyle,
        style,
        boxPadding,
      ]}
      onLayout={(e) => onRootLayout(e.nativeEvent.layout)}
    >
      {panels}
      {companions}
      {tabs}
      {overlay}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floatingBox: { maxWidth: '100%' },
});
