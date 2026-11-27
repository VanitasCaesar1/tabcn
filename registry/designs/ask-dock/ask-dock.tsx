/**
 * Ask Dock: a search prompt over a glass tab bar, for apps you ask things of. A frosted capsule
 * holds the tabs, each an icon over its label, with a soft lit pill behind the active one. Above
 * it floats the prompt: a frosted card you type into, with photo and video buttons and a round
 * send button. While a search runs, the bar folds into a small status pill: a glossy orb that
 * scans and blinks beside a line of status ("Taking a closer look…") that changes as the search
 * goes on, and unfolds back into the tabs when it's done.
 *
 * ```tsx
 * <Tabs tabBar={tabBar(<AskDock prompt={{ onSend: search }} status={searching ? 'Looking…' : null} />)} />
 * ```
 *
 * The status belongs to your app: pass `status` while a search runs and change it as it goes
 * (the pill's width follows each line); pass `null` when it ends. `onStatusPress` makes the pill
 * a button, such as to cancel. The prompt is opt-in (`prompt`), and `showPrompt` hides it on
 * screens where it doesn't belong. Focused, the prompt rides on top of the keyboard while the
 * tabs stay put behind it; its card darkens and a blue-to-violet ring lights round it.
 *
 * Motion (lively): the lit pill glides on tabcnSpring and stretches as it sets off; icons turn
 * solid and labels brighten on tabcnTiming. The fold is one spring with a little overshoot: the
 * capsule narrows round its centre into the pill and rises 52 pt while the tabs fade, then the orb pops in and
 * the status slides in after it; the prompt sinks away under it. Status lines rise in and the old
 * one lifts out. A pressed tab dips to 92%. With "reduce motion" on, every change is instant
 * and the orb holds still.
 *
 * Files: ask-dock.tsx (this one: the bar and the fold), ask-dock-prompt.tsx (the prompt and the
 * frost), ask-dock-orb.tsx (the orb, also for your own screens) and ask-dock-icons.tsx.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { type ComponentRef, useEffect, useId, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  type TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  KeyboardState,
  ReduceMotion,
  runOnJS,
  useAnimatedKeyboard,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import {
  BadgeCount,
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  useFocusProgress,
  useTabBar,
} from 'react-native-tabcn';
import { Orb, type OrbColors } from './ask-dock-orb';
import { type AskAttachment, Frost, Prompt } from './ask-dock-prompt';

export type { AskAttachment } from './ask-dock-prompt';

const defaultColors = {
  /** The tab capsule's tint, over the blur. */
  tint: 'rgba(34, 60, 134, 0.42)',
  /** The capsule on Android, where nothing behind the bar can be blurred. */
  fill: 'rgba(38, 62, 128, 0.95)',
  /** The status pill's tint: lighter, as the capsule folds into it. */
  statusTint: 'rgba(124, 164, 238, 0.58)',
  /** The capsule's edge. */
  rim: 'rgba(255, 255, 255, 0.22)',
  /** The lit pill behind the active tab, and its edge. */
  lit: 'rgba(255, 255, 255, 0.15)',
  litRim: 'rgba(255, 255, 255, 0.1)',
  /** Idle icons and labels. */
  foreground: 'rgba(224, 231, 250, 0.74)',
  /** The active tab's icon and label. */
  active: '#ffffff',
  /** The status line. */
  statusText: '#ffffff',
  /** The soft band of light that sweeps across the status line while it waits (drawn at 20%). */
  sheen: '#ffffff',
  /** The prompt card's tint at rest, and focused. */
  promptTint: 'rgba(56, 80, 178, 0.32)',
  promptFocused: 'rgba(12, 14, 34, 0.9)',
  /** The prompt card on Android. */
  promptFill: 'rgba(30, 44, 104, 0.96)',
  /** The prompt's edge at rest. */
  promptRim: 'rgba(255, 255, 255, 0.14)',
  /** The focus ring, from its top left to its bottom right. */
  ring: '#2f6bff',
  ringEnd: '#7a36ff',
  placeholder: 'rgba(206, 214, 245, 0.7)',
  /** Typed text. */
  text: '#ffffff',
  /** The photo and video buttons. */
  action: 'rgba(222, 229, 250, 0.84)',
  /** The send button with nothing to send, and its arrow. */
  send: 'rgba(255, 255, 255, 0.12)',
  sendIcon: 'rgba(255, 255, 255, 0.7)',
  /** The send button once there is something to send, and its arrow. */
  sendReady: '#ffffff',
  sendReadyIcon: '#1f5bff',
  /** The attachment's remove button and its cross. */
  chipButton: '#ffffff',
  chipButtonIcon: '#0b0f1e',
  /** Badge fill and text, drawn only when a tab sets `tabBarBadge`. */
  badge: '#ff5a5f',
  badgeText: '#ffffff',
  /** Under the capsule. */
  shadow: 'rgba(2, 8, 40, 0.3)',
};

