/**
 * Glass Badges: Telegram's tab bar, in its iOS 26 Liquid Glass style. Two glass shapes float
 * on one row over the content: a pill of labelled tabs on the left and a round search button
 * on the right. A flat grey capsule sits behind the active tab, whose filled icon and label
 * turn blue while the others stay dark grey. Counts show as red badges at each icon's top
 * right, ringed in the colour behind them, so they look cut out of the glass.
 *
 * The search circle is a button, not a tab: it runs `onActionPress`. It is marked with
 * `usePanelAnchor('action')`, so a `TabPanel` can open from it.
 *
 * Motion: the capsule slides to the new tab on tabcnSpring (critically damped, no overshoot,
 * no stretch). Icons and labels crossfade grey to blue on tabcnTiming, and a badge's ring
 * crossfades between the glass and the capsule colour with them. Badges fade in and out, and
 * their digits roll when the count changes. The magnifier dims at once on touch and fades
 * back on release. Nothing scales, lifts or bounces. Reduce motion makes all of it instant.
 *
 * The glass is Apple's Liquid Glass on iOS 26 and later, a frosted blur on older iOS, and a
 * nearly solid light fill on Android (no blur there). Force one with `material`.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  interpolateColor,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  BadgeCount,
  PressableScale,
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  tabcnTiming,
  useFocusProgress,
  usePanelAnchor,
  useTabBar,
} from 'tabcn';

const defaultColors = {
  /** Fill over the frosted blur (older iOS). */
  background: 'rgba(249, 249, 249, 0.72)',
  /** The whole surface where there is no blur (Android): #f9f9f9 at 92%. */
  solid: 'rgba(249, 249, 249, 0.92)',
  /** Tint of the Liquid Glass (iOS 26+). The app's glass is untinted. */
  glassTint: undefined as string | undefined,
  /** The 1 px brighter line along the top edge of the blur and tint surfaces. */
  rim: 'rgba(255, 255, 255, 0.9)',
  shadow: 'rgba(0, 0, 0, 0.12)',
  /** The active capsule: black at 6.5%, which reads #e8e8e8 over the glass. */
  capsule: 'rgba(0, 0, 0, 0.065)',
  /** Inactive icons and labels, and the magnifier. */
  foreground: '#404040',
  /** Active icon and label: iOS 26 system blue. */
  active: '#0088ff',
  badge: '#ff3b30',
  badgeText: '#ffffff',
  /** The ring round a badge on an inactive tab: the glass colour. */
  badgeRing: '#f9f9f9',
  /** The ring round a badge on the active tab: the capsule colour over the glass. */
  badgeRingActive: '#e8e8e8',
};

export type GlassBadgesColors = typeof defaultColors;

/** `glass`: Liquid Glass (iOS 26+). `blur`: frosted blur. `tint`: light fill, no blur. */
export type GlassBadgesMaterial = 'auto' | 'glass' | 'blur' | 'tint';
type Surface = Exclude<GlassBadgesMaterial, 'auto'>;

