/**
 * Slider Sheet: a dark card that rises above the tab bar to choose how much of something to
 * act on, such as reducing or closing a trading position. A title and a muted line, a large
 * amount, one detail line, then the heart of it: a slider in a dark pill track whose blue fill
 * ends in a white chip naming the percentage ("25%"). Touch it and the chip shrinks into a round
 * knob while a pin-shaped bubble rises above it with the live percentage; dragging moves the
 * knob with the finger and updates the amount, the detail line, the title and the button as it
 * goes. On release the value snaps to the nearest step (quarters by default: 52% becomes 50%),
 * the knob slides there and widens back into the chip, and the bubble fades and shrinks away. A
 * tap on the track jumps to the nearest step. The full-width button below brightens to white
 * while you drag, and runs `onConfirm` with the value. The lowest value is one step: 0 isn't
 * offered.
 *
 * It is a `TabPanel` with one snap point, the card's own height, so it needs a `TabBarProvider`
 * around the tabs navigator and a `GestureHandlerRootView` around the app:
 *
 * ```tsx
 * // Beside <Tabs>, under the provider:
 * <SliderSheet
 *   title={(v) => (v === 1 ? 'Close NWA Long' : 'Reduce NWA Long')}
 *   subtitle="Reduce part of your position or close it fully"
 *   amount={(v) => money(v * margin)}
 *   action={(v) => (v === 1 ? 'Close position' : 'Reduce position')}
 *   onConfirm={(v) => { reduce(v); sheet.hide(); }}
 * />
 *
 * // Anywhere under the provider:
 * const sheet = useSliderSheet();
 * <Pressable onPress={sheet.open} />
 * ```
 *
 * Why a sheet with one snap point: the card must never sit under the bar, since its button is at
 * its bottom edge. A sheet takes the screen's full width under any bar and is measured from the
 * bar's top edge, so the card (inset from the screen's sides) always rests just above the bar,
 * docked or floating, and slides out from behind it. `coversBar` would only work under a floating
 * bar, and a plain panel is only as wide as the bar. The card measures itself and sets the snap
 * point to its height. Open, it is modal: the screen behind dims (the panel's `backdrop`) and a
 * tap there closes it, as do dragging the grabber or the title down, tapping the grabber, Android
 * back, Escape on the web and the screen-reader escape gesture. Switching tabs slides it away.
 * It has no scroll view, so on a phone in landscape its top may be cut off. Not drawn while the
 * bar is a rail.
 *
 * Motion: the knob follows the finger on the UI thread (Reanimated), and the text updates only
 * when the whole percentage changes. The snap, the chip-to-knob morph and the sheet's slide run
 * on tabcnSpring (critically damped, no overshoot); the bubble, the fill's and the button's
 * brightening on tabcnTiming. Everything moves by transforms and opacity except the handle's own
 * size while it morphs. With "reduce motion" on, every change is instant (the knob still follows
 * the finger). A selection haptic each time the drag crosses a step, and on release. In a
 * right-to-left layout the fill grows from the right.
 *
 * Screen readers find the slider as an adjustable control ("Amount", "50 percent"): swipe up or
 * down to move it a step. The button reads its current label.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { type ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  type AccessibilityActionEvent,
  I18nManager,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type TextProps,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  PressableScale,
  TabPanel,
  type TabPanelControls,
  tabcnSpring,
  tabcnTiming,
  useTabBar,
  useTabPanel,
} from 'react-native-tabcn';
import { PanelDragArea } from 'react-native-tabcn/gestures';

const defaultColors = {
  /** The card. */
  surface: '#0d0d0f',
  /** Hairline around the card, so it reads on a black screen. */
  border: 'rgba(255, 255, 255, 0.06)',
  /** The grabber at the top. */
  grabber: '#5c5c60',
  /** The title, the amount and the new value in the detail line. */
  foreground: '#f5f5f7',
  /** The subtitle, the detail line and the footer. */
  muted: '#8e8e93',
  /** A gain in the detail line (passed to `detail`). */
  positive: '#3ee06a',
  /** The slider's track. */
  track: '#1a1a1c',
  /** The dots along the empty part of the track. */
  dot: '#333336',
  /** The fill's deeper end (bottom, leading). */
  fill: '#5a7cef',
  /** The fill's lighter end (top, trailing). */
  fillHighlight: '#7eabf5',
  /** The fill's deeper end while dragging: the fill brightens under the finger. */
  fillActive: '#689ff3',
  /** The fill's lighter end while dragging. */
  fillActiveHighlight: '#8cd2fa',
  /** The chip at the fill's end, and the knob it becomes while dragging. */
  chip: '#ffffff',
  /** The percentage on the chip. */
  chipText: '#5277e0',
  /** The pin-shaped bubble above the knob. */
  bubble: '#ffffff',
  /** The percentage in the bubble. */
  bubbleText: '#111113',
  /** The button at rest (a soft light grey). */
  button: '#dcdedd',
  /** The button while dragging. */
  buttonActive: '#ffffff',
  /** The button's label. */
  buttonText: '#000000',
  /** Dims the screen behind the open card. */
  backdrop: 'rgba(0, 0, 0, 0.55)',
};

