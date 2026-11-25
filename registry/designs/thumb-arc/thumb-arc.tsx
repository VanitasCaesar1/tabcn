/**
 * Thumb Arc: a tab bar for one hand. At rest there is no bar: a round button in a bottom corner
 * shows the current tab's icon. Press and hold it, or press and slide, and the tabs fan out
 * around it on a quarter circle. Slide toward a tab: it grows and shows its name, with a
 * selection haptic each time the tab under the finger changes. Lift on it to switch; lift
 * anywhere else to cancel. A tap opens the fan and leaves it open, so a tab can be tapped; a tap
 * on the dimmed screen, on the button or on a tab closes it.
 *
 * The button's badge counts what waits in the other tabs: the sum of their numeric badges, or a
 * dot when they only have dots. Each tab in the fan shows its own badge.
 *
 * The bar reports only the button's height, so screens pad their content by its footprint. The
 * button stays in the same corner in right-to-left apps (`side` picks it), since reach follows
 * the hand, not the language; the tabs fill the arc in reading order.
 *
 * Needs `react-native-gesture-handler` and a `GestureHandlerRootView` around the app.
 *
 * ```tsx
 * <Tabs tabBar={tabBar(<ThumbArc />)} screenOptions={{ headerShown: false }} />
 * // In a dark app:
 * <Tabs tabBar={tabBar(<ThumbArc colors={thumbArcDarkColors} />)} />
 * ```
 *
 * Motion: the tabs spring out of the button's centre a few tens of milliseconds apart and fold
 * back in about 70% of that time; the tab under the finger grows on tabcnSpring; the button's
 * icon crossfades to the new tab's. With "reduce motion" on, the fan fades in and out in place
 * and nothing springs. Screen readers: the closed button reads "Tabs, Home selected" and opens
 * the fan; each tab in it is then a tab with its selected state, and the escape gesture,
 * Android's back button and Escape on the web close it.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  I18nManager,
  Platform,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LayoutAnimationConfig,
  ReduceMotion,
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  BadgeCount,
  PressableScale,
  TabBarRoot,
  type TabItem,
  tabcnSpring,
  useTabBar,
} from 'react-native-tabcn';

const defaultColors = {
  /** The round button. */
  button: '#17171a',
  /** The current tab's icon on the button. */
  buttonIcon: '#ffffff',
  /** Each tab's circle in the fan. */
  item: '#ffffff',
  /** Icons in the fan. */
  itemIcon: '#3a3a40',
  /** The current tab's icon and ring in the fan, and the fill of the tab under the finger. */
  accent: '#0a64d6',
  /** The icon of the tab under the finger, over `accent`. */
  accentIcon: '#ffffff',
  /** The name pills. */
  label: '#17171a',
  /** Text in the name pills. */
  labelText: '#ffffff',
  /** The wash over the screen while the fan is open. */
  scrim: 'rgba(20, 20, 24, 0.2)',
  /** Hairline edge of the circles in the fan. */
  border: 'rgba(0, 0, 0, 0.06)',
  /** Drop shadow under the button and the circles. */
  shadow: 'rgba(0, 0, 0, 0.2)',
  /** Badge fill. */
  badge: '#ff3b30',
  /** Badge count text. */
  badgeText: '#ffffff',
};

export type ThumbArcColors = typeof defaultColors;

/** The palette for dark apps: pass it as `colors`. */
export const thumbArcDarkColors: ThumbArcColors = {
  button: '#f2f2f4',
  buttonIcon: '#111114',
  item: '#2a2a2f',
  itemIcon: '#e6e6ea',
  accent: '#4d94ff',
  accentIcon: '#0b0b0d',
  label: '#f2f2f4',
  labelText: '#111114',
  scrim: 'rgba(0, 0, 0, 0.45)',
  border: 'rgba(255, 255, 255, 0.08)',
  shadow: 'rgba(0, 0, 0, 0.5)',
  badge: '#ff453a',
  badgeText: '#ffffff',
};

