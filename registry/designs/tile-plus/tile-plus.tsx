/**
 * Tile Plus: the Threads tab bar. A plain white bar docked flush to the bottom edge, the same
 * white as the feed, with no hairline, border or shadow: content above simply stops at its
 * top edge. Five equal slots hold icons with no labels. The middle slot is not a tab: it is
 * a plus on a light grey rounded tile that runs an action (Threads opens its compose sheet),
 * so it never takes the selected look. The active tab shows only by its icon turning from a
 * grey outline into a black filled glyph; there is no pill, underline or dot.
 *
 * Motion (the app's own motion could not be measured, so this is the quiet version that
 * fits it): on a tab change the old icon crossfades back to its grey outline while the new
 * one fades to black and filled, together, on tabcnTiming. Nothing scales, lifts or slides.
 * While the tile is held its fill fades a shade darker, and fades back on release; it never
 * shrinks. Reduce motion makes all of it instant. The tile is marked with
 * `usePanelAnchor('action')`, so a `TabPanel` can open from it.
 *
 * The bar is opaque, as in the app: no glass or blur. `tilePlusDarkColors` is a dark scheme
 * guessed from the Threads dark theme; it is not measured.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 *
 * Measured on the app's App Store screenshots (393 pt wide screen, 2.4 px per pt). Five
 * equal 70.8 pt slots fill the width less 19.5 pt at each side; icon centres sit 29 pt below
 * the bar's top edge. The tile is 54 x 44 pt with 12 pt corners, its top 7 pt below the bar
 * top, centred on the plus. The plus is 20.4 pt across with 2.6 pt round-capped strokes.
 * Icons are about 22.5 pt with 2.5 pt strokes. Every screenshot cuts the bar off at the
 * image edge, so its height is inferred: 51 pt above the home-indicator area, which ends
 * the bar at the tile's bottom edge and fits the curve of the screen's corner in the shots.
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
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
  /** The bar: the same white as the feed above it. */
  background: '#ffffff',
  /** Active (filled) icon. */
  foreground: '#000000',
  /** Inactive outline icons. */
  inactive: '#a8a8a8',
  /** The tile behind the plus. */
  tile: '#f5f5f5',
  /** The tile while held. Not measured: a shade darker than `tile`. */
  tilePressed: '#ebebeb',
  /** The plus glyph, a touch darker than the inactive icons. */
  action: '#a2a2a2',
  /** Not in the screenshots: badges follow the app's usual red. */
  badge: '#ff3040',
  badgeText: '#ffffff',
};

export type TilePlusColors = typeof defaultColors;

/**
 * A dark scheme. None of the screenshots show dark mode: these follow the Threads dark
 * theme by eye and are not measured. Pass it as `colors`.
 */
export const tilePlusDarkColors: TilePlusColors = {
  background: '#101010',
  foreground: '#f3f5f7',
  inactive: '#4d4d4d',
  tile: '#1e1e1e',
  tilePressed: '#2a2a2a',
  action: '#4d4d4d',
  badge: '#ff3040',
  badgeText: '#ffffff',
};

export interface TilePlusProps {
  /** Runs when the plus tile is pressed. */
  onActionPress: () => void;
  /** Screen-reader label for the plus tile. Default "Create". */
  actionLabel?: string;
  colors?: Partial<TilePlusColors>;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

/** Bar content height above the bottom safe area: it ends at the tile's bottom edge. */
const BAR = 51;
/** Space at each side of the five slots. */
const SIDE = 19.5;
const ICON = 24;
/** From the bar's top to the icon centres (and the tile's centre). */
const ICON_CENTER = 29;
const TILE_WIDTH = 54;
const TILE_HEIGHT = 44;
const TILE_TOP = ICON_CENTER - TILE_HEIGHT / 2;
const TILE_RADIUS = 12;
const PLUS = 20.4;
const PLUS_STROKE = 2.6;
/** The badge fades on tabcnTiming's ease-out curve. */
const BADGE_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

export function TilePlus({
  onActionPress,
  actionLabel = 'Create',
  colors: custom,
  haptics = true,
}: TilePlusProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs, insets } = useTabBar();
  // The tile sits in the middle slot: with four tabs, two on each side.
  const half = Math.ceil(tabs.length / 2);
  // Where there is no home-indicator area, the bar grows so the tile keeps the same 7 pt
  // of space below it as above it, instead of touching the screen's bottom edge.
  const extra = Math.max(0, TILE_TOP - insets.bottom);