export type SliderSheetColors = typeof defaultColors;

const defaultLabels = {
  /** The slider's name for screen readers. */
  slider: 'Amount',
  /** The percentage on the chip and in the bubble. */
  percent: (percent: number) => `${percent}%`,
  /** The slider's value for screen readers. */
  spokenPercent: (percent: number) => `${percent} percent`,
  /** The grabber, a button that closes the sheet. */
  close: 'Close',
};

/** The sheet's words, for translation: pass the ones to change as `labels`. */
export type SliderSheetLabels = typeof defaultLabels;

/** A string, or one worked out from the slider's value (0 to 1). */
type ByValue<T> = T | ((value: number) => T);

export interface SliderSheetProps {
  /** Panel id, for `useSliderSheet(id)` and `useTabPanel(id)`. Default `'slider'`. */
  id?: string;
  /** The heading; a function gets the live value, so it can read "Close" at 100%. */
  title: ByValue<string>;
  /** One muted line under the title. */
  subtitle?: string;
  /** The large number in the middle, from the live value (for example "$14.90"). */
  amount?: (value: number) => string;
  /**
   * One muted line under the amount, from the live value: what changes ("Est. Profit +$0.07 ·
   * Position $358.17 → $268.62"). Drawn inside a muted `Text`, so nest `Text`s with
   * `colors.positive` or `colors.foreground` for the parts that stand out.
   */
  detail?: (value: number, colors: SliderSheetColors) => ReactNode;
  /** The button's label; a function gets the live value. */
  action: ByValue<string>;
  /** Runs with the chosen value when the button is pressed. Close the sheet here if it's done. */
  onConfirm: (value: number) => void;
  /** Small muted text under the button: a fee, a disclosure link. A string or your own row. */
  footer?: ReactNode;
  /** How many steps the slider snaps to; the value is a whole number of steps. Default 4. */
  steps?: number;
  /** The value, 0 to 1 (controlled). Use with `onValueChange`. */
  value?: number;
  /** The first value while uncontrolled. Default one step. */
  defaultValue?: number;
  /** Runs with the new value after a drag snaps, a tap on the track or a screen-reader step. */
  onValueChange?: (value: number) => void;
  /** Radius of the card's corners. Default 32. */
  radius?: number;
  colors?: Partial<SliderSheetColors>;
  /** The slider's and grabber's words for screen readers, merged over the English defaults. */
  labels?: Partial<SliderSheetLabels>;
  /** A selection haptic as the drag crosses each step, on release and on the button. Default true. */
  haptics?: boolean;
}

