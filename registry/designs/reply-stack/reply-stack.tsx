/**
 * Reply Stack: X's frosted-glass navigation bar, with its reply row. A wide glass capsule holds
 * five icon-only tabs; a round glass lens glides behind the active one, whose icon turns solid.
 * Over it, on a post's page, a second capsule of the same width holds the reply field: the
 * viewer's photo, "Post your reply", and photo, GIF and expand buttons. The screen shows through
 * both, blurred. The glass itself is drawn in `reply-stack-glass.tsx`.
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
 * The glass is a blur under a light or dark tint with a bright edge, lit from the top right, and
 * a soft shadow. It follows the system's light or dark appearance unless `tint` is set. Android
 * can't blur what is behind the bar, so there it is a denser fill with the same edge.
 *
 * Motion (lively): the lens glides on tabcnSpring and stretches a little as it sets off, like a
 * drop of glass, settling round as it lands; the active icon's solid form crossfades in over its
 * outline on tabcnTiming. A pressed tab dips to 88% as the finger lands; a pressed reply field
 * dips the whole row to 98% and springs back. The row rises in over 220 ms and sinks away in
 * 150 ms. With "reduce motion" on, every change is instant.
 *
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
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
import { Glass, Lens, type Tint } from './reply-stack-glass';
import { ExpandIcon, GifIcon, PhotoIcon, type ReplyIconProps } from './reply-stack-icons';

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
};

export type ReplyStackColors = typeof darkColors;

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
  /** The viewer's photo, drawn 38 pt across and clipped to a circle. Default: a grey disc. */
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
  /** `light` or `dark` glass. Default: the system's appearance. */
  tint?: 'light' | 'dark';
  colors?: Partial<ReplyStackColors>;
  /** Blur strength (iOS and the web). Default 30. */
  intensity?: number;
  /** A selection tick on pressing a tab that isn't active, and on the reply field. Default true. */
  haptics?: boolean;
}

const defaultActions: readonly ReplyAction[] = [
  { label: 'Add photo', icon: PhotoIcon },
  { label: 'Add GIF', icon: GifIcon },
  { label: 'Expand', icon: ExpandIcon },
];

export function ReplyStack({
  reply,
  showReply = true,
  tint: tintProp,
  colors: custom,
  intensity = 30,
  haptics = true,
}: ReplyStackProps) {
  const system = useColorScheme();
  const tint: Tint = tintProp ?? (system === 'dark' ? 'dark' : 'light');
  const colors = { ...(tint === 'dark' ? darkColors : lightColors), ...custom };
  const { tabs, insets } = useTabBar();
  const window = useWindowDimensions();
  const width = Math.max(0, window.width - insets.left - insets.right - SIDE * 2);
  // The lens fills a tab's cell: every tab is the same width.
  const lensWidth = tabs.length > 0 ? (width - LIST_PAD_X * 2) / tabs.length : 0;
  // Never taller than wide: with six or more tabs the cells are narrower than the pill is tall,
  // and the lens stays a circle, centred.
  const lensHeight = Math.min(PILL_HEIGHT - LIST_PAD_Y * 2, lensWidth);
  const lensInsetY = (PILL_HEIGHT - LIST_PAD_Y * 2 - lensHeight) / 2;
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

  return (
    <TabBarRoot placement="floating" offset={offset}>
      <View style={[styles.column, { width }]}>
        {mounted && shownReply ? (
          <ReplyRow
            reply={shownReply}
            presence={presence}
            colors={colors}
            tint={tint}
            intensity={intensity}
            width={width}
            haptics={haptics}
          />
        ) : null}
        <Glass colors={colors} tint={tint} intensity={intensity} width={width} height={PILL_HEIGHT}>
          <TabList style={styles.list}>
            <TabIndicator
              inset={{ x: 0, y: lensInsetY }}
              style={[styles.lens, tint === 'light' ? styles.lensLift : null]}
            >
              <StretchingLens colors={colors} width={lensWidth} height={lensHeight} />
            </TabIndicator>
            {tabs.map((tab) => (
              <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
            ))}
          </TabList>
        </Glass>
      </View>
    </TabBarRoot>
  );
}

/**
 * The lens, stretching as it sets off for a new tab and settling round as it lands: it widens by
 * up to 14% and flattens by 5% in 110 ms, then springs back while the glide finishes. Not taken
 * from X (its clips never change tab): it is how glass lenses move on today's phones.
 */
function StretchingLens(props: Parameters<typeof Lens>[0]) {
  const { activeIndex } = useTabBar();
  const stretch = useSharedValue(0);
  const shownIndex = useRef(activeIndex);
  useEffect(() => {
    // Only a change of tab moves the lens; the first render and a hidden route (-1) don't.
    if (activeIndex === shownIndex.current) return;
    const from = shownIndex.current;
    shownIndex.current = activeIndex;
    if (from < 0 || activeIndex < 0) return;
    stretch.value = withSequence(withTiming(1, STRETCH_OUT), withSpring(0, STRETCH_BACK));
  }, [activeIndex, stretch]);
  const shape = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 + 0.14 * stretch.value }, { scaleY: 1 - 0.05 * stretch.value }],
  }));
  return (
    <Animated.View style={shape}>
      <Lens {...props} />
    </Animated.View>
  );
}

