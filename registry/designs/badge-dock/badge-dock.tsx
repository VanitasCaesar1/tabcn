/**
 * Badge Dock: Reddit's classic tab bar. A dark bar docked full width at the bottom edge, the
 * same near-black as the feed above it, under a hairline barely darker than both. Five equal
 * tabs, each an icon over a label that is always shown. Inactive tabs are a cool grey outline
 * icon over a medium label; the active tab's icon turns solid white and its label white and
 * semibold. There is no pill, underline or dot, and nothing grows or moves.
 *
 * The point of it is the badges, drawn over the icon's top right and never taking space: a
 * coral-red 18 pt circle holding a white count (a capsule for wider counts such as "99+"),
 * or, for an empty badge (`tabBarBadge: ''`), a small orange-red dot.
 *
 * Create: in the app, Create opens a full-screen composer instead of a screen with the bar.
 * Pass `onActionPress` (and `actionIcon`) to get that: the middle slot becomes an action that
 * looks like the other tabs but never turns white, and your navigator keeps four tabs. It is
 * marked with `usePanelAnchor('action')`, so a `TabPanel` can open from it. Without
 * `onActionPress`, every route is a plain tab, Create included.
 *
 * Motion (inferred: the only preview video shows Reddit's newer bar): on a tab change the
 * outline icon and the solid one crossfade, and the grey medium label crossfades to the white
 * semibold one, on tabcnTiming shortened to 180 ms. Badges fade in and out over 150 ms; a
 * count that changes rolls its digits in place. No scale, bounce or lift, and presses show no
 * dim. Reduce motion makes all of it instant. The bar is opaque: no glass, blur or shadow.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 *
 * Measured on the app's App Store screenshot (an iPhone screen 1019 px wide taken as 393 pt,
 * 2.593 px per pt): the bar is 49 pt tall above the bottom safe area, with a 1 px hairline on
 * top. Five equal slots (78.6 pt) with no side padding. Glyphs are 22-24 pt, their box centred
 * 19 pt below the bar's top edge. Label caps run 38.4-45.7 pt (10 pt type, 7.3 pt caps).
 * Count badges are 18 pt, centred 16.8 pt right of and 6.9 pt above the icon's centre, with a
 * 13 pt semibold number (9.4 pt digits). Bar #171717, hairline #121212, inactive grey
 * #b7bbbe, badge #fe4d3e. The dot (8 pt, Reddit orange-red) is from the iPad screenshot: its
 * top 1 pt below a count badge's and its left edge 3.4 pt further right.
 */
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { StyleSheet, Text, type TextStyle, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  ReduceMotion,
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
  /** The bar, which also fills the home-indicator area. The same as Reddit's dark feed. */
  background: '#171717',
  /** The 1 px line along the bar's top edge. */
  hairline: '#121212',
  /** Active icon and label. */
  active: '#ffffff',
  /** Inactive icons and labels, and the Create action. */
  inactive: '#b7bbbe',
  /** Count badge fill and number. */
  badge: '#fe4d3e',
  badgeText: '#ffffff',
  /** The dot shown for an empty badge: Reddit orange-red. */
  dot: '#ff4500',
};

export type BadgeDockColors = typeof defaultColors;

/**
 * A light scheme in Reddit's light-mode palette. The screenshots show only the dark bar, so
 * these colours are not measured. Pass it as `colors`.
 */
export const badgeDockLightColors: BadgeDockColors = {
  background: '#ffffff',
  hairline: '#e5ebee',
  active: '#0f1a1c',
  inactive: '#5c6c74',
  badge: '#fe4d3e',
  badgeText: '#ffffff',
  dot: '#ff4500',
};

