/**
 * Reply Stack: X's frosted-glass navigation bar, with its reply row. A wide glass capsule holds
 * five icon-only tabs; a round glass lens glides behind the active one, whose icon turns solid.
 * Over it, on a post's page, a second capsule of the same width holds the reply field: the
 * viewer's photo, "Post your reply", and photo, GIF and expand buttons. The screen shows through
 * both, blurred. The glass is drawn in `reply-stack-glass.tsx`, the reply row in
 * `reply-stack-row.tsx`, the tabs and the lens in `reply-stack-tabs.tsx`.
 *
 * ```tsx
 * <Tabs tabBar={tabBar(<ReplyStack reply={{ onPress: openComposer }} showReply={onPost} />)} />
 * ```
 *
 * The reply row belongs to the screen you're on, not to a tab: pass `showReply` from your own
 * state (a post is open), and the row rises in over the tabs or sinks away. Without `reply`
 * there is no row. Pressing the field calls `reply.onPress` (open your composer); each action
 * button calls its own `onPress`.
 *
 * It minimizes on scroll, as X's does: on a screen that uses `useMinimizeOnScroll()` (under a
 * `TabBarProvider`), scrolling down shrinks the bar to a glass circle at its start holding only
 * the active tab's icon, and the reply row drops beside it into the same row. Scrolling up, or
 * tapping the circle (no tab change), brings the tabs back. Turn it off with
 * `minimizeOnScroll={false}`.
 *
 * The glass is a blur under a light or dark tint with a bright edge, lit from the top right, and
 * a soft shadow. It follows the system's light or dark appearance unless `tint` is set. Android
 * can't blur what is behind the bar, so there it is a denser fill with the same edge. On iOS 26
 * both capsules are Liquid Glass by default instead, shrinking the same way; `material="solid"`
 * keeps X's frosted blur everywhere.
 *
 * Motion (lively): the lens answers the finger, as X's does. It sets off for a tab as the finger
 * lands and follows the finger as it slides along the bar (TabScrub, so this design needs
 * react-native-gesture-handler and a GestureHandlerRootView); lifting on a tab changes to it.
 * It glides on tabcnSpring, stretching a little like a drop of glass and settling round as it
 * lands; the icon swaps to its solid form in a frame or two once the tab changes. A pressed tab
 * dips to 88%; a pressed reply field dips the whole row to 98% and springs back. The row rises in
 * over 220 ms and sinks away in 150 ms. Minimizing (tabcnTiming), the pill shrinks to a 52 pt
 * circle at its bottom start corner while the other icons gather into the active one, which
 * keeps its size; the reply row drops into the same row and narrows from its start. Growing back
 * runs the same path. With "reduce motion" on, every change is instant.
 *
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  I18nManager,
  Pressable,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  TabBarRoot,
  type TabItem,
  useRestoreTabBar,
  useTabBar,
  useTabBarMinimized,
} from 'react-native-tabcn';
import { TabScrub } from 'react-native-tabcn/gestures';
import { ComposeButton, type ComposeConfig } from './reply-stack-compose';
import { APP_DIRECTION, Glass, LTR, type Tint, useCapsuleFrame } from './reply-stack-glass';
import type { ReplyIconProps } from './reply-stack-icons';
import { ReplyRow } from './reply-stack-row';
import { PHYSICAL_LEFT, SlidingLens, Tab } from './reply-stack-tabs';

const darkColors = {
  /** Laid over the blur: how dark the glass is. */
  tint: 'rgba(14, 15, 18, 0.42)',
  /** The glass on Android, where nothing behind the bar can be blurred. */
  fill: 'rgba(30, 32, 37, 0.94)',
  /** The bright edge where the light catches it (top right and bottom left). */
  rim: 'rgba(255, 255, 255, 0.36)',
  /** The edge where the light doesn't reach. */
  rimShade: 'rgba(255, 255, 255, 0.08)',
  /** A hairline just outside the edge, so the glass holds its shape on a matching screen. */
  outline: 'rgba(0, 0, 0, 0.35)',
  /** The lens behind the active tab: its lit and its shaded side, over the glass. */
  lens: 'rgba(255, 255, 255, 0.22)',
  lensShade: 'rgba(255, 255, 255, 0.15)',
  /** The lens's edge where the light catches it. */
  lensRim: 'rgba(255, 255, 255, 0.14)',
  /** Idle tab icons, and the reply row's actions. */
  foreground: '#e7e9ea',
  /** The active tab's solid icon. */
  active: '#ffffff',
  /** "Post your reply". */
  placeholder: '#8b9096',
  /** The viewer's photo when `reply.avatar` isn't set. */
  avatar: 'rgba(255, 255, 255, 0.24)',
  /** Badge fill, drawn only when a tab sets `tabBarBadge`. */
  badge: '#1d9bf0',
  /** Badge count text. */
  badgeText: '#ffffff',
  /** The shadow under each capsule. */
  shadow: 'rgba(0, 0, 0, 0.45)',
  /** The compose button and its glyph. */
  compose: '#ffffff',
  composeIcon: '#0f1419',
  /**
   * Tint over the Liquid Glass (iOS 26). Unset, with the dark tint, `fill` at 60%, so the light
   * icons and the reply row keep their contrast over light screens; with the light tint, clear.
   * `'transparent'` for clear glass.
   */
  glassTint: undefined as string | undefined,
};