/** The button's badge: a count, a dot, or none. */
export type ThumbArcBadge = number | 'dot' | undefined;

const defaultLabels = {
  /** The button: names the current tab and what its badge shows. */
  button: (selected: string, badge: ThumbArcBadge) =>
    [
      'Tabs',
      selected ? `${selected} selected` : '',
      badge === 'dot' ? 'new' : badge ? `${badge} new` : '',
    ]
      .filter(Boolean)
      .join(', '),
  /** The dimmed screen behind the open fan, which closes it. */
  close: 'Close tabs',
};

export type ThumbArcLabels = typeof defaultLabels;

export interface ThumbArcProps {
  /** Colours, merged over the light defaults. Pass `thumbArcDarkColors` in a dark app. */
  colors?: Partial<ThumbArcColors>;
  /**
   * The bottom corner the button sits in. It stays there in right-to-left apps: reach follows
   * the hand, not the language. Default 'right'.
   */
  side?: 'right' | 'left';
  /**
   * A selection tick each time the tab under the finger changes, and a light tap when a hold
   * opens the fan. Default true.
   */
  haptics?: boolean;
  /** What screen readers call the button and the dimmed screen, merged over English defaults. */
  labels?: Partial<ThumbArcLabels>;
}

/** The round button. */
const BUTTON = 60;
/** Each tab's circle in the fan. */
const ITEM = 50;
/** The arc's radius from the button's centre; it grows when more tabs need the room. */
const RADIUS = 128;
/** Least room between two circles in the fan. */
const ITEM_GAP = 8;
/** Room between the button and the screen's side. */
const EDGE = 20;
/** The tab under the finger grows to this. */
const TARGET_SCALE = 1.18;
/** Room between a grown circle and its name pill. */
const LABEL_GAP = 6;
const PILL_HEIGHT = 26;
/** The widest a name pill gets; a longer name ends in an ellipsis. */
const PILL_STAGE = 160;
/** A name pill's width until it has been measured (it is transparent until then). */
const PILL_GUESS = 64;
const ICON = 24;
const BUTTON_ICON = 26;
/** A finger this close to the button's centre points at no tab. */
const DEAD_ZONE = BUTTON / 2 + 4;
/** Holding this long without moving opens the fan. */
const HOLD_MS = 260;
/** Sliding this far opens the fan straight away. */
const SLIDE_SLOP = 8;

// Motion. Enter: each tab springs out with a little bounce, 26 ms after the one before. Exit:
// they fold back in reverse on an accelerating curve, in about 70% of the enter time. Reduce
// motion: one fade in place, out in 70% of the in time.
const ENTER_SPRING = { stiffness: 380, damping: 28, mass: 1, reduceMotion: ReduceMotion.System };
const STAGGER_IN = 26;
const STAGGER_OUT = 16;
const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
const ACCELERATE = Easing.bezier(0.4, 0, 1, 1);
const GENTLE = Easing.bezier(0, 0, 0.58, 1);
const EXIT = { duration: 190, easing: ACCELERATE, reduceMotion: ReduceMotion.System };
const FADE_IN = { duration: 220, easing: GENTLE, reduceMotion: ReduceMotion.Never };
const FADE_OUT = { duration: 154, easing: GENTLE, reduceMotion: ReduceMotion.Never };
const SCRIM_IN = { duration: 220, easing: EASE_OUT, reduceMotion: ReduceMotion.Never };
const SCRIM_OUT = { duration: 154, easing: ACCELERATE, reduceMotion: ReduceMotion.Never };
const LABEL_IN = { duration: 140, easing: EASE_OUT, reduceMotion: ReduceMotion.System };
const LABEL_OUT = { duration: 100, easing: ACCELERATE, reduceMotion: ReduceMotion.System };
const iconIn = FadeIn.duration(200).easing(GENTLE).reduceMotion(ReduceMotion.System);
const iconOut = FadeOut.duration(140).easing(GENTLE).reduceMotion(ReduceMotion.System);