export interface GlassBadgesProps {
  /** Runs when the round search button is pressed. */
  onActionPress: () => void;
  /** Screen-reader label for that button. Default "Search". */
  actionLabel?: string;
  /** Content of that button. Default: Telegram's magnifier, in `colors.foreground`. */
  actionIcon?: ReactNode;
  colors?: Partial<GlassBadgesColors>;
  /** Default `auto`: glass where available, blur on older iOS, tint on Android. */
  material?: GlassBadgesMaterial;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

/**
 * Measured on Telegram's App Store screenshot (an iPhone 17 Pro screen, 402 pt wide, at
 * 1.816 px per pt). Pill and circle are both 62 pt tall, 8 pt apart, 23.5 pt from the screen
 * sides, and 23.7 pt above its bottom edge. The tabs share the pill equally, 8 pt in from each
 * end (67.3 pt slots on that screen). The capsule is 54 pt tall, 4 pt inside the pill, and
 * 3.5 pt wider than its slot on each side (74.3 pt). Icon centres are 24.5 pt below the pill
 * top. Labels are 10 pt medium with the baseline at 49 pt. Each badge is an 18 pt red circle
 * with a 1 pt ring, centred 10.4 pt right of and 7.3 pt above its icon's centre.
 */
const BAR = 62;
const SIDE = 23.5;
const BOTTOM = 23.7;
/** On iPhones with a home indicator the bar sits this far inside the 34 pt bottom inset. */
const INSIDE_HOME_INDICATOR = 10.3;
const GAP = 8;
const PILL_PADDING = 8;
const INSET = 4;
const CAPSULE_OVERHANG = 3.5;
/** The icons' 40-unit box, in points (0.75 pt per unit). */
const ICON = 30;
const ICON_CENTER = 24.5;
/** Top of the label's 12 pt line box, which puts its baseline at 49 pt. */
const LABEL_TOP = 39.4;
const BADGE = 18;
const BADGE_RING = 1;
const BADGE_DX = 10.4;
const BADGE_DY = -7.3;
/** Magnifier opacity while the search button is held. */
const PRESSED_OPACITY = 0.55;
/** Badges fade on tabcnTiming's ease-out curve. */
const BADGE_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

function resolveMaterial(material: GlassBadgesMaterial): Surface {
  if (material !== 'auto') return material;
  if (isLiquidGlassAvailable()) return 'glass';
  return Platform.OS === 'ios' ? 'blur' : 'tint';
}

export function GlassBadges({
  onActionPress,
  actionLabel = 'Search',
  actionIcon,
  colors: custom,
  material = 'auto',
  haptics = true,
}: GlassBadgesProps) {
  const colors = { ...defaultColors, ...custom };
  const surface = resolveMaterial(material);
  const { tabs, insets } = useTabBar();
  const anchor = usePanelAnchor('action');
  const shadow = { boxShadow: `0 3px 14px ${colors.shadow}` };
  // The magnifier dims at once on touch (as a UIButton highlight does) and fades back on release.
  const glyphOpacity = useSharedValue(1);
  const glyph = useAnimatedStyle(() => ({ opacity: glyphOpacity.value }));

  // Telegram's bar sits 23.7 pt above the screen edge, inside the home indicator's inset.
  // Elsewhere (no inset, Android navigation bars) it keeps clear of the system area.
  const bottom = Math.max(
    BOTTOM,
    Platform.OS === 'ios' ? insets.bottom - INSIDE_HOME_INDICATOR : insets.bottom + 8,
  );

  return (
    // The offset is from the safe area, so subtract the inset to measure from the screen edge.
    <TabBarRoot placement="floating" offset={bottom - insets.bottom} style={styles.row}>
      <View style={[styles.pill, shadow]}>
        <Glass surface={surface} colors={colors} />
        <TabList style={styles.list}>
          <TabIndicator
            inset={{ x: -CAPSULE_OVERHANG, y: INSET }}
            style={[styles.capsule, { backgroundColor: colors.capsule }]}
          />
          {tabs.map((tab) => (
            <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
          ))}
        </TabList>
      </View>
      <PressableScale
        {...anchor}
        scale={1}
        accessibilityLabel={actionLabel}
        onPress={onActionPress}
        onPressIn={() => {
          glyphOpacity.value = PRESSED_OPACITY;
          if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onPressOut={() => {
          glyphOpacity.value = withTiming(1, tabcnTiming);
        }}
        style={[styles.action, shadow]}
      >
        <Glass surface={surface} colors={colors} />
        <Animated.View style={[styles.glyph, glyph]}>
          {actionIcon ?? <Magnifier color={colors.foreground} />}
        </Animated.View>
      </PressableScale>
    </TabBarRoot>
  );
}

/** The surface behind the pill and the search circle: fills its parent, clipped round. */
function Glass({ surface, colors }: { surface: Surface; colors: GlassBadgesColors }) {
  if (surface === 'glass') {
    return (
      <GlassView
        pointerEvents="none"
        glassEffectStyle="regular"
        colorScheme="light"
        tintColor={colors.glassTint}
        style={[StyleSheet.absoluteFill, styles.round]}
      />
    );
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, styles.round, styles.clip]}>
        {surface === 'blur' ? (
          <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
        ) : null}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: surface === 'blur' ? colors.background : colors.solid },
          ]}
        />
      </View>
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.round,
          { boxShadow: `inset 0 1px 0 ${colors.rim}` },
        ]}
      />
    </View>
  );
}