  return (
    <TabBarRoot placement="docked" style={{ backgroundColor: colors.background }}>
      <TabList style={[styles.bar, { height: BAR + extra }]}>
        {tabs.slice(0, half).map((tab) => (
          <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
        ))}
        <Action label={actionLabel} onPress={onActionPress} colors={colors} haptics={haptics} />
        {tabs.slice(half).map((tab) => (
          <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

/** The plus on its tile. An action, not a tab: it never looks selected. */
function Action({
  label,
  onPress,
  colors,
  haptics,
}: {
  label: string;
  onPress: () => void;
  colors: TilePlusColors;
  haptics: boolean;
}) {
  const anchor = usePanelAnchor('action');
  const pressed = useSharedValue(0);
  const { tile, tilePressed } = colors;
  // While held, the fill fades a shade darker: a colour change, not a scale dip.
  const face = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pressed.value, [0, 1], [tile, tilePressed]),
  }));

  return (
    <View style={styles.slot}>
      <PressableScale
        {...anchor}
        scale={1}
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => {
          pressed.value = withTiming(1, tabcnTiming);
          if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onPressOut={() => {
          pressed.value = withTiming(0, tabcnTiming);
        }}
        style={styles.tilePress}
      >
        <Animated.View style={[styles.tile, face]}>
          <View style={[styles.plusBar, { backgroundColor: colors.action }]} />
          <View
            style={[styles.plusBar, styles.plusBarVertical, { backgroundColor: colors.action }]}
          />
        </Animated.View>
      </PressableScale>
    </View>
  );
}

function Tab({ tab, colors, haptics }: { tab: TabItem; colors: TilePlusColors; haptics: boolean }) {
  // Grey outline to black fill: one crossfade, nothing moves or changes size.
  const progress = useFocusProgress(tab);
  const activeIcon = useAnimatedStyle(() => ({ opacity: progress.value }));
  // Each filled glyph covers its outline exactly, so the outline stays opaque under it until
  // the last stretch (no dip in ink mid-way), then drops out so the fill rests alone.
  const inactiveIcon = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [1, 0], 'clamp'),
  }));

  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.icon}>
        <Animated.View style={[StyleSheet.absoluteFill, inactiveIcon]}>
          {tab.renderIcon?.({ focused: false, color: colors.inactive, size: ICON })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, activeIcon]}>
          {tab.renderIcon?.({ focused: true, color: colors.foreground, size: ICON })}
        </Animated.View>
        <Badge badge={tab.badge} colors={colors} />
      </View>
    </TabButton>
  );
}

/**
 * Not in the screenshots, which show no badges: an empty badge is a small dot at the icon's
 * top right, a count a small capsule there. The tab's accessibility label already reads it.
 */
function Badge({ badge, colors }: { badge: TabItem['badge']; colors: TilePlusColors }) {
  if (badge == null) return null;
  const text = String(badge).trim();
  const fade = {
    entering: FadeIn.duration(160).easing(BADGE_EASING),
    exiting: FadeOut.duration(120).easing(BADGE_EASING),
  };
  if (text === '') {
    return (
      <Animated.View
        {...fade}
        pointerEvents="none"
        style={[styles.dot, { backgroundColor: colors.badge }]}
      />
    );
  }
  const textStyle = [styles.badgeText, { color: colors.badgeText }];
  return (
    <Animated.View
      {...fade}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.count, { backgroundColor: colors.badge, borderColor: colors.background }]}
    >
      {typeof badge === 'number' ? (
        <BadgeCount value={badge} textStyle={textStyle} />
      ) : (
        <Text numberOfLines={1} style={textStyle}>
          {text}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: SIDE,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: ICON_CENTER - ICON / 2,
  },
  icon: {
    width: ICON,
    height: ICON,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    paddingTop: TILE_TOP,
  },
  tilePress: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
  },
  tile: {
    flex: 1,
    borderRadius: TILE_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBar: {
    position: 'absolute',
    width: PLUS,
    height: PLUS_STROKE,
    borderRadius: PLUS_STROKE / 2,
  },
  plusBarVertical: {
    width: PLUS_STROKE,
    height: PLUS,
  },
  dot: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  count: {
    position: 'absolute',
    top: -6,
    left: 14,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    includeFontPadding: false,
  },
});