/** Where each tab sits on the arc, in the button's own points (0, 0 is its top-left corner). */
interface Arc {
  /** Centre and angle (degrees, 0 to the right, 90 up) of each place on the arc, left to right. */
  slots: { x: number; y: number; angle: number }[];
  /** The tab index at each place. */
  tabOf: number[];
  /** The place of each tab. */
  slotOf: number[];
  /** How far (degrees) from a place's angle a finger still points at it. */
  tolerance: number;
  /** A finger further than this from the button's centre points at no tab. */
  reach: number;
}

function arcFor(count: number, side: 'right' | 'left', rtl: boolean): Arc {
  const step = count > 1 ? 90 / (count - 1) : 0;
  // Far enough out that neighbouring circles keep ITEM_GAP between them.
  const needed = count > 1 ? (ITEM + ITEM_GAP) / 2 / Math.sin((step * Math.PI) / 360) : 0;
  const radius = Math.max(RADIUS, Math.ceil(needed));
  // A quarter circle from the button's side to straight above it, listed left to right.
  const first = side === 'right' ? 180 : 90;
  const c = BUTTON / 2;
  const slots = Array.from({ length: count }, (_, k) => {
    const angle = count > 1 ? first - k * step : first - 45;
    const rad = (angle * Math.PI) / 180;
    return { angle, x: c + radius * Math.cos(rad), y: c - radius * Math.sin(rad) };
  });
  // Tabs fill the arc in reading order: from the left, or from the right in RTL.
  const order = slots.map((_, k) => (rtl ? count - 1 - k : k));
  return {
    slots,
    tabOf: order,
    slotOf: order,
    tolerance: count > 1 ? step / 2 + 25 : 70,
    reach: radius + ITEM + 56,
  };
}

/** The tab a finger at (x, y) points at, in the button's own points, or -1. */
function tabAt(arc: Arc, x: number, y: number): number {
  'worklet';
  const dx = x - BUTTON / 2;
  const dy = BUTTON / 2 - y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < DEAD_ZONE || distance > arc.reach) return -1;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  let best = -1;
  let bestDiff = arc.tolerance;
  for (let k = 0; k < arc.slots.length; k++) {
    let diff = Math.abs(angle - (arc.slots[k]?.angle ?? 0));
    if (diff > 180) diff = 360 - diff;
    if (diff <= bestDiff) {
      best = k;
      bestDiff = diff;
    }
  }
  return best < 0 ? -1 : (arc.tabOf[best] ?? -1);
}

/** What the other tabs' badges add up to: their counts, or a dot if they only have dots. */
function waiting(tabs: readonly TabItem[], activeIndex: number): ThumbArcBadge {
  let sum = 0;
  let dot = false;
  for (const tab of tabs) {
    if (tab.index === activeIndex || tab.badge == null) continue;
    if (typeof tab.badge === 'number') sum += tab.badge;
    else dot = true;
  }
  return sum > 0 ? sum : dot ? 'dot' : undefined;
}

type Mode = 'closed' | 'hold' | 'tap';