/**
 * The reply row: the field (one press area: photo and placeholder) and the action buttons beside
 * it, each its own button. Pressing the field dips the whole row.
 */
function ReplyRow({
  reply,
  presence,
  colors,
  tint,
  intensity,
  width,
  haptics,
}: {
  reply: ReplyConfig;
  presence: SharedValue<number>;
  colors: ReplyStackColors;
  tint: Tint;
  intensity: number;
  width: number;
  haptics: boolean;
}) {
  const placeholder = reply.placeholder ?? 'Post your reply';
  const actions = reply.actions ?? defaultActions;
  const scale = useSharedValue(1);
  // Rises 12 pt from behind the tabs as it fades in; dips while the field is pressed.
  const motion = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(presence.value, [0, 1], [12, 0]) },
      { scale: interpolate(presence.value, [0, 1], [0.96, 1]) * scale.value },
    ],
  }));
  return (
    <Animated.View style={motion}>
      <Glass
        colors={colors}
        tint={tint}
        intensity={intensity}
        width={width}
        height={ROW_HEIGHT}
        presence={presence}
      >
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={placeholder}
            onPressIn={() => {
              scale.value = withTiming(0.98, PRESS_DOWN);
              if (haptics) Haptics.selectionAsync();
            }}
            onPressOut={() => {
              scale.value = withSpring(1, PRESS_UP);
            }}
            onPress={reply.onPress}
            style={styles.field}
          >
            <View style={[styles.avatar, { backgroundColor: colors.avatar }]}>{reply.avatar}</View>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
              // At large text sizes it shrinks a little before it would cut off.
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={[styles.placeholder, { color: colors.placeholder }]}
            >
              {placeholder}
            </Text>
          </Pressable>
          <View style={styles.actions}>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={action.onPress}
                style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
              >
                <action.icon color={colors.foreground} size={ACTION_ICON} />
              </Pressable>
            ))}
          </View>
        </View>
      </Glass>
    </Animated.View>
  );
}

/**
 * A tab: its outline icon, with the solid form crossfading in over it as the tab gains focus.
 * The tab dips as the finger lands (TabButton's press scale).
 */
function Tab({
  tab,
  colors,
  haptics,
}: {
  tab: TabItem;
  colors: ReplyStackColors;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  // The outline holds until late in the change, so the icon never looks dimmed half-way.
  const outline = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, progress.value * 1.4) }));
  const solid = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <TabButton
      tab={tab}
      scale={0.88}
      style={styles.tab}
      // No tick for the tab that's already active: nothing changes.
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
      ) : (
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={[styles.fallback, { color: colors.foreground }]}
        >
          {tab.label}
        </Text>
      )}
    </TabButton>
  );
}

/**
 * A badge at the icon's top right, drawn only when the tab sets one: an empty badge ('') is a
 * dot, a number a count. Hidden from screen readers: `TabButton` reads it with the label.
 */
function Badge({ badge, colors }: { badge: TabItem['badge']; colors: ReplyStackColors }) {
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
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[textStyle, styles.badgeCap]}>
          {text}
        </Text>
      )}
    </View>
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
/** Tab icons (the glyphs fill about 23 pt of it) and the reply row's action icons. */
const ICON = 31;
const ACTION_ICON = 24;

const PRESS_DOWN = {
  duration: 100,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};
const STRETCH_OUT = {
  duration: 110,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};
const STRETCH_BACK = { duration: 380, dampingRatio: 0.75, reduceMotion: ReduceMotion.System };
const PRESS_UP = { duration: 320, dampingRatio: 0.7, reduceMotion: ReduceMotion.System };
// The row rises in, and sinks away in about 70% of the time. Nobody tapped the row to make it
// leave, so its exit can ease in.
const ROW_IN = {
  duration: 220,
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
  list: { flex: 1, paddingHorizontal: LIST_PAD_X, paddingVertical: LIST_PAD_Y },
  lens: { borderRadius: 999 },
  lensLift: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fallback: { fontSize: 12, fontWeight: '600' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  field: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 10,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden' },
  placeholder: { flex: 1, fontSize: 17.5 },
  actions: { flexDirection: 'row', alignItems: 'center', paddingRight: 9 },
  action: { width: 56, height: 48, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.5 },
  badgeCap: { maxWidth: 56 },
  dot: { position: 'absolute', top: 1, right: 0, width: 9, height: 9, borderRadius: 5 },
  count: {
    position: 'absolute',
    top: -3,
    left: ICON - 10,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10.5, lineHeight: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