export interface BadgeDockProps {
  colors?: Partial<BadgeDockColors>;
  /**
   * Runs when the middle slot (Create) is pressed. With it, the middle slot is an action
   * drawn like a tab, between the first and second halves of your tabs: give the navigator
   * four tabs. Without it, all routes are tabs.
   */
  onActionPress?: () => void;
  /** Label under the action's icon, also read by screen readers. Default "Create". */
  actionLabel?: string;
  /**
   * The action's icon, 26 pt, in the `inactive` colour, such as
   * `<CreateIcon focused={false} color="#b7bbbe" size={26} />` from this design's icons. Pass
   * a function to get that colour and size from the design, so the icon follows `colors`:
   * `({ color, size }) => <CreateIcon focused={false} color={color} size={size} />`.
   */
  actionIcon?: ReactNode | ((props: { color: string; size: number }) => ReactNode);
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
  /**
   * Font of the inactive labels and the action's label, such as Reddit Sans Medium. It is
   * used as given, at its own weight. Default: the system font at weight 500.
   */
  fontFamily?: string;
  /**
   * Font of the active label, which crossfades in over the inactive one, such as Reddit Sans
   * Bold. It is used as given, at its own weight. Default: `fontFamily` at weight 600, or the
   * system font at weight 600 without one.
   */
  activeFontFamily?: string;
}

/** Tab content height above the bottom safe area (a standard UITabBar). */
const BAR = 49;
/** The icons' box: 26 pt, so the 22-24 pt glyphs sit in it as measured. */
const ICON = 26;
/** From the bar's top edge to the icon box: puts the glyphs' centre 19 pt down. */
const ICON_TOP = 6;
/** From the icon box to the label's 12 pt line box: puts the 10 pt baseline at 45.7 pt. */
const LABEL_GAP = 4.2;
/** Count badge: an 18 pt circle, a capsule for wider counts. */
const BADGE = 18;
/** The count badge's left edge and top, from the icon box's top left. */
const BADGE_LEFT = ICON / 2 + 16.8 - BADGE / 2;
const BADGE_TOP = ICON / 2 - 6.9 - BADGE / 2;
/** The empty-badge dot. */
const DOT = 8;
const DOT_LEFT = BADGE_LEFT + 3.4;
const DOT_TOP = BADGE_TOP + 1;

/** Icon and label crossfade: tabcnTiming at 180 ms. */
const timing: WithTimingConfig = { ...tabcnTiming, duration: 180 };
/** Badges fade in and out over 150 ms on tabcnTiming's curve. */
const BADGE_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);
const badgeIn = FadeIn.duration(150).easing(BADGE_EASING).reduceMotion(ReduceMotion.System);
const badgeOut = FadeOut.duration(150).easing(BADGE_EASING).reduceMotion(ReduceMotion.System);

export function BadgeDock({
  colors: custom,
  onActionPress,
  actionLabel = 'Create',
  actionIcon,
  haptics = true,
  fontFamily,
  activeFontFamily,
}: BadgeDockProps) {
  const colors = { ...defaultColors, ...custom };
  const fonts: Fonts = {
    // A named family is used at its own weight; without one, the system font's weights apply.
    regular: fontFamily ? { fontFamily, fontWeight: 'normal' } : undefined,
    bold: activeFontFamily
      ? { fontFamily: activeFontFamily, fontWeight: 'normal' }
      : fontFamily
        ? { fontFamily }
        : undefined,
  };
  const { tabs } = useTabBar();
  // With an action, it takes the middle slot: two tabs on each side of four.
  const half = onActionPress ? Math.ceil(tabs.length / 2) : tabs.length;
  const tab = (item: TabItem) => (
    <Tab key={item.key} tab={item} colors={colors} fonts={fonts} haptics={haptics} />
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
            fonts={fonts}
            haptics={haptics}
          />
        ) : null}
        {tabs.slice(half).map(tab)}
      </TabList>
    </TabBarRoot>
  );
}

/** Label fonts: the regular (inactive) and bold (active) weights, unset for the system font. */
interface Fonts {
  regular: TextStyle | undefined;
  bold: TextStyle | undefined;
}