const lightColors: ReplyStackColors = {
  tint: 'rgba(240, 240, 243, 0.5)',
  fill: 'rgba(246, 246, 248, 0.96)',
  rim: 'rgba(255, 255, 255, 1)',
  rimShade: 'rgba(255, 255, 255, 0.45)',
  outline: 'rgba(0, 0, 0, 0.07)',
  lens: 'rgba(236, 236, 238, 0.96)',
  lensShade: 'rgba(205, 205, 209, 0.96)',
  lensRim: 'rgba(255, 255, 255, 1)',
  foreground: '#0f1419',
  active: '#0f1419',
  placeholder: '#536471',
  avatar: 'rgba(15, 20, 25, 0.14)',
  badge: '#1d9bf0',
  badgeText: '#ffffff',
  shadow: 'rgba(0, 0, 0, 0.14)',
  compose: '#0f1419',
  composeIcon: '#ffffff',
  glassTint: undefined,
};

export type ReplyStackColors = typeof darkColors;
export type { ComposeConfig } from './reply-stack-compose';

/** A button at the reply row's end. */
export interface ReplyAction {
  /** Screen-reader label, such as "Add photo". */
  label: string;
  /** Draws the glyph: any tab icon component fits. */
  icon: (props: ReplyIconProps) => ReactNode;
  /** Runs when the button is pressed. */
  onPress?: () => void;
}

/** The reply row. */
export interface ReplyConfig {
  /** The field's grey text. Default "Post your reply". */
  placeholder?: string;
  /**
   * The viewer's photo, clipped to a circle 38 pt across (26 pt while docked beside the minimized
   * bar): size it to fill its parent (`width: '100%', height: '100%'`). Default: a grey disc.
   */
  avatar?: ReactNode;
  /** Runs when the field is pressed: open your composer. */
  onPress?: () => void;
  /** Buttons at the row's end. Default: photo, GIF and expand. */
  actions?: readonly ReplyAction[];
}

export interface ReplyStackProps {
  /** The reply row above the tabs. Without it the bar is just the tabs. */
  reply?: ReplyConfig;
  /** Shows the reply row. Drive it from your screen's state. Default true. */
  showReply?: boolean;
  /**
   * X's round compose button at the bar's end. It floats above the pill, drops beside the
   * minimized circle, and gives way to the reply row while that is shown. Without it there is
   * none.
   */
  compose?: ComposeConfig;
  /** `light` or `dark` glass (the blur, or Liquid Glass's appearance). Default: the system's appearance. */
  tint?: 'light' | 'dark';
  colors?: Partial<ReplyStackColors>;
  /** Blur strength (iOS and the web). Not used over Liquid Glass. Default 30. */
  intensity?: number;
  /**
   * The capsules' surface: `'glass'` (Liquid Glass, iOS 26), `'solid'` (X's frosted blur with a
   * lit edge, a denser fill on Android), or `'auto'` (glass where the system has it, the blur
   * elsewhere). Default `'auto'`.
   */
  material?: 'auto' | 'glass' | 'solid';
  /**
   * A selection tick on pressing a tab that isn't active, on each tab the finger slides onto,
   * on the reply field and on the minimized circle. Default true.
   */
  haptics?: boolean;
  /**
   * Shrinks the bar to a circle holding the active tab while a screen that uses
   * `useMinimizeOnScroll()` scrolls down. Default true.
   */
  minimizeOnScroll?: boolean;
}

