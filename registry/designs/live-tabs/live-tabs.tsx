/**
 * Live Tabs: a docked bar whose tabs show what is happening on them right now. A thin ring
 * fills around a tab's icon while something is in progress (a download, a timer), and a
 * live line (a countdown, a track's name, "3 new") takes the label's place, in the accent
 * colour with a small dot.
 *
 * The values come from `useLiveTab(routeName)` in tabcn. A screen, or a component that
 * listens to a service, writes them; the bar draws them without re-rendering the navigator:
 * the ring reads the progress on the UI thread, and new text re-renders only its own tab.
 * Needs a `TabBarProvider` around the tabs navigator; without one the tabs draw no live
 * state.
 *
 * ```tsx
 * <TabBarProvider>
 *   <Tabs tabBar={tabBar(<LiveTabs />)} screenOptions={{ headerShown: false }} />
 * </TabBarProvider>
 *
 * // In the Downloads screen (or a component that follows your download service):
 * const live = useLiveTab('downloads');
 * live.progress.value = received / total; // as often as every frame; 0 or 1 hides the ring
 *
 * // In the Timer screen, once a second:
 * const timer = useLiveTab('timer');
 * timer.progress.value = elapsed / duration;
 * timer.setText(remaining > 0 ? format(remaining) : undefined);
 * ```
 *
 * Names are route names: in Expo Router, a tab's file name (`index`, `timer`), or its
 * folder for a nested stack (`(timer)`). Screen readers hear the live text as the tab's
 * value ("Timer, tab, 2 of 4, 4:59"); progress alone isn't spoken, so write text for what
 * should be heard.
 *
 * The ring fades in and out on tabcnTiming and fills as the progress is written; the live
 * line crossfades with the label; a tab's icon and label colours crossfade as it gains or
 * loses focus; nothing scales, bounces or turns. With "reduce motion" on the fades are instant.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { processColor, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import {
  BadgeCount,
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  tabcnTiming,
  useFocusProgress,
  useLiveTab,
  useTabBar,
} from 'react-native-tabcn';

const defaultColors = {
  /** The bar. */
  background: '#ffffff',
  /** Hairline along the bar's top edge. */
  border: 'rgba(0, 0, 0, 0.08)',
  /** The active tab's icon and label. */
  foreground: '#151517',
  /** The other tabs' icons and labels (5:1 on the default bar). */
  muted: 'rgba(21, 21, 23, 0.62)',
  /** Live text, its dot and the filled part of the ring (5.2:1 on the default bar). */
  accent: '#c2410c',
  /** The ring's unfilled track. */
  track: 'rgba(0, 0, 0, 0.08)',
  /** Badge fill (iOS system red), ringed in `background`. */
  badge: '#ff3b30',
  /** The count on a badge. */
  badgeText: '#ffffff',
};

export type LiveTabsColors = typeof defaultColors;