export type AskDockColors = typeof defaultColors;

const defaultLabels = {
  addPhoto: 'Add photo',
  addVideo: 'Add video',
  /** The send button. */
  send: 'Search',
  /** The attachment's remove button, read before the attachment's own label. */
  remove: 'Remove',
  /** Read after the status when `onStatusPress` is set. */
  statusHint: 'Cancels the search',
};

export type AskDockLabels = typeof defaultLabels;

/** The prompt over the tabs. */
export interface AskPrompt {
  /** The field's text when empty. Default "Describe it, or paste a clue…". */
  placeholder?: string;
  /** Runs with the trimmed text when the send button or the keyboard's search key is pressed. */
  onSend?: (text: string) => void;
  /** Shows the photo button. */
  onAddPhoto?: () => void;
  /** Shows the video button. */
  onAddVideo?: () => void;
  /** Drawn as a small card over the prompt. With one, the prompt can send without text. */
  attachment?: AskAttachment;
}

export interface AskDockProps {
  /** The prompt above the tabs. Without it the bar is just the tabs. */
  prompt?: AskPrompt;
  /** Shows the prompt. Drive it from your screen's state. Default true. */
  showPrompt?: boolean;
  /** While set, the bar folds into the status pill with this line. `null` unfolds it. */
  status?: string | null;
  /** Makes the status pill a button, such as to cancel the search. */
  onStatusPress?: () => void;
  colors?: Partial<AskDockColors>;
  /** The orb's colours. */
  orbColors?: Partial<OrbColors>;
  /** Screen-reader labels: the prompt's buttons, the attachment's remove button and the status pill's hint. */
  labels?: Partial<AskDockLabels>;
  /** Blur strength (iOS and the web). Default 28. */
  intensity?: number;
  /** A tick on pressing a tab, sending, and as the bar unfolds. Default true. */
  haptics?: boolean;
}