export function ThumbArc({
  colors: custom,
  side = 'right',
  haptics = true,
  labels: customLabels,
}: ThumbArcProps) {
  // Merged once per change of value, not per render (an inline `colors` object is new on every
  // render), so nothing downstream restarts.
  const colorsKey = custom ? JSON.stringify(custom) : '';
  const colors = useMemo<ThumbArcColors>(
    () => ({ ...defaultColors, ...(colorsKey ? JSON.parse(colorsKey) : null) }),
    [colorsKey],
  );
  const labels = { ...defaultLabels, ...customLabels };
  const { tabs, activeIndex } = useTabBar();
  // Fixed for the app's life: React Native applies a direction change on reload.
  const rtl = I18nManager.isRTL;
  const arc = useMemo(() => arcFor(tabs.length, side, rtl), [tabs.length, side]);
  const reduceMotion = useReducedMotion();
  const screen = useWindowDimensions();

  const [mode, setMode] = useState<Mode>('closed');
  const open = mode !== 'closed';
  // Read and written on the UI thread by the gesture and every tab in the fan.
  const fan = useSharedValue(0);
  const target = useSharedValue(-1);
  const allNames = useSharedValue(0);
  const slid = useSharedValue(false);

  // The scrim covers the whole window from inside the bar: this is where the button sits in it.
  const anchorRef = useRef<ComponentRef<typeof View>>(null);
  const buttonRef = useRef<ComponentRef<typeof Pressable>>(null);
  const tabRefs = useRef(new Map<string, ComponentRef<typeof Pressable>>()).current;
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const measure = () => {
    anchorRef.current?.measureInWindow?.((x, y) =>
      setOrigin((o) => (o.x === x && o.y === y ? o : { x, y })),
    );
  };

  // A hold or slide that the gesture took is not also a tap on the button.
  const gestured = useRef(false);
  const gestureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Screen-reader focus moves into the fan when a screen reader opened it, and back after.
  const reader = useRef(false);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focus = (node: ComponentRef<typeof Pressable> | null | undefined) => {
    if (focusTimer.current !== null) clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => {
      // Not on the web: react-native-web has no sendAccessibilityEvent.
      if (node && typeof AccessibilityInfo.sendAccessibilityEvent === 'function')
        AccessibilityInfo.sendAccessibilityEvent(node, 'focus');
    }, 350);
  };
  useEffect(
    () => () => {
      if (focusTimer.current !== null) clearTimeout(focusTimer.current);
      if (gestureTimer.current !== null) clearTimeout(gestureTimer.current);
    },
    [],
  );

  const show = (next: 'hold' | 'tap') => {
    measure();
    if (next === 'tap') {
      target.value = -1;
      allNames.value = 1;
    }
    fan.value = 1;
    setMode(next);
    if (next === 'tap') {
      AccessibilityInfo.isScreenReaderEnabled?.()
        .then((on) => {
          reader.current = on;
          const { tabs: list, activeIndex: current } = latest.current;
          if (on) focus(tabRefs.get(list[current]?.key ?? ''));
        })
        .catch(() => {});
    }
  };
  const close = () => {
    fan.value = 0;
    setMode('closed');
    if (reader.current) {
      reader.current = false;
      focus(buttonRef.current);
    }
  };
  const choose = (index: number) => {
    const tab = latest.current.tabs[index];
    close();
    tab?.press();
  };

  // Gesture handler cancels the button's press when the hold or slide takes the touch; where
  // that press still arrives (as it can on the web), it is let through only once the lift has
  // been handled for a moment.
  const liftedNow = () => {
    if (gestureTimer.current !== null) clearTimeout(gestureTimer.current);
    gestureTimer.current = setTimeout(() => {
      gestured.current = false;
    }, 400);
  };
  const press = () => {
    if (gestured.current) return;
    if (open) close();
    else show('tap');
  };

  // The latest values, read when the gesture calls back to the JS thread.
  const latest = useRef({ tabs, activeIndex, haptics, show, close, choose, gestured, liftedNow });
  latest.current = { tabs, activeIndex, haptics, show, close, choose, gestured, liftedNow };

  // Hold still, or slide: whichever comes first opens the fan and follows the finger. The tab
  // under the finger is worked out on the UI thread; the JS thread hears only when it changes
  // and when the finger lifts. A plain tap is the button's own press.
  const gesture = useMemo(() => {
    const opened = (wasOpen: boolean) => {
      const l = latest.current;
      l.gestured.current = true;
      if (l.haptics && !wasOpen) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      l.show('hold');
    };
    const crossed = () => {
      if (latest.current.haptics) Haptics.selectionAsync();
    };
    const lifted = (index: number, moved: boolean) => {
      const l = latest.current;
      l.liftedNow();
      if (index >= 0) l.choose(index);
      // Held and let go without sliding: the fan stays open, to tap a tab.
      else if (!moved) l.show('tap');
      else l.close();
    };
    const start = (x: number, y: number, moved: boolean) => {
      'worklet';
      const wasOpen = fan.value === 1;
      slid.value = moved;
      fan.value = 1;
      allNames.value = 0;
      target.value = tabAt(arc, x, y);
      runOnJS(opened)(wasOpen);
    };
    const move = (x: number, y: number, dx: number, dy: number) => {
      'worklet';
      if (!slid.value && dx * dx + dy * dy > SLIDE_SLOP * SLIDE_SLOP) slid.value = true;
      const next = tabAt(arc, x, y);
      if (next === target.value) return;
      target.value = next;
      if (next >= 0) runOnJS(crossed)();
    };
    const end = (success: boolean) => {
      'worklet';
      const index = success ? target.value : -1;
      const stays = success && index < 0 && !slid.value;
      if (!stays) fan.value = 0;
      if (index < 0) target.value = -1;
      runOnJS(lifted)(index, !stays);
    };
    const hold = Gesture.Pan()
      .activateAfterLongPress(HOLD_MS)
      .withTestId('thumb-arc-hold')
      .onStart((e) => {
        'worklet';
        start(e.x, e.y, false);
      })
      .onUpdate((e) => {
        'worklet';
        move(e.x, e.y, e.translationX, e.translationY);
      })
      .onEnd((_e, success) => {
        'worklet';
        end(success);
      });
    const slide = Gesture.Pan()
      .minDistance(SLIDE_SLOP)
      .withTestId('thumb-arc-slide')
      .onStart((e) => {
        'worklet';
        start(e.x, e.y, true);
      })
      .onUpdate((e) => {
        'worklet';
        move(e.x, e.y, e.translationX, e.translationY);
      })
      .onEnd((_e, success) => {
        'worklet';
        end(success);
      });
    return Gesture.Race(hold, slide);
  }, [arc, fan, target, allNames, slid]);

  // Another tab became active from elsewhere (a link, a screen): the fan closes.
  const closeRef = useRef(close);
  closeRef.current = close;
  const openRef = useRef(open);
  openRef.current = open;
  // biome-ignore lint/correctness/useExhaustiveDependencies: close whenever the active tab changes.
  useEffect(() => {
    if (openRef.current) closeRef.current();
  }, [activeIndex]);
  // Android's back button and Escape on the web close the open fan.
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeRef.current();
      return true;
    });
    const doc = (globalThis as { document?: KeyTarget }).document;
    const onKey = (event: { key: string }) => {
      if (event.key === 'Escape') closeRef.current();
    };
    if (Platform.OS === 'web' && doc) doc.addEventListener('keydown', onKey);
    return () => {
      sub.remove();
      if (Platform.OS === 'web' && doc) doc.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const active = tabs[activeIndex];
  const badge = waiting(tabs, activeIndex);
  // `alignSelf` follows the layout direction; the corner doesn't.
  const alignSelf = (side === 'right') !== rtl ? 'flex-end' : 'flex-start';

  return (
    <TabBarRoot placement="floating" style={[styles.box, { alignSelf }]}>
      <View
        ref={anchorRef}
        collapsable={false}
        style={styles.anchor}
        onLayout={measure}
        onAccessibilityEscape={open ? close : undefined}
      >
        <Scrim
          fan={fan}
          open={open}
          color={colors.scrim}
          label={labels.close}
          onPress={close}
          frame={{ left: -origin.x, top: -origin.y, width: screen.width, height: screen.height }}
        />
        <View
          role="tablist"
          pointerEvents={open ? 'box-none' : 'none'}
          accessibilityElementsHidden={!open}
          importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
          style={StyleSheet.absoluteFill}
        >
          {tabs.map((tab) => {
            const place = arc.slotOf[tab.index] ?? 0;
            const slot = arc.slots[place];
            if (!slot) return null;
            return (
              <FanTab
                key={tab.key}
                tab={tab}
                count={tabs.length}
                place={place}
                slot={slot}
                fan={fan}
                target={target}
                allNames={allNames}
                reduceMotion={reduceMotion}
                colors={colors}
                register={(node) => {
                  if (node) tabRefs.set(tab.key, node);
                  else tabRefs.delete(tab.key);
                }}
                onPress={() => choose(tab.index)}
              />
            );
          })}
        </View>
        <GestureDetector gesture={gesture}>
          <PressableScale
            ref={buttonRef}
            scale={0.94}
            accessibilityLabel={labels.button(active?.label ?? '', badge)}
            accessibilityState={{ expanded: open }}
            onPressIn={() => {
              gestured.current = false;
            }}
            onPress={press}
            style={[
              styles.button,
              { backgroundColor: colors.button, boxShadow: `0 8px 20px ${colors.shadow}` },
            ]}
          >
            <LayoutAnimationConfig skipEntering>
              <ButtonIcon tab={active} color={colors.buttonIcon} />
            </LayoutAnimationConfig>
            {badge !== undefined ? (
              <Badge badge={badge} colors={colors} style={styles.buttonBadge} />
            ) : null}
          </PressableScale>
        </GestureDetector>
      </View>
    </TabBarRoot>
  );
}

