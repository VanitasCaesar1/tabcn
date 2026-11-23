/**
 * Accent Dark: Strava's tab bar. A classic iOS tab bar in dark mode: a flat charcoal bar,
 * full width and flush with the bottom edge, under a hairline darker than both the bar and
 * the screen. Five equal tabs, each an icon over a label that is always shown. Inactive tabs
 * are pure white, not dimmed; the active tab turns Strava orange and its outline icon becomes
 * a solid one. There is no pill, underline or dot, and nothing grows or moves.
 *
 * Record: in the app, Record opens a full-screen recorder instead of a screen with the bar.
 * Pass `onActionPress` (and `actionIcon`) to get that: the middle slot becomes an action that
 * looks like the other tabs but never turns orange, and your navigator keeps four tabs. It is
 * marked with `usePanelAnchor('action')`, so a `TabPanel` can open from it. Without
 * `onActionPress`, every route is a plain tab, Record included.
 *
 * Motion: the app swaps tint and glyph at once, as a UITabBar does. Here the outline and
 * solid glyphs crossfade and the label colour fades, both on tabcnTiming shortened to 150 ms.
 * Pass `duration={0}` for the app's instant swap. Reduce motion makes it instant too. Presses
 * show no dim or scale. The bar is opaque: no glass, blur or shadow. (The App Store preview
 * video slides the bar off the bottom while a page scrolls. That looks like a marketing edit,
 * and a docked bar can't leave the space it holds, so it isn't reproduced.)
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 *
 * Measured on the app's dark App Store screenshots. The phone screen in them is 749 px wide
 * and its 134 pt home indicator is 268 px, so the screen is 375 pt at 2 px per pt. The bar is
 * 49 pt tall above the 34 pt home-indicator inset (83.5 pt from its top edge to the screen's
 * bottom), with a 1 px hairline on top. Slots are 75 pt wide with no side padding. The 24 pt
 * icon box starts 7.5 pt below the bar's top edge (the Record ring fills it); label caps start
 * at 37.5 pt with the baseline at 45.5 pt. Labels: 11 pt medium (7.75 pt caps), about 6%
 * narrower than the system font, so tracked in a little. Bar #212220, hairline #0e0f0d,
 * screen behind it #141414, orange #fc5300 sampled (Strava's brand orange, #fc5200).
 * The orange is kept as Strava has it, though on the light bar it is only 3.3:1 for labels.
 */
import * as Haptics from 'expo-haptics';
import { type ReactNode, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type WithTimingConfig,
} from 'react-native-reanimated';
import {
  BadgeCount,
  PressableScale,
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  tabcnTiming,
  useFocusProgress,
  usePanelAnchor,
  useTabBar,
} from 'react-native-tabcn';

const defaultColors = {
  /** The bar, which also fills the home-indicator area. */
  background: '#212220',
  /** The 1 px line along the bar's top edge. */
  hairline: '#0e0f0d',
  /** Active icon and label: Strava orange. */
  accent: '#fc5200',
  /** Inactive icons and labels, and the Record action. */
  foreground: '#ffffff',
  /** Badge fill and text (iOS's system badge; the app showed none). */
  badge: '#ff3b30',
  badgeText: '#ffffff',
};

export type AccentDarkColors = typeof defaultColors;

/**
 * Strava's light mode, from its App Store preview video: a near-white bar under a light grey
 * hairline, with black inactive tabs and the same orange. Pass it as `colors`.
 */
export const accentDarkLightColors: AccentDarkColors = {
  background: '#fdfdfd',
  hairline: '#d7d7d7',
  accent: '#fc5200',
  foreground: '#000000',
  badge: '#ff3b30',
  badgeText: '#ffffff',
};