export function AskDock({
  prompt,
  showPrompt = true,
  status,
  onStatusPress,
  colors: custom,
  orbColors,
  labels: customLabels,
  intensity = 28,
  haptics = true,
}: AskDockProps) {
  const colors = { ...defaultColors, ...custom };
  const labels = { ...defaultLabels, ...customLabels };
  const { tabs, insets } = useTabBar();
  const window = useWindowDimensions();
  const width = Math.max(0, window.width - insets.left - insets.right - SIDE * 2);
  // 91 pt a tab, as in the reference, narrowed only when the screen can't hold them all.
  const cell = tabs.length > 0 ? Math.min(CELL, (width - LIST_PAD * 2) / tabs.length) : CELL;
  const tabsWidth = cell * tabs.length + LIST_PAD * 2;
  // The capsule sits just above the home indicator, lower than most floating bars.
  const offset = insets.bottom > 0 ? BOTTOM_GAP : BOTTOM_GAP_FLAT;

  // The fold: 0 is the tabs, 1 the status pill.
  const busy = typeof status === 'string' && status.length > 0;
  const [shownStatus, setShownStatus] = useState(busy ? status : '');
  if (busy && status !== shownStatus) setShownStatus(status);
  const fold = useSharedValue(busy ? 1 : 0);
  const wasBusy = useRef(busy);
  useEffect(() => {
    fold.value = withSpring(busy ? 1 : 0, busy ? FOLD : UNFOLD);
    if (wasBusy.current && !busy && haptics) Haptics.selectionAsync();
    wasBusy.current = busy;
  }, [busy, fold, haptics]);
  useEffect(() => {
    if (busy && status) AccessibilityInfo.announceForAccessibility(status);
  }, [busy, status]);

  // The pill is as wide as its line: measured off screen, and it glides between lines.
  const [lineWidth, setLineWidth] = useState(0);
  const pillWidth = Math.min(width, ORB + ORB_GAP + lineWidth + PILL_END);
  const pill = useSharedValue(pillWidth);
  useEffect(() => {
    // A new line glides the pill to its width; folding starts from the right width at once.
    pill.value = fold.value > 0.5 ? withSpring(pillWidth, RESIZE) : pillWidth;
  }, [pillWidth, pill, fold]);

  // The prompt fades as the bar folds, and when the screen hides it.
  const visible = prompt !== undefined && showPrompt;
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const [lastPrompt, setLastPrompt] = useState(prompt);
  if (prompt && prompt !== lastPrompt) setLastPrompt(prompt);
  const shown = useSharedValue(visible ? 1 : 0);
  useEffect(() => {
    shown.value = withTiming(visible ? 1 : 0, visible ? ROW_IN : ROW_OUT, (finished) => {
      if (finished && !visible) runOnJS(setMounted)(false);
    });
  }, [visible, shown]);
  const presence = useDerivedValue(
    () => shown.value * interpolate(fold.value, [0, 0.6], [1, 0], Extrapolation.CLAMP),
  );
  const shownPrompt = prompt ?? lastPrompt;

  // Focused, the prompt rides on top of the keyboard. A spacer under the tabs grows the bar's
  // box once the keyboard has settled (so the lifted prompt stays inside it and touchable);
  // while the keyboard moves, a transform follows it instead.
  const keyboard = useAnimatedKeyboard();
  const focus = useSharedValue(0);
  const promptBottom = insets.bottom + offset + BAR_HEIGHT + GAP;
  const lift = useDerivedValue(() =>
    focus.value > 0 ? Math.max(0, keyboard.height.value + KEYBOARD_GAP - promptBottom) : 0,
  );
  const settled = useSharedValue(0);
  useAnimatedReaction(
    () => ({ state: keyboard.state.value, to: lift.value }),
    ({ state, to }) => {
      const atRest =
        state === KeyboardState.OPEN ||
        state === KeyboardState.CLOSED ||
        state === KeyboardState.UNKNOWN;
      if (atRest && settled.value !== to) settled.value = to;
    },
  );
  const spacer = useAnimatedStyle(() => ({ height: settled.value }));
  const promptMotion = useAnimatedStyle(() => ({
    transform: [
      { translateY: settled.value - lift.value + interpolate(presence.value, [0, 1], [18, 0]) },
      { scale: interpolate(presence.value, [0, 1], [0.96, 1]) },
    ],
  }));
  const stay = useAnimatedStyle(() => ({ transform: [{ translateY: settled.value }] }));

  // The capsule: tabs at rest, the status pill folded. It narrows round its centre.
  const press = useSharedValue(1);
  const shell = useAnimatedStyle(() => ({
    width: interpolate(fold.value, [0, 1], [tabsWidth, pill.value]),
    height: interpolate(fold.value, [0, 1], [BAR_HEIGHT, STATUS_HEIGHT]),
    // The pill rides up as it folds, clear of the home indicator, as in the reference.
    transform: [
      { translateY: interpolate(fold.value, [0, 1], [0, -STATUS_RISE]) },
      { scale: press.value },
    ],
  }));
  // Worklets capture plain strings, not the colours object, so a re-render with the same colours
  // doesn't rebuild them.
  const tintRest = colors.tint;
  const tintBusy = colors.statusTint;
  const tint = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(fold.value, [0, 1], [tintRest, tintBusy]),
  }));
  const tabsFade = useAnimatedStyle(() => ({
    opacity: interpolate(fold.value, [0, 0.4], [1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(fold.value, [0, 1], [1, 0.9]) }],
  }));
  const orbIn = useAnimatedStyle(() => ({
    opacity: interpolate(fold.value, [0.25, 0.6], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(fold.value, [0.3, 1], [0.4, 1], Extrapolation.CLAMP) }],
  }));
  const lineIn = useAnimatedStyle(() => ({
    opacity: interpolate(fold.value, [0.5, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateX: interpolate(fold.value, [0.5, 1], [10, 0], Extrapolation.CLAMP) }],
  }));

  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  useEffect(() => {
    if (busy) inputRef.current?.blur();
  }, [busy]);

  return (
    <TabBarRoot placement="floating" offset={offset}>
      <View style={[styles.column, { width }]}>
        {/* Measures the status line, off screen and unseen. */}
        <View
          pointerEvents="none"
          style={styles.measure}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={styles.statusText}
            onLayout={(e) => setLineWidth(Math.ceil(e.nativeEvent.layout.width))}
          >
            {shownStatus}
          </Text>
        </View>
        {mounted && shownPrompt ? (
          <Animated.View
            style={[styles.prompt, promptMotion]}
            pointerEvents={busy || !visible ? 'none' : 'auto'}
            accessibilityElementsHidden={busy}
            importantForAccessibility={busy ? 'no-hide-descendants' : 'auto'}
          >
            <Prompt
              colors={colors}
              labels={labels}
              placeholder={shownPrompt.placeholder ?? 'Describe it, or paste a clue…'}
              width={width}
              intensity={intensity}
              presence={presence}
              focus={focus}
              busy={busy}
              haptics={haptics}
              attachment={shownPrompt.attachment}
              onSend={shownPrompt.onSend}
              onAddPhoto={shownPrompt.onAddPhoto}
              onAddVideo={shownPrompt.onAddVideo}
              inputRef={inputRef}
              initial={visible && !busy ? 1 : 0}
            />
          </Animated.View>
        ) : null}
        <Animated.View style={[styles.slot, stay]}>
          <Animated.View
            style={[styles.shell, { boxShadow: `0 10px 30px ${colors.shadow}` }, shell]}
          >
            <View style={styles.clip}>
              <Frost intensity={intensity} fill={colors.fill} tintStyle={tint} />
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, styles.rim, { borderColor: colors.rim }]}
              />
              <Animated.View
                style={[{ width: tabsWidth, height: BAR_HEIGHT }, tabsFade]}
                pointerEvents={busy ? 'none' : 'auto'}
                accessibilityElementsHidden={busy}
                importantForAccessibility={busy ? 'no-hide-descendants' : 'auto'}
              >
                <TabList style={styles.list}>
                  <TabIndicator inset={{ x: 0, y: LIT_INSET }}>
                    <StretchingLit colors={colors} />
                  </TabIndicator>
                  {tabs.map((tab) => (
                    <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
                  ))}
                </TabList>
              </Animated.View>
              <Pressable
                disabled={!busy || !onStatusPress}
                accessible={busy}
                accessibilityRole={onStatusPress ? 'button' : 'text'}
                accessibilityLabel={shownStatus}
                accessibilityHint={onStatusPress ? labels.statusHint : undefined}
                accessibilityLiveRegion="polite"
                onPressIn={() => {
                  press.value = withTiming(0.96, PRESS_DOWN);
                }}
                onPressOut={() => {
                  press.value = withSpring(1, PRESS_UP);
                }}
                onPress={() => {
                  if (haptics) Haptics.selectionAsync();
                  onStatusPress?.();
                }}
                pointerEvents={busy ? 'auto' : 'none'}
                style={[styles.status, { width: pillWidth }]}
              >
                <Animated.View style={orbIn}>
                  <Orb size={ORB} busy={busy} alive={false} colors={orbColors} />
                </Animated.View>
                <Animated.View style={[styles.line, lineIn]}>
                  <StatusLine text={shownStatus} color={colors.statusText} />
                </Animated.View>
                <Sheen busy={busy} width={pillWidth - SHEEN_START} color={colors.sheen} />
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
        <Animated.View style={spacer} />
      </View>
    </TabBarRoot>
  );
}