export function ReplyStack({
  reply,
  showReply = true,
  compose,
  tint: tintProp,
  colors: custom,
  intensity = 30,
  material = 'auto',
  haptics = true,
  minimizeOnScroll = true,
}: ReplyStackProps) {
  const glass = material === 'glass' || (material === 'auto' && isLiquidGlassAvailable());
  const system = useColorScheme();
  const tint: Tint = tintProp ?? (system === 'dark' ? 'dark' : 'light');
  const colors = { ...(tint === 'dark' ? darkColors : lightColors), ...custom };
  const { tabs, insets, activeIndex } = useTabBar();
  const window = useWindowDimensions();
  const minimized = useTabBarMinimized();
  // X's own minimize motion, measured from the clip: it shrinks in about 130 ms, eased at both
  // ends, and grows back over 200 ms, fast at first and settling (ease out). The foundation's
  // progress says when and which way; this follows it on X's timing.
  const shown = useSharedValue(minimized.value);
  // Which way it is going: 1 minimizing, 0 restoring. A new run starts only when that changes.
  const heading = useSharedValue(minimized.value > 0.5 ? 1 : 0);
  useAnimatedReaction(
    () => minimized.value,
    (next, previous) => {
      if (previous === null || next === previous) return;
      const to = next > previous ? 1 : 0;
      if (heading.value === to) return;
      heading.value = to;
      shown.value = withTiming(to, to === 1 ? SHRINK : GROW);
    },
  );
  const restore = useRestoreTabBar();
  const width = Math.max(PILL_HEIGHT * 2, window.width - insets.left - insets.right - SIDE * 2);
  const count = Math.max(1, tabs.length);
  // Every tab is the same width; the lens fills a tab's cell.
  const cell = (width - LIST_PAD_X * 2) / count;
  // Never taller than wide: with six or more tabs the cells are narrower than the pill is tall,
  // and the lens stays a circle, centred.
  const lensHeight = Math.min(PILL_HEIGHT - LIST_PAD_Y * 2, cell);
  // The pill sits low, as X's does: 20 pt above the screen's bottom edge over a home indicator,
  // 16 pt where there is none.
  const offset = (insets.bottom > 0 ? BOTTOM_GAP : BOTTOM_GAP_FLAT) - insets.bottom;

  // The row stays mounted while it sinks away (with the last reply it was given), and unmounts
  // when it's gone, so the bar's box shrinks back to the tabs.
  const visible = reply !== undefined && showReply;
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const [lastReply, setLastReply] = useState(reply);
  if (reply && reply !== lastReply) setLastReply(reply);
  const presence = useSharedValue(visible ? 1 : 0);
  useEffect(() => {
    presence.value = withTiming(visible ? 1 : 0, visible ? ROW_IN : ROW_OUT, (finished) => {
      if (finished && !visible) runOnJS(setMounted)(false);
    });
  }, [visible, presence]);
  const shownReply = reply ?? lastReply;

  // Minimized (past half-way), the circle is one button that brings the tabs back; the tabs in
  // it take no taps and aren't read.
  const [compact, setCompact] = useState(() => minimized.value > 0.5);
  useAnimatedReaction(
    () => shown.value > 0.5,
    (next, previous) => {
      if (next !== previous) runOnJS(setCompact)(next);
    },
  );

  // The lens answers the finger, as X's does: it sets off for a tab as the finger lands on it,
  // follows the finger as it slides along the bar (TabScrub), and goes back to the active tab if
  // the touch doesn't end in a tab change.
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);
  const scrubbing = useRef(false);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearSettle = useRef(() => {
    if (settle.current !== null) clearTimeout(settle.current);
    settle.current = null;
  }).current;
  // biome-ignore lint/correctness/useExhaustiveDependencies: let go whenever the active tab changes.
  useEffect(() => {
    clearSettle();
    setPressedIndex(null);
  }, [activeIndex, clearSettle]);
  useEffect(() => clearSettle, [clearSettle]);
  // The lens waits a moment for the tab change a touch asks for, then goes back.
  const settleSoon = () => {
    clearSettle();
    settle.current = setTimeout(() => setPressedIndex(null), LENS_RETURN_MS);
  };
  const indexOf = (tab: TabItem) => tabs.findIndex((t) => t.key === tab.key);
  const onTabPressIn = (index: number) => {
    clearSettle();
    setPressedIndex(index !== activeIndex ? index : null);
  };
  const onTabPressOut = () => {
    // A scrub takes the touch from the tab (its press is cancelled); the scrub decides.
    if (!scrubbing.current) settleSoon();
  };
  const onScrubStart = (tab: TabItem) => {
    scrubbing.current = true;
    clearSettle();
    setPressedIndex(indexOf(tab));
  };
  const onTabCross = (tab: TabItem) => {
    if (haptics) Haptics.selectionAsync();
    setPressedIndex(indexOf(tab));
  };
  const onScrubEnd = (tab: TabItem | null) => {
    scrubbing.current = false;
    // Lifted on a tab: TabScrub presses it, and the lens stays for the change. Lifted away from
    // the bar: back to the active tab.
    if (tab) settleSoon();
    else setPressedIndex(null);
  };
  const lensIndex = pressedIndex ?? activeIndex;

  // The tab the minimized circle keeps: the active one.
  const kept = activeIndex >= 0 && activeIndex < count ? activeIndex : 0;
  const rtl = Boolean(I18nManager.isRTL);
  // Centres are measured from the pill's physical left; the row runs right to left in RTL.
  const centerOf = (index: number) => LIST_PAD_X + cell * ((rtl ? count - 1 - index : index) + 0.5);
  const keptCenter = centerOf(kept);
  // The pill shrinks toward its bottom start corner (the left, or the right in RTL) to a circle
  // MIN across. Its glass and the clip around the tabs share one frame; the icons keep their size.
  const shape = {
    width,
    height: PILL_HEIGHT,
    to: { width: MIN, height: MIN },
    moves: 'end' as const,
  };
  const { frame: clipFrame, hold: clipHold } = useCapsuleFrame(shown, shape);
  const circleX = rtl ? width - MIN / 2 : MIN / 2;
  const circleDrop = (PILL_HEIGHT - MIN) / 2;
  // The tabs slide so the kept icon lands in the middle of the circle.
  const rowSlide = useAnimatedStyle(() => ({
    transform: [
      { translateX: shown.value * (circleX - keptCenter) },
      { translateY: shown.value * circleDrop },
    ],
  }));

  return (
    <TabBarRoot
      placement="floating"
      offset={offset}
      minimizeBehavior={minimizeOnScroll ? 'onScrollDown' : 'none'}
    >
      <View pointerEvents="box-none" style={[styles.column, { width }]}>
        {mounted && shownReply ? (
          <ReplyRow
            reply={shownReply}
            presence={presence}
            minimized={shown}
            // Down into the tabs' row, its bottom edge on the pill's.
            drop={GAP + PILL_HEIGHT}
            travel={MIN + DOCK_GAP}
            colors={colors}
            tint={tint}
            intensity={intensity}
            width={width}
            height={ROW_HEIGHT}
            dockHeight={MIN}
            haptics={haptics}
            glass={glass}
            visible={visible}
          />
        ) : null}
        <View pointerEvents="box-none" style={{ width, height: PILL_HEIGHT }}>
          <Glass
            colors={colors}
            tint={tint}
            intensity={intensity}
            progress={shown}
            glass={glass}
            {...shape}
          />
          {/* The tabs, clipped to the shrinking pill. Minimized, they take no touches and are
              hidden from screen readers and the keyboard: the circle stands for them. */}
          <View
            pointerEvents={compact ? 'none' : 'box-none'}
            aria-hidden={compact}
            style={[StyleSheet.absoluteFill, LTR]}
          >
            <Animated.View style={[styles.clipFrame, clipFrame]}>
              <Animated.View
                pointerEvents="box-none"
                style={[styles.still, APP_DIRECTION, { width, height: PILL_HEIGHT }, clipHold]}
              >
                <Animated.View style={[styles.rowBox, PHYSICAL_LEFT, { width }, rowSlide]}>
                  <TabScrub
                    enabled={!compact}
                    style={styles.list}
                    onScrubStart={onScrubStart}
                    onTabCross={onTabCross}
                    onScrubEnd={onScrubEnd}
                  >
                    <SlidingLens
                      index={lensIndex}
                      left={lensIndex >= 0 ? centerOf(lensIndex) - cell / 2 : 0}
                      width={cell}
                      height={lensHeight}
                      top={(PILL_HEIGHT - lensHeight) / 2}
                      minimized={shown}
                      colors={colors}
                      tint={tint}
                    />
                    {tabs.map((tab, index) => (
                      <Tab
                        key={tab.key}
                        tab={tab}
                        colors={colors}
                        haptics={haptics}
                        kept={index === kept}
                        gather={keptCenter - centerOf(index)}
                        minimized={shown}
                        focusable={!compact}
                        onPressIn={() => onTabPressIn(index)}
                        onPressOut={onTabPressOut}
                      />
                    ))}
                  </TabScrub>
                </Animated.View>
              </Animated.View>
            </Animated.View>
          </View>
          {compact ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${tabs[kept]?.label ?? 'Tabs'}, show all tabs`}
              onPress={restore}
              onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
              style={styles.circle}
            />
          ) : null}
          {compose ? (
            <ComposeButton
              compose={compose}
              enabled={!visible}
              shown={shown}
              hidden={presence}
              colors={colors}
              haptics={haptics}
              pillHeight={PILL_HEIGHT}
              circle={MIN}
            />
          ) : null}
        </View>
      </View>
    </TabBarRoot>
  );
}

// Measured from X's bar on a 402 pt wide screen.
/** The capsules' gap to the screen's sides. */
const SIDE = 18;
const PILL_HEIGHT = 72;
const ROW_HEIGHT = 64;
/** Between the reply row and the tabs. */
const GAP = 10;
/** The pill's bottom edge above the screen's: over a home indicator, and without one. */
const BOTTOM_GAP = 20;
const BOTTOM_GAP_FLAT = 16;
/** The tab row's inset inside the pill: the lens sits 4 pt in from its edge. */
const LIST_PAD_X = 4;
const LIST_PAD_Y = 4;
/** The minimized circle (0.72 of the pill's height, as in X's clip), and the glass gap to the
 * reply row docked beside it. */
const MIN = 52;
const DOCK_GAP = 10;
/** How long the lens waits on a released tab for the tab change before it goes back. */
const LENS_RETURN_MS = 300;

// The row rises in, and sinks away in about 70% of the time. Nobody tapped the row to make it
// leave, so its exit can ease in.
const ROW_IN = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};
// X's minimize: a quick shrink eased at both ends, and a growth that starts fast and settles.
const SHRINK = {
  duration: 130,
  easing: Easing.inOut(Easing.sin),
  reduceMotion: ReduceMotion.System,
};
const GROW = {
  duration: 200,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};
const ROW_OUT = {
  duration: 150,
  easing: Easing.in(Easing.quad),
  reduceMotion: ReduceMotion.System,
};

const styles = StyleSheet.create({
  column: { gap: GAP },
  // The clip around the tabs: its frame follows the glass as it shrinks.
  clipFrame: { position: 'absolute', overflow: 'hidden', borderCurve: 'continuous' },
  // The tabs' layer, held at the pill's resting frame while the clip shrinks around it.
  still: { position: 'absolute' },
  rowBox: { position: 'absolute', top: 0, height: PILL_HEIGHT },
  list: { flex: 1, paddingHorizontal: LIST_PAD_X, paddingVertical: LIST_PAD_Y },
  // The minimized circle's button, at the pill's bottom start corner.
  circle: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    width: MIN,
    height: MIN,
    borderRadius: MIN / 2,
  },
});