export interface AccentDarkProps {
  colors?: Partial<AccentDarkColors>;
  /**
   * Runs when the middle slot (Record) is pressed. With it, the middle slot is an action
   * drawn like a tab, between the first and second halves of your tabs: give the navigator
   * four tabs. Without it, all routes are tabs.
   */
  onActionPress?: () => void;
  /** Label under the action's icon, also read by screen readers. Default "Record". */
  actionLabel?: string;
  /**
   * The action's icon, 24 pt, in the `foreground` colour, such as
   * `<RecordIcon color="#ffffff" size={24} />` from this design's icons. Pass a function to
   * get that colour and size from the design, so the icon follows `colors`:
   * `({ color, size }) => <RecordIcon color={color} size={size} />`.
   */
  actionIcon?: ReactNode | ((props: { color: string; size: number }) => ReactNode);
  /**
   * Length of the outline-to-solid crossfade and label fade, in ms. Default 150. Pass 0 for
   * the app's instant swap.
   */
  duration?: number;
  /**
   * Label font, such as a condensed sans close to Strava's (Boathouse). Default: the system
   * font at weight 500, tracked in a little.
   */
  fontFamily?: string;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

/** Tab content height above the bottom safe area (a standard UITabBar). */
const BAR = 49;
const ICON = 24;
/** From the bar's top edge (under the hairline) to the icon box. */
const ICON_TOP = 7;
/** From the icon box to the label's 13 pt line box: puts the 11 pt baseline at 45.5 pt. */
const LABEL_GAP = 3.5;
/** Tracking that brings the system font to the app's label widths (Record 33.5 pt). */
const LABEL_TRACKING = -0.4;

export function AccentDark({
  colors: custom,
  onActionPress,
  actionLabel = 'Record',
  actionIcon,
  duration = 150,
  fontFamily,
  haptics = true,
}: AccentDarkProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  const timing = useMemo<WithTimingConfig>(() => ({ ...tabcnTiming, duration }), [duration]);
  // With an action, it takes the middle slot: two tabs on each side of four.
  const half = onActionPress ? Math.ceil(tabs.length / 2) : tabs.length;
  // A passed font replaces the system font's weight 500: the font file carries its own.
  const font = fontFamily ? { fontFamily, fontWeight: 'normal' as const } : null;
  const tab = (item: TabItem) => (
    <Tab key={item.key} tab={item} colors={colors} timing={timing} font={font} haptics={haptics} />
  );

  return (
    // Docked: the root pads the bottom safe area, so the bar colour runs under the home indicator.
    <TabBarRoot placement="docked" style={{ backgroundColor: colors.background }}>
      <View style={[styles.hairline, { backgroundColor: colors.hairline }]} />
      <TabList style={styles.bar}>
        {tabs.slice(0, half).map(tab)}
        {onActionPress ? (
          <Action
            label={actionLabel}
            icon={actionIcon}
            onPress={onActionPress}
            colors={colors}
            font={font}
            haptics={haptics}
          />
        ) : null}
        {tabs.slice(half).map(tab)}
      </TabList>
    </TabBarRoot>
  );
}

type LabelFont = { fontFamily: string; fontWeight: 'normal' } | null;

function Tab({
  tab,
  colors,
  timing,
  font,
  haptics,
}: {
  tab: TabItem;
  colors: AccentDarkColors;
  timing: WithTimingConfig;
  font: LabelFont;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab, timing);
  // The solid glyph fades in over the outline, which stays opaque until late in the change,
  // so the icon never looks dimmed half-way.
  const outline = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.6, 1], [1, 0], 'clamp'),
  }));
  const solid = useAnimatedStyle(() => ({ opacity: progress.value }));
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.foreground, colors.accent]),
  }));

  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.icon}>
        <Animated.View style={[StyleSheet.absoluteFill, outline]}>
          {tab.renderIcon?.({ focused: false, color: colors.foreground, size: ICON })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, solid]}>
          {tab.renderIcon?.({ focused: true, color: colors.accent, size: ICON })}
        </Animated.View>
        <Badge badge={tab.badge} colors={colors} />
      </View>
      <Animated.Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={[styles.label, font, label]}
      >
        {tab.label}
      </Animated.Text>
    </TabButton>
  );
}

/**
 * Record as an action: the same icon-over-label slot as a tab, always white, since the
 * recorder it opens covers the bar. No dim or scale on press, as on the tabs.
 */
function Action({
  label,
  icon,
  onPress,
  colors,
  font,
  haptics,
}: {
  label: string;
  icon: AccentDarkProps['actionIcon'];
  onPress: () => void;
  colors: AccentDarkColors;
  font: LabelFont;
  haptics: boolean;
}) {
  const anchor = usePanelAnchor('action');
  return (
    <PressableScale
      {...anchor}
      scale={1}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={haptics ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : undefined}
      style={styles.tab}
    >
      <View style={styles.icon}>
        {typeof icon === 'function' ? icon({ color: colors.foreground, size: ICON }) : icon}
      </View>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        importantForAccessibility="no"
        accessibilityElementsHidden
        style={[styles.label, font, { color: colors.foreground }]}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * Not in the screenshots, which show no badges, so iOS's own tab badge: an 18 pt red capsule
 * with the count on the icon's top right, or a 10 pt dot for an empty badge. It appears and
 * goes at once, as UIKit's does. The tab's accessibility label already reads the badge.
 */
function Badge({ badge, colors }: { badge: TabItem['badge']; colors: AccentDarkColors }) {
  if (badge == null) return null;
  const text = String(badge).trim();
  if (text === '') {
    return <View pointerEvents="none" style={[styles.dot, { backgroundColor: colors.badge }]} />;
  }
  const textStyle = [styles.badgeText, { color: colors.badgeText }];
  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.capsule, { backgroundColor: colors.badge }]}
    >
      {typeof badge === 'number' ? (
        <BadgeCount value={badge} textStyle={textStyle} />
      ) : (
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={textStyle}>
          {text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // One physical pixel, as UIKit draws the bar's top line (1 px = 0.5 pt on the measured 2x shots).
  hairline: {
    height: StyleSheet.hairlineWidth,
  },
  // Five equal slots across the full width, no side padding (75 pt each on a 375 pt screen).
  bar: {
    height: BAR,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: ICON_TOP,
    gap: LABEL_GAP,
  },
  icon: {
    width: ICON,
    height: ICON,
  },
  // 11 pt medium, the same weight in both states; the line box puts the caps at 37.5-45.5 pt.
  label: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '500',
    letterSpacing: LABEL_TRACKING,
    includeFontPadding: false,
  },
  // UIKit's badge: its left edge 5 pt right of the icon's centre, rising 3 pt above the icon.
  capsule: {
    position: 'absolute',
    top: -3,
    left: ICON / 2 + 5,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: -1,
    left: ICON / 2 + 6,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  badgeText: {
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
  },
});