/** Declares the sheet. Renders nothing here: the card is drawn above the tab bar. */
export function SliderSheet({ id = 'slider', colors: custom, ...props }: SliderSheetProps) {
  const colors = { ...defaultColors, ...custom };
  // The card measures itself; the sheet's one snap point is its height plus the gap above the bar.
  const [height, setHeight] = useState(ESTIMATED_HEIGHT);
  const snapPoints = useMemo(() => [height + GAP], [height]);
  return (
    <TabPanel
      id={id}
      snapPoints={snapPoints}
      backdrop={<View style={[styles.fill, { backgroundColor: colors.backdrop }]} />}
    >
      <Card id={id} colors={colors} onHeight={setHeight} {...props} />
    </TabPanel>
  );
}

/** Opens and closes the sheet from anywhere under the `TabBarProvider`: `open()`, `hide()`. */
export function useSliderSheet(id = 'slider'): TabPanelControls {
  return useTabPanel(id);
}

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(max, Math.max(min, value));
};

/** The nearest whole step, never below one: 0 isn't offered. */
const snapValue = (value: number, steps: number) => {
  'worklet';
  return clamp(Math.round(value * steps), 1, steps) / steps;
};

const resolve = <T,>(by: ByValue<T>, value: number): T =>
  typeof by === 'function' ? (by as (value: number) => T)(value) : by;

/** A linear gradient as a style: CSS `backgroundImage` on the web, its native twin elsewhere. */
function gradient(deep: string, light: string) {
  // "to bottom left" on a wide, short pill is nearly vertical, lit at the top and trailing end.
  const image = `linear-gradient(to bottom left, ${light}, ${deep})`;
  return (
    Platform.OS === 'web' ? { backgroundImage: image } : { experimental_backgroundImage: image }
  ) as object;
}