/**
 * The status line. A new line rises in as the old one lifts out (220 ms in, the old one gone in
 * the first 70% of it), on the UI thread and without layout animations.
 */
function StatusLine({ text, color }: { text: string; color: string }) {
  const [lines, setLines] = useState({ current: text, previous: '' });
  if (text !== lines.current) setLines({ current: text, previous: lines.current });
  const swap = useSharedValue(1);
  useEffect(() => {
    if (!lines.previous) return;
    swap.value = 0;
    swap.value = withTiming(1, LINE_IN);
  }, [lines, swap]);
  const incoming = useAnimatedStyle(() => ({
    opacity: swap.value,
    transform: [{ translateY: (1 - swap.value) * 8 }],
  }));
  const outgoing = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - swap.value * 1.4),
    transform: [{ translateY: -swap.value * 8 }],
  }));
  const textStyle = [styles.statusText, { color }];
  return (
    <View>
      {lines.previous ? (
        <Animated.Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={[textStyle, styles.outgoing, outgoing]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {lines.previous}
        </Animated.Text>
      ) : null}
      <Animated.Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[textStyle, incoming]}>
        {lines.current}
      </Animated.Text>
    </View>
  );
}

/**
 * A soft band of light sweeping across the status line every 2 s while a search runs, so a long
 * wait still reads as work going on. Off with reduce motion.
 */