interface KeyTarget {
  addEventListener: (type: 'keydown', fn: (e: { key: string }) => void) => void;
  removeEventListener: (type: 'keydown', fn: (e: { key: string }) => void) => void;
}

/** The current tab's icon on the button; a new tab's icon crossfades in over the old one. */
function ButtonIcon({ tab, color }: { tab: TabItem | undefined; color: string }) {
  if (!tab?.renderIcon) return null;
  return (
    <Animated.View key={tab.key} entering={iconIn} exiting={iconOut} style={styles.buttonIcon}>
      <ActiveIcon tab={tab} color={color} />
    </Animated.View>
  );
}

/**
 * The tab's icon in a component of its own, under the keyed view above: an icon that uses hooks
 * (or is compiled by React Compiler) then keeps its own state per tab instead of sharing the
 * button's, which breaks when the button switches from one tab's icon to another's.
 */
function ActiveIcon({ tab, color }: { tab: TabItem; color: string }) {
  return <>{tab.renderIcon?.({ focused: true, color, size: BUTTON_ICON })}</>;
}

/** The wash over the whole window behind the open fan; a tap on it closes the fan. */
function Scrim({
  fan,
  open,
  color,
  label,
  onPress,
  frame,
}: {
  fan: SharedValue<number>;
  open: boolean;
  color: string;
  label: string;
  onPress: () => void;
  frame: { left: number; top: number; width: number; height: number };
}) {
  const shown = useSharedValue(0);
  useAnimatedReaction(
    () => fan.value,
    (now, previous) => {
      if (now === previous) return;
      shown.value = withTiming(now, now ? SCRIM_IN : SCRIM_OUT);
    },
  );
  const style = useAnimatedStyle(() => ({ opacity: shown.value }));
  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      style={[styles.scrim, frame, { backgroundColor: color }, style]}
    >
      <Pressable
        role="button"
        accessibilityLabel={label}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
        onPress={onPress}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

function FanTab({
  tab,
  count,
  place,
  slot,
  fan,
  target,
  allNames,
  reduceMotion,
  colors,
  register,
  onPress,
}: {
  tab: TabItem;
  count: number;
  /** Its place on the arc, left to right: the order it comes out in. */
  place: number;
  slot: { x: number; y: number; angle: number };
  fan: SharedValue<number>;
  target: SharedValue<number>;
  allNames: SharedValue<number>;
  reduceMotion: boolean;
  colors: ThumbArcColors;
  register: (node: ComponentRef<typeof Pressable> | null) => void;
  onPress: () => void;
}) {
  const index = tab.index;
  // From the button's centre to this tab's: the way it travels out.
  const dx = slot.x - BUTTON / 2;
  const dy = slot.y - BUTTON / 2;

  const progress = useSharedValue(0);
  useAnimatedReaction(
    () => fan.value,
    (now, previous) => {
      if (now === previous || (previous === null && now === 0)) return;
      if (reduceMotion) {
        progress.value = withTiming(now, now ? FADE_IN : FADE_OUT);
      } else if (now) {
        progress.value = withDelay(place * STAGGER_IN, withSpring(1, ENTER_SPRING));
      } else {
        progress.value = withDelay((count - 1 - place) * STAGGER_OUT, withTiming(0, EXIT));
      }
    },
  );
  // The tab under the finger: it grows and fills with the accent.
  const hot = useSharedValue(0);
  useAnimatedReaction(
    () => target.value === index,
    (on, was) => {
      if (on === was) return;
      hot.value = withSpring(on ? 1 : 0, tabcnSpring);
    },
  );
  // Its name: shown under the finger, or for every tab when a tap opened the fan.
  const named = useSharedValue(0);
  useAnimatedReaction(
    () => allNames.value === 1 || target.value === index,
    (on, was) => {
      if (on === was) return;
      named.value = withTiming(on ? 1 : 0, on ? LABEL_IN : LABEL_OUT);
    },
  );

  const slotStyle = useAnimatedStyle(() => {
    const p = progress.value;
    if (reduceMotion) return { opacity: p };
    const away = 1 - p;
    return {
      opacity: Math.min(1, Math.max(0, p * 2.5)),
      transform: [
        { translateX: -dx * away },
        { translateY: -dy * away },
        { scale: 0.35 + 0.65 * p },
      ],
    };
  });
  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + (TARGET_SCALE - 1) * hot.value }],
  }));
  const fillStyle = useAnimatedStyle(() => ({ opacity: hot.value }));
  const nameStyle = useAnimatedStyle(() => ({
    opacity: named.value,
    transform: [{ scale: 0.92 + 0.08 * named.value }],
  }));

  // The name pill sits just outside the grown circle, on the line from the button through it:
  // its centre is as far out as its own half-extent in that direction needs. It is centred in a
  // wide stage, so it takes its text's width (measured once) instead of the 50 pt slot's.
  const [pillWidth, setPillWidth] = useState(PILL_GUESS);
  const rad = (slot.angle * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uy = -Math.sin(rad);
  const out =
    (ITEM / 2) * TARGET_SCALE +
    LABEL_GAP +
    (Math.abs(ux) * pillWidth) / 2 +
    (Math.abs(uy) * PILL_HEIGHT) / 2;
  const stageAt = {
    left: ITEM / 2 + ux * out - PILL_STAGE / 2,
    top: ITEM / 2 + uy * out - PILL_HEIGHT / 2,
  };

  // As TabButton reads a tab: the badge with the name, and on iOS the position.
  const badgeText = tab.badge === undefined ? '' : String(tab.badge).trim();
  const spoken = badgeText ? `${tab.label}, ${badgeText}` : tab.label;
  const accessibilityLabel =
    tab.accessibilityLabel ??
    (Platform.OS === 'ios' ? `${spoken}, tab, ${index + 1} of ${count}` : spoken);
  const icon = (color: string) => tab.renderIcon?.({ focused: tab.focused, color, size: ICON });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.slot, { left: slot.x - ITEM / 2, top: slot.y - ITEM / 2 }, slotStyle]}
    >
      <View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[styles.pillStage, stageAt]}
      >
        <Animated.View
          onLayout={(e) => setPillWidth(e.nativeEvent.layout.width)}
          style={[styles.pill, { backgroundColor: colors.label }, nameStyle]}
        >
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={[styles.pillText, { color: colors.labelText }]}
          >
            {tab.label}
          </Text>
        </Animated.View>
      </View>
      <PressableScale
        ref={register}
        role="tab"
        scale={0.95}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: tab.focused }}
        aria-selected={tab.focused}
        testID={tab.testID}
        onPress={onPress}
        style={styles.hit}
      >
        <Animated.View
          style={[
            styles.circle,
            {
              backgroundColor: colors.item,
              borderColor: tab.focused ? colors.accent : colors.border,
              borderWidth: tab.focused ? 2 : StyleSheet.hairlineWidth,
              boxShadow: `0 4px 12px ${colors.shadow}`,
            },
            circleStyle,
          ]}
        >
          {icon(tab.focused ? colors.accent : colors.itemIcon)}
          <Animated.View style={[styles.fill, { backgroundColor: colors.accent }, fillStyle]}>
            {icon(colors.accentIcon)}
          </Animated.View>
        </Animated.View>
        {tab.badge != null ? (
          <Badge
            badge={typeof tab.badge === 'number' ? tab.badge : 'dot'}
            text={typeof tab.badge === 'string' ? tab.badge.trim() : undefined}
            colors={colors}
            style={styles.tabBadge}
          />
        ) : null}
      </PressableScale>
    </Animated.View>
  );
}

