import { type ComponentRef, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useRestoreOnFocusChange } from './minimize';
import { tabcnTiming } from './motion';
import { PanelLayer } from './PanelLayer';
import { anyPanelOpen, type Snapshot, useStoreSelector, useTabBarProvider } from './provider';
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

const selectSnapshot = (s: Snapshot) => s;

/**
 * Crossfade between the design's own children and an override element set by a focused
 * screen (`useTabBarOverride`). The element that is fading out stays mounted (the same
 * instance) until the fade finishes.
 */
function useOverride(override: ReactNode | null) {
  const active = override != null;
  const last = useRef<ReactNode>(null);
  if (active) last.current = override;
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

  const childrenStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  return {
    active,
    element: active ? override : fadingOut ? last.current : null,
    childrenStyle,
    overlayStyle,
  };
}

/**
 * The height `TabBarRoot` reports. While the bar minimizes or restores, a design that
 * animates its size lays out on every frame; reporting each of those would re-render every
 * screen that reads the bar height and shift its padding mid-scroll. So while a minimize
 * change is in flight, layouts are held and only the settled height is applied.
 */
function useSettledHeight(holdWhileMinimizing: boolean) {
  const [height, setHeight] = useState<number | null>(null);
  const minimize = useTabBarProvider()?.minimize;
  const fallback = useSharedValue(0);
  const progress = minimize?.progress ?? fallback;
  const target = minimize?.target ?? fallback;
  const pending = useRef<number | null>(null);

  const onHeight = useCallback(
    (next: number) => {
      if (holdWhileMinimizing && progress.value !== target.value) {
        pending.current = next;
        return;
      }
      pending.current = null;
      setHeight(next);
    },
    [holdWhileMinimizing, progress, target],
  );
  const flush = useCallback(() => {
    const next = pending.current;
    if (next === null) return;
    pending.current = null;
    setHeight(next);
  }, []);
  useAnimatedReaction(
    () => progress.value === target.value,
    (settled, previous) => {
      if (settled && previous === false) runOnJS(flush)();
    },
    [flush],
  );
  return [height, onHeight] as const;
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
  const snapshot = useStoreSelector(store, selectSnapshot);
  const rail = placement === 'rail';
  const keyboardVisible = useKeyboardVisible(hideOnKeyboard && !rail);
  const minimizes = !!provider && minimizeBehavior === 'onScrollDown';
  const [height, onHeight] = useSettledHeight(minimizes);
  const [barFrame, setBarFrame] = useState<TabFrame | null>(null);
  // Anchors (`usePanelAnchor`) measure themselves against this view.
  const rootRef = useCallback(
    (node: ComponentRef<typeof View> | null) => {
      if (store) store.root.current = node;
    },
    [store],
  );
  const hidden = useSharedValue(0);
  const override = useOverride(snapshot.override);

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

  // Anchors measure against this root, so they re-measure whenever it or the bar moves.
  const onRootLayout = (h: number) => {
    onHeight(h);
    store?.measureAnchors();
  };

  const bottomGap = placement === 'floating' ? insets.bottom + offset : 0;
  // Peeking and open panels reserve their peek height; open panels overlay the screen.
  let peek = 0;
  if (!rail) {
    for (const panel of snapshot.panels) {
      if (panel.state !== 'hidden' && !panel.leaving) peek += panel.peekHeight;
    }
  }
  // A rail sits beside the screens, so it covers no height at the bottom.
  const reported = height === null ? null : rail ? 0 : height + bottomGap + peek;
  useEffect(() => {
    if (reported !== null) reportHeight(reported);
  }, [reported, reportHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - hidden.value,
    transform: [{ translateY: hidden.value * ((height ?? 0) + bottomGap) }],
  }));

  // While a panel is open it is modal: the bar's root hides its siblings (the screens) from
  // VoiceOver, and the tabs and the override are hidden inside it.
  const panelOpen = !rail && anyPanelOpen(snapshot);

  // The padding of the box the design's children sit in: the root's, or for a floating bar
  // the design's own `style`.
  const basePadding: ViewStyle =
    placement === 'docked'
      ? { paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }
      : rail
        ? { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left }
        : {};

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
  const overlay =
    override.element != null ? (
      <Animated.View
        pointerEvents={override.active ? 'box-none' : 'none'}
        importantForAccessibility={panelOpen ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={panelOpen}
        style={[overlayFrame, override.overlayStyle]}
      >
        {override.element}
      </Animated.View>
    ) : null;
  const panels =
    store && !rail ? (
      <PanelLayer
        store={store}
        snapshot={snapshot}
        barFrame={barFrame}
        // A floating bar's rounded ends hide the join; a docked bar's top edge is straight.
        overlap={placement === 'floating' ? 16 : 0}
      />
    ) : null;

  if (rail) {
    return (
      <Animated.View
        ref={rootRef}
        testID={testID}
        style={[basePadding, style, boxPadding]}
        onLayout={(e) => onRootLayout(e.nativeEvent.layout.height)}
      >
        {tabs}
        {overlay}
      </Animated.View>
    );
  }

  if (placement === 'floating') {
    return (
      <Animated.View
        ref={rootRef}
        testID={testID}
        pointerEvents={keyboardVisible ? 'none' : 'box-none'}
        accessibilityViewIsModal={panelOpen}
        style={[
          {
            position: 'absolute',
            left: insets.left,
            right: insets.right,
            bottom: bottomGap,
            alignItems: 'center',
          },
          animatedStyle,
        ]}
        onLayout={(e) => onRootLayout(e.nativeEvent.layout.height)}
      >
        {panels}
        <View
          style={[style, boxPadding]}
          onLayout={
            store
              ? (e) => {
                  setBarFrame(e.nativeEvent.layout);
                  store.measureAnchors();
                }
              : undefined
          }
        >
          {tabs}
          {overlay}
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      ref={rootRef}
      testID={testID}
      pointerEvents={keyboardVisible ? 'none' : 'auto'}
      accessibilityViewIsModal={panelOpen}
      style={[
        basePadding,
        keyboardVisible ? { position: 'absolute', left: 0, right: 0, bottom: 0 } : null,
        animatedStyle,
        style,
        boxPadding,
      ]}
      onLayout={(e) => {
        const { width, height: h } = e.nativeEvent.layout;
        if (store) setBarFrame({ x: 0, y: 0, width, height: h });
        onRootLayout(h);
      }}
    >
      {panels}
      {tabs}
      {overlay}
    </Animated.View>
  );
}