function Sheen({ busy, width, color }: { busy: boolean; width: number; color: string }) {
  const reduceMotion = useReducedMotion();
  const id = `sheen${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const x = useSharedValue(0);
  const running = busy && !reduceMotion;
  useEffect(() => {
    if (!running) {
      cancelAnimation(x);
      x.value = 0;
      return;
    }
    x.value = withRepeat(
      withSequence(withTiming(1, SWEEP), withDelay(700, withTiming(0, { duration: 0 }))),
      -1,
    );
  }, [running, x]);
  const band = useAnimatedStyle(() => ({
    opacity: running ? 1 : 0,
    transform: [{ translateX: -SHEEN_WIDTH + x.value * (width + SHEEN_WIDTH) }],
  }));
  return (
    <View pointerEvents="none" style={[styles.sheen, { width }]}>
      <Animated.View style={band}>
        <Svg width={SHEEN_WIDTH} height={STATUS_HEIGHT}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={color} stopOpacity={0} />
              <Stop offset="0.5" stopColor={color} stopOpacity={0.2} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width={SHEEN_WIDTH} height={STATUS_HEIGHT} fill={`url(#${id})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/**
 * The lit pill behind the active tab, stretching a little as it sets off for a new tab and
 * settling as it lands.
 */
function StretchingLit({ colors }: { colors: AskDockColors }) {
  const { activeIndex } = useTabBar();
  const stretch = useSharedValue(0);
  const shownIndex = useRef(activeIndex);
  useEffect(() => {
    if (activeIndex === shownIndex.current) return;
    const from = shownIndex.current;
    shownIndex.current = activeIndex;
    if (from < 0 || activeIndex < 0) return;
    stretch.value = withSequence(withTiming(1, STRETCH_OUT), withSpring(0, STRETCH_BACK));
  }, [activeIndex, stretch]);
  const shape = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 + 0.1 * stretch.value }, { scaleY: 1 - 0.04 * stretch.value }],
  }));
  return (
    <Animated.View
      style={[styles.lit, { backgroundColor: colors.lit, borderColor: colors.litRim }, shape]}
    />
  );
}

/** A tab: its icon over its label. The solid icon crossfades in and the label brightens. */
function Tab({ tab, colors, haptics }: { tab: TabItem; colors: AskDockColors; haptics: boolean }) {
  const progress = useFocusProgress(tab);
  const outline = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, progress.value * 1.4) }));
  const solid = useAnimatedStyle(() => ({ opacity: progress.value }));
  const idle = colors.foreground;
  const on = colors.active;
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [idle, on]),
  }));
  return (
    <TabButton
      tab={tab}
      scale={0.92}
      style={styles.tab}
      onPressIn={haptics && !tab.focused ? () => Haptics.selectionAsync() : undefined}
    >
      {tab.renderIcon ? (
        <View>
          <Animated.View style={outline}>
            {tab.renderIcon({ focused: false, color: colors.foreground, size: ICON })}
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, solid]}>
            {tab.renderIcon({ focused: true, color: colors.active, size: ICON })}
          </Animated.View>
          <Badge badge={tab.badge} colors={colors} />
        </View>
      ) : null}
      <Animated.Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[styles.label, label]}
      >
        {tab.label}
      </Animated.Text>
    </TabButton>
  );
}