/**
 * A count or a dot, or a short text. Hidden from screen readers: the button's and each tab's
 * label read it.
 */
function Badge({
  badge,
  text,
  colors,
  style,
}: {
  badge: Exclude<ThumbArcBadge, undefined>;
  text?: string;
  colors: ThumbArcColors;
  style: StyleProp<ViewStyle>;
}) {
  const textStyle = [styles.badgeText, { color: colors.badgeText }];
  if (badge === 'dot' && !text) {
    return (
      <View
        pointerEvents="none"
        style={[styles.dot, style, { backgroundColor: colors.badge, borderColor: colors.item }]}
      />
    );
  }
  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.count, style, { backgroundColor: colors.badge, borderColor: colors.item }]}
    >
      {typeof badge === 'number' ? (
        <BadgeCount value={badge} textStyle={textStyle} />
      ) : (
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[textStyle, styles.badgeCap]}>
          {text}
        </Text>
      )}
    </View>
  );
}

const FILL = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const;

/**
 * A fixed layout direction. React Native Web spells it `writingDirection` (CSS `direction`): in
 * development it drops `direction` with an error, so the web would follow the app's direction.
 */
function layoutDirection(direction: 'ltr' | 'rtl'): ViewStyle {
  return Platform.OS === 'web' ? ({ writingDirection: direction } as ViewStyle) : { direction };
}