function Tab({
  tab,
  colors,
  fonts,
  haptics,
}: {
  tab: TabItem;
  colors: BadgeDockColors;
  fonts: Fonts;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab, timing);
  // The solid copy fades in over the outline, which stays opaque until late in the change,
  // so the icon and label never look dimmed half-way.
  const outgoing = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.6, 1], [1, 0], 'clamp'),
  }));
  const incoming = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.icon}>
        <Animated.View style={[StyleSheet.absoluteFill, outgoing]}>
          {tab.renderIcon?.({ focused: false, color: colors.inactive, size: ICON })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, incoming]}>
          {tab.renderIcon?.({ focused: true, color: colors.active, size: ICON })}
        </Animated.View>
        <Badge badge={tab.badge} colors={colors} />
      </View>
      {/* The white semibold label sets the width; the grey medium one is centred under it. */}
      <View>
        <Animated.Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={[styles.label, styles.under, fonts.regular, { color: colors.inactive }, outgoing]}
        >
          {tab.label}
        </Animated.Text>
        <Animated.Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={[styles.label, styles.activeLabel, fonts.bold, { color: colors.active }, incoming]}
        >
          {tab.label}
        </Animated.Text>
      </View>
    </TabButton>
  );
}

/**
 * Create as an action: the same icon-over-label slot as a tab, always grey, since the
 * composer it opens covers the bar. No dim or scale on press, as on the tabs.
 */
function Action({
  label,
  icon,
  onPress,
  colors,
  fonts,
  haptics,
}: {
  label: string;
  icon: BadgeDockProps['actionIcon'];
  onPress: () => void;
  colors: BadgeDockColors;
  fonts: Fonts;
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
        {typeof icon === 'function' ? icon({ color: colors.inactive, size: ICON }) : icon}
      </View>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        importantForAccessibility="no"
        accessibilityElementsHidden
        style={[styles.label, fonts.regular, { color: colors.inactive }]}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * Reddit's badges over the icon's top right: an 18 pt coral-red circle with the count, which
 * grows into a capsule for wider text, or an 8 pt orange-red dot for an empty badge. They
 * fade in and out; a changing count rolls its digits. The tab's accessibility label already
 * reads the badge.
 */
function Badge({ badge, colors }: { badge: TabItem['badge']; colors: BadgeDockColors }) {
  if (badge == null) return null;
  const text = String(badge).trim();
  if (text === '') {
    return (
      <Animated.View
        entering={badgeIn}
        exiting={badgeOut}
        pointerEvents="none"
        style={[styles.dot, { backgroundColor: colors.dot }]}
      />
    );
  }
  const textStyle = [styles.badgeText, { color: colors.badgeText }];
  return (
    <Animated.View
      entering={badgeIn}
      exiting={badgeOut}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      // A zero-size box at the badge's centre: a wider count ("99+") grows both ways from
      // there, instead of only rightwards, where on the last tab it reached the screen's edge.
      style={styles.countAnchor}
    >
      <View style={[styles.count, { backgroundColor: colors.badge }]}>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // A text badge stays on one line and stops growing at this width, ending in an ellipsis.
  badgeTextCap: { maxWidth: 56 },
  // One physical pixel, as UIKit draws the bar's top line.
  hairline: {
    height: StyleSheet.hairlineWidth,
  },
  // Five equal slots across the full width, no side padding (78.6 pt each on a 393 pt screen).
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
  // 10 pt in a 12 pt line box: caps at 38.4-45.7 pt. Reddit Sans in the app; system font here.
  label: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '500',
    textAlign: 'center',
    includeFontPadding: false,
  },
  activeLabel: {
    fontWeight: '600',
  },
  under: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  countAnchor: {
    position: 'absolute',
    top: BADGE_TOP + BADGE / 2,
    left: BADGE_LEFT + BADGE / 2,
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  count: {
    minWidth: BADGE,
    minHeight: BADGE,
    paddingHorizontal: 5,
    borderRadius: BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: DOT_TOP,
    left: DOT_LEFT,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  // No fixed line height: it scaled with large text while the badge didn't, which cut the digits.
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    includeFontPadding: false,
  },
});