/** A count or a dot at the icon's top right. `TabButton` reads it with the label. */
function Badge({ badge, colors }: { badge: TabItem['badge']; colors: AskDockColors }) {
  if (badge == null) return null;
  const text = String(badge).trim();
  if (!text) return <View style={[styles.dot, { backgroundColor: colors.badge }]} />;
  const textStyle = [styles.badgeText, { color: colors.badgeText }];
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.count, { backgroundColor: colors.badge }]}
    >
      {typeof badge === 'number' ? (
        <BadgeCount value={badge} textStyle={textStyle} />
      ) : (
        <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={textStyle}>
          {text}
        </Text>
      )}
    </View>
  );
}

// Measured from the reference on a 402 pt wide screen.
/** The prompt's gap to the screen's sides. */
const SIDE = 20;
const BAR_HEIGHT = 65;
/** A tab's width, and the tab row's inset inside the capsule. */
const CELL = 91;
const LIST_PAD = 4;
/** The lit pill's inset from the capsule's top and bottom: 58 pt tall. */
const LIT_INSET = 3.5;
/** Between the prompt and the tabs, and between the prompt and the keyboard. */
const GAP = 24;
const KEYBOARD_GAP = 10;
/** Above the bottom safe area: over a home indicator, and without one. */
const BOTTOM_GAP = 2;
const BOTTOM_GAP_FLAT = 14;
const ICON = 24;
/** The status pill: its height, the orb, and the space round its line. */
const STATUS_HEIGHT = 40;
/** How far the pill sits above the tabs' centre: 52 pt in the reference. */
const STATUS_RISE = 52;
const ORB = 40;
const ORB_GAP = 11;
const PILL_END = 18;
const SHEEN_WIDTH = 90;
/** The sheen runs over the line only, starting just past the orb. */
const SHEEN_START = ORB + 4;

// Springs by stiffness and damping: Reanimated's duration-based springs settle in their duration
// but do most of the move in its first fifth, too quick to read as a fold.
const FOLD = { stiffness: 90, damping: 14, mass: 1, reduceMotion: ReduceMotion.System };
const UNFOLD = { stiffness: 110, damping: 17, mass: 1, reduceMotion: ReduceMotion.System };
const RESIZE = { stiffness: 140, damping: 21, mass: 1, reduceMotion: ReduceMotion.System };
const STRETCH_OUT = {
  duration: 110,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};
const STRETCH_BACK = { duration: 380, dampingRatio: 0.75, reduceMotion: ReduceMotion.System };
const PRESS_DOWN = {
  duration: 100,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};
const PRESS_UP = { duration: 320, dampingRatio: 0.7, reduceMotion: ReduceMotion.System };
const LINE_IN = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};
const SWEEP = {
  duration: 1300,
  easing: Easing.inOut(Easing.quad),
  reduceMotion: ReduceMotion.System,
};
// The prompt rises in, and sinks away in about 70% of the time.
const ROW_IN = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};
const ROW_OUT = {
  duration: 150,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};

const styles = StyleSheet.create({
  column: { alignItems: 'center' },
  measure: { position: 'absolute', opacity: 0, left: 0, top: 0, flexDirection: 'row' },
  prompt: { marginBottom: GAP },
  slot: {
    height: BAR_HEIGHT,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shell: { borderRadius: 999, borderCurve: 'continuous' },
  clip: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rim: { borderRadius: 999, borderWidth: StyleSheet.hairlineWidth * 2 },
  list: { flex: 1, paddingHorizontal: LIST_PAD, paddingVertical: LIT_INSET },
  lit: {
    flex: 1,
    borderRadius: 999,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 13.5, fontWeight: '600', letterSpacing: -0.1 },
  status: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: { flex: 1, marginLeft: ORB_GAP, marginRight: PILL_END - 4, justifyContent: 'center' },
  statusText: { fontSize: 16, fontWeight: '500', letterSpacing: -0.2 },
  outgoing: { position: 'absolute', left: 0, right: 0 },
  sheen: { position: 'absolute', left: SHEEN_START, top: 0, bottom: 0, overflow: 'hidden' },
  dot: { position: 'absolute', top: 0, right: -2, width: 8, height: 8, borderRadius: 4 },
  count: {
    position: 'absolute',
    top: -4,
    left: ICON - 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
