/**
 * Material Pill: Android's Material 3 navigation bar, as in Google Home. A flat bar docked
 * flush to the bottom edge, with no border or shadow: its top edge is just a change of
 * colour from the screen. Each tab has its icon over a label that is always shown. The
 * active tab gets a 56 x 32 pill behind its icon (never its label) that grows sideways out of
 * the icon's centre as the tab is selected while the old tab's pill shrinks back into its
 * own; the icon crossfades from outline to filled and icon and label change colour. Nothing
 * slides, scales or moves vertically. A press shows a faint state layer in the pill's shape.
 *
 * The bar is opaque, as on Android: no glass or blur. `materialPillDarkColors` is the dark
 * scheme measured on Google Clock.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 *
 * Measured on the app's Play Store screenshots (412 dp screen, 1.76 px/dp): the bar is 64 pt
 * tall above the bottom safe area, with equal-width slots. The pill is 56 x 32, fully round,
 * 6 pt below the bar top and centred on the slot; the 24 pt icon box sits in its middle
 * (icon centre 22 pt down). The label's 16 pt line box starts 4 pt under the pill (42-58 pt),
 * leaving 6 pt to the bar's bottom. Labels: Google Sans Text Medium 12/16 with 0.5 tracking,
 * same weight in both states.
 */
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  BadgeCount,
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  tabcnTiming,
  useFocusProgress,
  useTabBar,
} from 'tabcn';

/** Google Home's light scheme (Material 3 baseline). */
const defaultColors = {
  /** The bar (surfaceContainer). */
  background: '#f0f4f9',
  /** The active pill (secondaryContainer). */
  indicator: '#c2e7ff',
  /** Active icon (onSecondaryContainer). */
  activeIcon: '#004a77',
  /** Active label. Google's own marketing frames sometimes use the primary `#00639b`. */
  activeLabel: '#004a77',
  /** Inactive icons and labels (onSurfaceVariant). */
  inactive: '#444746',
  /** The press state layer inside the pill: the active content colour at 10%. */
  pressed: 'rgba(0, 74, 119, 0.1)',
  /** Badge fill and text (error, onError). */
  badge: '#b3261e',
  badgeText: '#ffffff',
};

export type MaterialPillColors = typeof defaultColors;

/**
 * Google Clock's dark scheme (a dynamic navy palette): the bar is the colour of the screen
 * behind it, so it has no visible edge. Pass it as `colors`.
 */
export const materialPillDarkColors: MaterialPillColors = {
  background: '#040a2f',
  indicator: '#293ba1',
  activeIcon: '#c5ccff',
  activeLabel: '#c5ccff',
  inactive: '#868fd0',
  pressed: 'rgba(197, 204, 255, 0.1)',
  badge: '#ffb4ab',
  badgeText: '#690005',
};

export interface MaterialPillProps {
  colors?: Partial<MaterialPillColors>;
  /**
   * Label font. The app uses Google Sans Text Medium, which isn't freely licensed; Roboto
   * Medium (Android's default) is the usual stand-in. Default: the system font at weight 500.
   */
  fontFamily?: string;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

/** Bar content height above the bottom safe area. */
const BAR = 64;
const PILL_WIDTH = 56;
const PILL_HEIGHT = 32;
/** From the bar's top to the pill's top. */
const PILL_TOP = 6;
const ICON = 24;
/** From the pill's bottom to the label's line box. */
const LABEL_GAP = 4;

export function MaterialPill({ colors: custom, fontFamily, haptics = true }: MaterialPillProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();

  return (
    <TabBarRoot placement="docked" style={{ backgroundColor: colors.background }}>
      <TabList style={styles.bar}>
        {tabs.map((tab) => (
          <Tab key={tab.key} tab={tab} colors={colors} fontFamily={fontFamily} haptics={haptics} />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

function Tab({
  tab,
  colors,
  fontFamily,
  haptics,
}: {
  tab: TabItem;
  colors: MaterialPillColors;
  fontFamily: string | undefined;
  haptics: boolean;
}) {
  // One ease-out progress drives everything, so the pill, the icon and the colours move in
  // lockstep (200 ms, no overshoot; instant with reduce motion on).
  const progress = useFocusProgress(tab);
  // The pill grows from the icon's centre: its width runs 0 to 56 with the left edge kept
  // centred, so the round ends stay round (no scaleX) and it never passes its resting size.
  const pill = useAnimatedStyle(() => ({
    left: (PILL_WIDTH * (1 - progress.value)) / 2,
    width: PILL_WIDTH * progress.value,
    opacity: progress.value,
  }));
  const outline = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const filled = useAnimatedStyle(() => ({ opacity: progress.value }));
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.inactive, colors.activeLabel]),
  }));

  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      {({ pressed }) => (
        <>
          <View style={styles.pillBox}>
            <Animated.View style={[styles.pill, { backgroundColor: colors.indicator }, pill]} />
            <StateLayer pressed={pressed} color={colors.pressed} />
            <View style={styles.icon}>
              <Animated.View style={[StyleSheet.absoluteFill, outline]}>
                {tab.renderIcon?.({ focused: false, color: colors.inactive, size: ICON })}
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, filled]}>
                {tab.renderIcon?.({ focused: true, color: colors.activeIcon, size: ICON })}
              </Animated.View>
              <Badge badge={tab.badge} colors={colors} />
            </View>
          </View>
          <Animated.Text
            numberOfLines={1}
            style={[styles.label, fontFamily ? { fontFamily } : styles.medium, label]}
          >
            {tab.label}
          </Animated.Text>
        </>
      )}
    </TabButton>
  );
}

/** Material's pressed state: a flat tint in the pill's shape that fades in and out. */
function StateLayer({ pressed, color }: { pressed: boolean; color: string }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(pressed ? 1 : 0, tabcnTiming);
  }, [pressed, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.round, { backgroundColor: color }, style]}
    />
  );
}

/**
 * Material 3 badges on the icon's top end: a 6 pt dot for an empty badge, a 16 pt capsule
 * with the count otherwise. The tab's accessibility label already reads the badge.
 */
function Badge({ badge, colors }: { badge: TabItem['badge']; colors: MaterialPillColors }) {
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
      style={[styles.large, { backgroundColor: colors.badge }]}
    >
      {typeof badge === 'number' ? (
        <BadgeCount value={badge} max={999} textStyle={textStyle} />
      ) : (
        <Text numberOfLines={1} style={textStyle}>
          {text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: BAR,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: PILL_TOP,
    gap: LABEL_GAP,
  },
  pillBox: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: PILL_HEIGHT / 2,
  },
  round: {
    borderRadius: PILL_HEIGHT / 2,
  },
  icon: {
    width: ICON,
    height: ICON,
  },
  // Material's labelMedium: 12/16, 0.5 tracking, weight 500 in both states.
  label: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  medium: {
    fontWeight: '500',
  },
  dot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // Starts 12 pt into the icon box and rises 4 pt above it, as Compose's BadgedBox does.
  large: {
    position: 'absolute',
    top: -4,
    left: 12,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
});