/** Telegram's search glyph: a semibold magnifier, the same as `SearchIcon` in the icons file. */
function Magnifier({ color }: { color: string }) {
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 40 40">
      <Circle cx={17.8} cy={17.5} r={10.3} fill="none" stroke={color} strokeWidth={2.9} />
      <Path d="M25.08 24.78L32.55 32.25" stroke={color} strokeWidth={3.3} strokeLinecap="round" />
    </Svg>
  );
}

function Tab({
  tab,
  colors,
  haptics,
}: {
  tab: TabItem;
  colors: GlassBadgesColors;
  haptics: boolean;
}) {
  // Grey to blue crossfade; nothing moves or changes size.
  const progress = useFocusProgress(tab);
  const activeIcon = useAnimatedStyle(() => ({ opacity: progress.value }));
  // The grey copy stays opaque under the blue one until the last stretch (no dip in ink),
  // then drops out so the active glyph rests alone with no grey fringe round it.
  const inactiveIcon = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [1, 0], 'clamp'),
  }));
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.foreground, colors.active]),
  }));

  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.icon}>
        <Animated.View style={[StyleSheet.absoluteFill, inactiveIcon]}>
          {tab.renderIcon?.({ focused: false, color: colors.foreground, size: ICON })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, activeIcon]}>
          {tab.renderIcon?.({ focused: true, color: colors.active, size: ICON })}
        </Animated.View>
        <Badge tab={tab} colors={colors} progress={progress} />
      </View>
      <View pointerEvents="none" style={styles.labelBox}>
        <Animated.Text numberOfLines={1} style={[styles.label, label]}>
          {tab.label}
        </Animated.Text>
      </View>
    </TabButton>
  );
}

/**
 * The red count badge at the icon's top right. Its ring takes the colour behind it, the glass
 * or the capsule, so it looks cut out of the icon. A longer count grows it to the right.
 * It is read with the tab's label (TabButton's default), not on its own.
 */
function Badge({
  tab,
  colors,
  progress,
}: {
  tab: TabItem;
  colors: GlassBadgesColors;
  progress: SharedValue<number>;
}) {
  const ring = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.badgeRing, colors.badgeRingActive],
    ),
  }));
  if (tab.badge == null) return null;
  const text = { color: colors.badgeText };
  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      entering={FadeIn.duration(160).easing(BADGE_EASING).reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(120).easing(BADGE_EASING).reduceMotion(ReduceMotion.System)}
      style={[styles.badge, { backgroundColor: colors.badge }, ring]}
    >
      {typeof tab.badge === 'number' ? (
        <BadgeCount value={tab.badge} textStyle={[styles.badgeText, text]} />
      ) : (
        <Text style={[styles.badgeText, text]}>{tab.badge}</Text>
      )}
    </Animated.View>
  );
}

const BADGE_OUTER = BADGE + BADGE_RING * 2;

const styles = StyleSheet.create({
  row: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    marginHorizontal: SIDE,
    gap: GAP,
  },
  pill: {
    flex: 1,
    height: BAR,
    borderRadius: BAR / 2,
  },
  list: {
    flex: 1,
    paddingHorizontal: PILL_PADDING,
  },
  round: {
    borderRadius: BAR / 2,
  },
  clip: {
    overflow: 'hidden',
  },
  capsule: {
    borderRadius: (BAR - INSET * 2) / 2,
  },
  tab: {
    flex: 1,
    height: BAR,
    alignItems: 'center',
  },
  icon: {
    width: ICON,
    height: ICON,
    marginTop: ICON_CENTER - ICON / 2,
  },
  labelBox: {
    position: 'absolute',
    top: LABEL_TOP,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '500',
    includeFontPadding: false,
  },
  badge: {
    position: 'absolute',
    left: ICON / 2 + BADGE_DX - BADGE_OUTER / 2,
    top: ICON / 2 + BADGE_DY - BADGE_OUTER / 2,
    minWidth: BADGE_OUTER,
    height: BADGE_OUTER,
    borderRadius: BADGE_OUTER / 2,
    borderWidth: BADGE_RING,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
  },
  glyph: {
    width: ICON,
    height: ICON,
  },
  action: {
    width: BAR,
    height: BAR,
    borderRadius: BAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