export interface LiveTabsProps {
  colors?: Partial<LiveTabsColors>;
  /** Label and live-text font. Default: the system font at weight 600. */
  fontFamily?: string;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

export function LiveTabs({ colors: custom, fontFamily, haptics = true }: LiveTabsProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot
      placement="docked"
      style={[styles.bar, { backgroundColor: colors.background, borderTopColor: colors.border }]}
    >
      <TabList style={styles.row}>
        {tabs.map((tab) => (
          <LiveTab
            key={tab.key}
            tab={tab}
            colors={colors}
            fontFamily={fontFamily}
            haptics={haptics}
          />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ICON = 22;
/** The ring's box: the icon plus room for the ring around it. */
const RING = 34;
const STROKE = 2;
const RADIUS = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function LiveTab({
  tab,
  colors,
  fontFamily,
  haptics,
}: {
  tab: TabItem;
  colors: LiveTabsColors;
  fontFamily: string | undefined;
  haptics: boolean;
}) {
  const live = useLiveTab(tab.routeName);
  const { progress } = live;
  const text = live.text?.trim() ? live.text : undefined;
  const font = fontFamily ? { fontFamily } : styles.semibold;

  // Icon and label colours crossfade with focus. The focused icon fades in over the muted
  // one, which stays opaque until the last stretch, so the glyph never dims half-way.
  const focus = useFocusProgress(tab);
  const mutedIcon = useAnimatedStyle(() => ({
    opacity: interpolate(focus.value, [0.8, 1], [1, 0], 'clamp'),
  }));
  const focusedIcon = useAnimatedStyle(() => ({ opacity: focus.value }));
  // Strings, not `colors`: a worklet that captured the object made on each render would
  // restart its animated style on every render.
  const fromColor = colors.muted;
  const toColor = colors.foreground;
  const labelColor = useAnimatedStyle(() => ({
    color: interpolateColor(focus.value, [0, 1], [fromColor, toColor]),
  }));

  // The ring shows only while something is in progress (between 0 and 1, exclusive). The fade
  // starts only when that changes, not on every write of the progress.
  // On the first run (no previous value) it is set at once, so a tab mounts as it stands.
  const ring = useSharedValue(0);
  useAnimatedReaction(
    () => progress.value > 0 && progress.value < 1,
    (active, previous) => {
      if (previous === null) ring.value = active ? 1 : 0;
      else if (active !== previous) ring.value = withTiming(active ? 1 : 0, tabcnTiming);
    },
  );
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value }));
  const ringProps = useAnimatedProps(() => {
    const p = Math.min(1, Math.max(0, progress.value));
    return { strokeDashoffset: CIRCUMFERENCE * (1 - p) };
  });

  // The live line crossfades with the label.
  const showLive = useSharedValue(text ? 1 : 0);
  useEffect(() => {
    showLive.value = withTiming(text ? 1 : 0, tabcnTiming);
  }, [text, showLive]);
  const labelStyle = useAnimatedStyle(() => ({ opacity: 1 - showLive.value }));
  const muted = splitAlpha(colors.muted);
  // The live line stands in for the label, so it carries the focus cue too: a little faded
  // while the tab isn't active, full while it is.
  const liveStyle = useAnimatedStyle(() => ({
    opacity: showLive.value * interpolate(focus.value, [0, 1], [0.7, 1]),
  }));

  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      accessibilityValue={text ? { text } : undefined}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.iconBox}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, ringStyle]}>
          {/* Turned a quarter so the ring fills from the top. A fixed angle, not a motion. */}
          <Svg width={RING} height={RING} style={styles.quarterTurn}>
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={RADIUS}
              stroke={colors.track}
              strokeWidth={STROKE}
              fill="none"
            />
            <AnimatedCircle
              cx={RING / 2}
              cy={RING / 2}
              r={RADIUS}
              stroke={colors.accent}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              fill="none"
              animatedProps={ringProps}
            />
          </Svg>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, mutedIcon]}>
          <View style={[StyleSheet.absoluteFill, styles.center, { opacity: muted.alpha }]}>
            {tab.renderIcon?.({ focused: false, color: muted.color, size: ICON })}
          </View>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, focusedIcon]}>
          {tab.renderIcon?.({ focused: true, color: colors.foreground, size: ICON })}
        </Animated.View>
        <Badge badge={tab.badge} colors={colors} />
      </View>
      <View style={styles.lines}>
        <Animated.View style={[styles.line, labelStyle]}>
          <Animated.Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={[styles.label, font, labelColor]}
          >
            {tab.label}
          </Animated.Text>
        </Animated.View>
        <Animated.View
          style={[styles.line, StyleSheet.absoluteFill, liveStyle]}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={[styles.label, font, styles.live, { color: colors.accent }]}
          >
            {text ?? ''}
          </Text>
        </Animated.View>
      </View>
    </TabButton>
  );
}

/**
 * A badge on the icon's top right, over the ring: a dot for an empty badge, a count otherwise.
 * The tab's accessibility label already reads it.
 */
function Badge({ badge, colors }: { badge: TabItem['badge']; colors: LiveTabsColors }) {
  if (badge == null) return null;
  const text = String(badge).trim();
  const fill = { backgroundColor: colors.badge, borderColor: colors.background };
  if (text === '') return <View pointerEvents="none" style={[styles.badgeDot, fill]} />;
  const textStyle = [styles.badgeText, { color: colors.badgeText }];
  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.badge, fill]}
    >
      {typeof badge === 'number' ? (
        <BadgeCount value={badge} textStyle={textStyle} />
      ) : (
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={[textStyle, styles.badgeTextCap]}
        >
          {text}
        </Text>
      )}
    </View>
  );
}

/**
 * A colour's red, green, blue (0-255) and alpha (0-1), read by React Native's own parser, so
 * named colours, hsl() and every hex form work; null for what it can't read (PlatformColor).
 */
function channels(color: string): [number, number, number, number] | null {
  const value = processColor(color);
  if (typeof value !== 'number') return null;
  return [(value >>> 16) & 255, (value >>> 8) & 255, value & 255, ((value >>> 24) & 255) / 255];
}

/**
 * A translucent colour as its opaque colour and its alpha. An icon drawn in a translucent
 * colour darkens wherever its strokes and fills overlap; drawn opaque under an opacity of the
 * same alpha, it reads evenly.
 */
function splitAlpha(color: string): { color: string; alpha: number } {
  const c = channels(color);
  if (!c) return { color, alpha: 1 };
  return { color: `rgb(${c[0]}, ${c[1]}, ${c[2]})`, alpha: c[3] };
}

const styles = StyleSheet.create({
  // A text badge stays on one line and stops growing at this width, ending in an ellipsis.
  badgeTextCap: { maxWidth: 56 },
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
  },
  iconBox: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  quarterTurn: {
    transform: [{ rotate: '-90deg' }],
  },
  lines: {
    alignSelf: 'stretch',
    height: 14,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  label: {
    fontSize: 10,
  },
  semibold: {
    fontWeight: '600',
  },
  // The icon's top right inside the ring's box: the icon runs from 6 to 28 pt.
  badgeDot: {
    position: 'absolute',
    top: 4,
    left: (RING + ICON) / 2 - 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  badge: {
    position: 'absolute',
    top: 0,
    left: RING / 2 + 3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 13, fontWeight: '700', includeFontPadding: false },
  live: {
    fontVariant: ['tabular-nums'],
  },
});