function Card({
  id,
  colors,
  onHeight,
  title,
  subtitle,
  amount,
  detail,
  action,
  onConfirm,
  footer,
  steps: rawSteps = 4,
  value: controlled,
  defaultValue,
  onValueChange,
  radius = 32,
  labels: customLabels,
  haptics = true,
}: Omit<SliderSheetProps, 'id' | 'colors'> & {
  id: string;
  colors: SliderSheetColors;
  onHeight: (height: number) => void;
}) {
  const labels = { ...defaultLabels, ...customLabels };
  const steps = Math.max(1, Math.round(rawSteps));
  const { hide, state } = useTabPanel(id);
  const { fontScale } = useWindowDimensions();

  const [own, setOwn] = useState(() => snapValue(defaultValue ?? 1 / steps, steps));
  const committed = clamp(controlled ?? own, 0, 1);
  // The value the texts show: the committed one, or the live one while a finger is on the slider.
  // Only the texts that show it subscribe, so a drag re-renders them and not the whole card.
  const dragging = useRef(false);
  const [shown] = useState(() => createLive(committed));
  useEffect(() => {
    if (!dragging.current) shown.set(committed);
  }, [committed, shown]);

  const commit = (next: number) => {
    if (controlled === undefined) setOwn(next);
    if (next !== committed) onValueChange?.(next);
  };
  const tick = () => {
    if (haptics) Haptics.selectionAsync();
  };

  // The sheet belongs to the screen it was opened from, so switching tabs slides it away (as
  // Bar Sheet does). The content renders in the bar's tree, so it can read the bar's state.
  const { tabs, activeIndex } = useTabBar();
  const focusedKey = tabs[activeIndex]?.key ?? null;
  const open = state === 'open';
  const openedOn = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!open) {
      openedOn.current = undefined;
      return;
    }
    if (openedOn.current === undefined) {
      openedOn.current = focusedKey;
      return;
    }
    if (openedOn.current !== focusedKey) hide();
  }, [open, focusedKey, hide]);

  // Slider geometry. `pos` is where the knob is (0 to 1), `press` the chip-to-knob morph and the
  // brightening (1 while a finger is down), `inner` the fill's lane width.
  const [lane, setLane] = useState(0);
  const inner = useSharedValue(0);
  const pos = useSharedValue(committed);
  const press = useSharedValue(0);
  const start = useSharedValue(committed);
  const lastPercent = useSharedValue(-1);
  const lastStep = useSharedValue(-1);
  // The chip fits its text ("25%", "100%"); the knob is round.
  const chipText = labels.percent(Math.round(committed * 100));
  const chipWidth = useSharedValue(chipWidthFor(chipText, fontScale));
  useEffect(() => {
    chipWidth.value = withTiming(chipWidthFor(chipText, fontScale), tabcnTiming);
  }, [chipText, fontScale, chipWidth]);

  // A value set from outside (controlled, a screen-reader step) glides there. A drag has already
  // sent the knob to the value it commits, so that one isn't started again.
  const settled = useRef(committed);
  useEffect(() => {
    if (committed === settled.current) return;
    settled.current = committed;
    if (!dragging.current) pos.value = withSpring(committed, tabcnSpring);
  }, [committed, pos]);

  const onLane = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    inner.value = width;
    setLane(width);
  };

  // What the gesture calls on the JS thread, kept current each render behind stable functions so
  // the gesture itself is built once.
  const handlers = useRef({
    begin: () => {},
    showLive: (_percent: number) => {},
    finish: (_next: number | null) => {},
    tick,
  });
  handlers.current = {
    begin: () => {
      dragging.current = true;
    },
    showLive: (whole: number) => shown.set(whole / 100),
    finish: (next: number | null) => {
      dragging.current = false;
      shown.set(next ?? committed);
      if (next === null) return;
      settled.current = next;
      commit(next);
      tick();
    },
    tick,
  };

  const gesture = useMemo(() => {
    const sign = RTL ? -1 : 1;
    const begin = () => handlers.current.begin();
    const showLive = (whole: number) => handlers.current.showLive(whole);
    const finish = (next: number | null) => handlers.current.finish(next);
    const crossed = () => handlers.current.tick();
    const pan = Gesture.Pan()
      .activeOffsetX([-4, 4])
      .onBegin(() => {
        'worklet';
        // The chip shrinks into the knob and the bubble rises as soon as the finger lands.
        press.value = withTiming(1, tabcnTiming);
      })
      .onStart(() => {
        'worklet';
        start.value = pos.value;
        lastPercent.value = Math.round(pos.value * 100);
        lastStep.value = Math.floor(pos.value * steps + 1e-6);
        runOnJS(begin)();
      })
      .onUpdate((event) => {
        'worklet';
        const travel = Math.max(1, inner.value - KNOB - HANDLE_GAP * 2);
        const next = clamp(start.value + (sign * event.translationX) / travel, 0, 1);
        pos.value = next;
        const whole = Math.round(next * 100);
        if (whole !== lastPercent.value) {
          lastPercent.value = whole;
          runOnJS(showLive)(whole);
        }
        const step = Math.floor(next * steps + 1e-6);
        if (step !== lastStep.value) {
          lastStep.value = step;
          runOnJS(crossed)();
        }
      })
      .onEnd((_event, success) => {
        'worklet';
        // The system took the touch (a call, a gesture of its own): glide back, commit nothing.
        if (!success) {
          pos.value = withSpring(start.value, tabcnSpring);
          return;
        }
        const snapped = snapValue(pos.value, steps);
        pos.value = withSpring(snapped, tabcnSpring);
        runOnJS(finish)(snapped);
      })
      .onFinalize((_event, success) => {
        'worklet';
        // The knob widens back into the chip as it glides to the step.
        press.value = withSpring(0, tabcnSpring);
        // Lifted before it moved (a tap), or the system took the touch: nothing to commit here.
        if (!success) runOnJS(finish)(null);
      });
    // A tap jumps to the step nearest the tapped point.
    const tap = Gesture.Tap().onEnd((event) => {
      'worklet';
      const width = inner.value;
      const x = (RTL ? width + TRACK_PAD * 2 - event.x : event.x) - TRACK_PAD;
      const travel = Math.max(1, width - KNOB - HANDLE_GAP * 2);
      const snapped = snapValue((x - HANDLE_GAP - KNOB / 2) / travel, steps);
      pos.value = withSpring(snapped, tabcnSpring);
      runOnJS(finish)(snapped);
    });
    return Gesture.Exclusive(pan, tap);
  }, [steps, inner, pos, press, start, lastPercent, lastStep]);

  // Where the fill ends (from the lane's start edge): the knob travels the lane, and at rest the
  // fill is never shorter than the chip it carries.
  const fillEnd = (p: number, width: number, chipness: number, chip: number) => {
    'worklet';
    const base = KNOB + HANDLE_GAP * 2 + p * (width - KNOB - HANDLE_GAP * 2);
    return clamp(base, chipness * (chip + HANDLE_GAP * 2), width);
  };

  const sign = RTL ? -1 : 1;
  const fillStyle = useAnimatedStyle(() => {
    const end = fillEnd(pos.value, inner.value, 1 - press.value, chipWidth.value);
    return { transform: [{ translateX: sign * (end - inner.value) }] };
  });
  const brightStyle = useAnimatedStyle(() => ({ opacity: press.value }));
  const handleStyle = useAnimatedStyle(() => {
    const p = press.value;
    const width = interpolate(p, [0, 1], [chipWidth.value, KNOB]);
    const height = interpolate(p, [0, 1], [CHIP_HEIGHT, KNOB]);
    const end = fillEnd(pos.value, inner.value, 1 - p, chipWidth.value);
    return {
      width,
      height,
      borderRadius: height / 2,
      transform: [{ translateX: sign * (end - HANDLE_GAP - width) }],
    };
  });
  const chipTextStyle = useAnimatedStyle(() => ({ opacity: clamp(1 - press.value * 2.5, 0, 1) }));
  const bubbleStyle = useAnimatedStyle(() => {
    const p = press.value;
    const width = interpolate(p, [0, 1], [chipWidth.value, KNOB]);
    const end = fillEnd(pos.value, inner.value, 1 - p, chipWidth.value);
    const center = TRACK_PAD + end - HANDLE_GAP - width / 2;
    return {
      opacity: p,
      transform: [{ translateX: sign * (center - BUBBLE / 2) }, { scale: 0.55 + 0.45 * p }],
    };
  });
  const buttonActiveStyle = useAnimatedStyle(() => ({ opacity: press.value }));

  const onAction = (event: AccessibilityActionEvent) => {
    const step = Math.round(committed * steps);
    const name = event.nativeEvent.actionName;
    const next =
      name === 'increment' ? Math.min(steps, step + 1) : name === 'decrement' ? step - 1 : step;
    if (next < 1 || next === step) return;
    tick();
    commit(next / steps);
  };

  const dots = useMemo(() => {
    if (lane <= 0) return [];
    const count = Math.max(0, Math.round(lane / DOT_SPACING) - 1);
    return Array.from({ length: count }, (_, i) => ((i + 1) * lane) / (count + 1));
  }, [lane]);

  return (
    <View
      onLayout={(event) => onHeight(Math.ceil(event.nativeEvent.layout.height))}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius },
      ]}
    >
      <PanelDragArea>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={labels.close}
            hitSlop={{ top: 8, bottom: 8, left: 24, right: 24 }}
            onPress={hide}
            style={styles.grabberTarget}
          >
            <View style={[styles.grabber, { backgroundColor: colors.grabber }]} />
          </Pressable>
          <LiveText
            live={shown}
            render={(v) => resolve(title, v)}
            role="heading"
            numberOfLines={1}
            maxFontSizeMultiplier={1.4}
            style={[styles.title, { color: colors.foreground }]}
          />
          {subtitle ? (
            <Text
              numberOfLines={2}
              maxFontSizeMultiplier={1.4}
              style={[styles.subtitle, { color: colors.muted }]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </PanelDragArea>

      {amount ? (
        <LiveText
          live={shown}
          render={amount}
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
          style={[styles.amount, { color: colors.foreground }]}
        />
      ) : null}
      {detail ? (
        <LiveText
          live={shown}
          render={(v) => detail(v, colors)}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          maxFontSizeMultiplier={1.3}
          style={[styles.detail, { color: colors.muted }]}
        />
      ) : null}

      <View style={styles.slider}>
        {/* The bubble: a square turned 45° with three round corners and one sharp, so it is a
            pin pointing down at the knob; the percentage sits upright over its round part. */}
        <Animated.View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={[styles.bubble, bubbleStyle]}
        >
          <View style={[styles.pin, { backgroundColor: colors.bubble }]} />
          <View style={styles.bubbleLabel}>
            <LiveText
              live={shown}
              render={(v) => labels.percent(Math.round(v * 100))}
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={1}
              style={[styles.bubbleText, { color: colors.bubbleText }]}
            />
          </View>
        </Animated.View>

        <GestureDetector gesture={gesture}>
          <View
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={labels.slider}
            accessibilityValue={{
              min: 0,
              max: 100,
              now: Math.round(committed * 100),
              text: labels.spokenPercent(Math.round(committed * 100)),
            }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={onAction}
            style={[styles.track, { backgroundColor: colors.track }]}
          >
            <View onLayout={onLane} style={styles.lane}>
              {dots.map((x) => (
                <View
                  key={x}
                  style={[styles.dot, { backgroundColor: colors.dot, start: x - DOT / 2 }]}
                />
              ))}
              <Animated.View style={[styles.fillBar, { width: lane }, fillStyle]}>
                <View style={[styles.fill, gradient(colors.fill, colors.fillHighlight)]} />
                <Animated.View
                  style={[
                    styles.fill,
                    gradient(colors.fillActive, colors.fillActiveHighlight),
                    brightStyle,
                  ]}
                />
              </Animated.View>
              <View pointerEvents="none" style={styles.handleRow}>
                <Animated.View
                  style={[styles.handle, { backgroundColor: colors.chip }, handleStyle]}
                >
                  <Animated.Text
                    numberOfLines={1}
                    maxFontSizeMultiplier={CHIP_FONT_MAX}
                    style={[styles.chipText, { color: colors.chipText }, chipTextStyle]}
                  >
                    {chipText}
                  </Animated.Text>
                </Animated.View>
              </View>
            </View>
          </View>
        </GestureDetector>
      </View>

      <PressableScale
        scale={0.98}
        accessibilityLabel={resolve(action, committed)}
        onPress={() => {
          tick();
          onConfirm(committed);
        }}
        style={[styles.button, { backgroundColor: colors.button }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.fill, { backgroundColor: colors.buttonActive }, buttonActiveStyle]}
        />
        <LiveText
          live={shown}
          render={(v) => resolve(action, v)}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={[styles.buttonText, { color: colors.buttonText }]}
        />
      </PressableScale>

      {footer != null ? (
        typeof footer === 'string' ? (
          <Text maxFontSizeMultiplier={1.3} style={[styles.footer, { color: colors.muted }]}>
            {footer}
          </Text>
        ) : (
          <View style={styles.footerRow}>{footer}</View>
        )
      ) : null}
    </View>
  );
}

/** A value the texts read while it changes many times a second, without re-rendering the card. */
type Live = ReturnType<typeof createLive>;

function createLive(initial: number) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next: number) => {
      if (next === value) return;
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** A text drawn from the live value; only it re-renders when the value changes. */
function LiveText({
  live,
  render,
  ...props
}: Omit<TextProps, 'children'> & { live: Live; render: (value: number) => ReactNode }) {
  const value = useSyncExternalStore(live.subscribe, live.get, live.get);
  return <Text {...props}>{render(value)}</Text>;
}

/** The chip's width for its text: 42 pt for "25%", 50 pt for "100%", growing with the text size. */
function chipWidthFor(text: string, fontScale: number) {
  return Math.round(18 + 8 * text.length * Math.min(fontScale, CHIP_FONT_MAX));
}

/** The fill grows from the right in a right-to-left layout. */
const RTL = I18nManager.isRTL;
/** Before the card has measured itself: about its height with every part shown. */
const ESTIMATED_HEIGHT = 430;
/** Space between the card and the bar's top edge. */
const GAP = 10;
/** The track: a pill this tall, with the fill's lane inset by TRACK_PAD on every side. */
const TRACK_HEIGHT = 44;
const TRACK_PAD = 4;
const LANE_HEIGHT = TRACK_HEIGHT - TRACK_PAD * 2;
/** The round knob while dragging, and the chip's height at rest. */
const KNOB = 24;
const CHIP_HEIGHT = 22;
/** Space between the handle and the fill's end. */
const HANDLE_GAP = 6;
/** The chip's text grows with Dynamic Type up to this, so the chip stays inside the fill. */
const CHIP_FONT_MAX = 1.2;
/** The bubble's round part, and the space between its point and the track. */
const BUBBLE = 38;
const BUBBLE_GAP = 6;
/** How far the bubble's point reaches below its round part: half the turned square's diagonal. */
const BUBBLE_TIP = (BUBBLE * Math.SQRT2) / 2 - BUBBLE / 2;
/** The dots along the track. */
const DOT = 3.5;
const DOT_SPACING = 28;

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  card: {
    marginHorizontal: 14,
    paddingHorizontal: 22,
    paddingBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  header: { alignItems: 'center', paddingBottom: 4 },
  // A 44 pt tall target around the small bar.
  grabberTarget: {
    height: 34,
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  grabber: { width: 36, height: 5, borderRadius: 2.5 },
  title: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2, textAlign: 'center' },
  subtitle: { marginTop: 4, fontSize: 13, lineHeight: 17, textAlign: 'center' },
  amount: {
    marginTop: 44,
    fontSize: 54,
    lineHeight: 62,
    fontWeight: '600',
    letterSpacing: -1.4,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  detail: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  // Room above the track for the bubble.
  slider: { paddingTop: BUBBLE + BUBBLE_TIP + BUBBLE_GAP + 8 },
  bubble: {
    position: 'absolute',
    start: 0,
    bottom: TRACK_HEIGHT + BUBBLE_GAP,
    width: BUBBLE,
    height: BUBBLE + BUBBLE_TIP,
    transformOrigin: 'center bottom',
  },
  pin: {
    position: 'absolute',
    top: 0,
    start: 0,
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    // The end corner (logical, so it's the same corner in either direction) turned to point down.
    borderBottomEndRadius: 3,
    transform: [{ rotate: RTL ? '-45deg' : '45deg' }],
  },
  bubbleLabel: {
    position: 'absolute',
    top: 0,
    start: 0,
    width: BUBBLE,
    height: BUBBLE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bubbleText: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    padding: TRACK_PAD,
  },
  lane: {
    flex: 1,
    borderRadius: LANE_HEIGHT / 2,
    overflow: 'hidden',
  },
  dot: {
    position: 'absolute',
    top: (LANE_HEIGHT - DOT) / 2,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  fillBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    borderRadius: LANE_HEIGHT / 2,
    overflow: 'hidden',
  },
  handleRow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    justifyContent: 'center',
  },
  handle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  chipText: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  button: {
    marginTop: 22,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonText: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  footer: { marginTop: 14, fontSize: 13, textAlign: 'center' },
  footerRow: { marginTop: 14, alignItems: 'center' },
});