const styles = StyleSheet.create({
  box: { marginHorizontal: EDGE },
  // Physical left and right inside: the corner and the arc don't flip in right-to-left apps.
  anchor: { width: BUTTON, height: BUTTON, ...layoutDirection('ltr') },
  scrim: { position: 'absolute' },
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: { ...FILL, alignItems: 'center', justifyContent: 'center' },
  buttonBadge: { position: 'absolute', top: -2, right: -2 },
  slot: { position: 'absolute', width: ITEM, height: ITEM },
  hit: { width: ITEM, height: ITEM },
  circle: {
    width: ITEM,
    height: ITEM,
    borderRadius: ITEM / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    ...FILL,
    borderRadius: ITEM / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillStage: {
    position: 'absolute',
    width: PILL_STAGE,
    height: PILL_HEIGHT,
    alignItems: 'center',
  },
  pill: {
    maxWidth: PILL_STAGE,
    height: PILL_HEIGHT,
    paddingHorizontal: 10,
    borderRadius: PILL_HEIGHT / 2,
    borderCurve: 'continuous',
    justifyContent: 'center',
  },
  pillText: { fontSize: 13, fontWeight: '600' },
  tabBadge: { position: 'absolute', top: -3, right: -3 },
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  count: {
    position: 'absolute',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
  badgeCap: { maxWidth: 48 },
});
