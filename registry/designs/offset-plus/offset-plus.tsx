/**
 * Offset Plus: the TikTok tab bar. A solid black band docked flush to the bottom edge, full
 * width with square corners, and no hairline, blur, gradient or shadow: the video above
 * simply stops at its top edge. Five equal slots: four tabs with an icon over a small
 * semibold label, and in the middle a create button with no label. That button is the
 * signature: a white rounded rectangle with a plus, laid over a cyan copy of itself shifted
 * left and a pink-red copy shifted right, so a thin strip of each colour shows at the sides.
 * It runs an action (TikTok opens the camera) and never looks selected.
 *
 * The active tab shows only by its icon turning from a grey outline to a white filled glyph
 * and its label from grey to white; there is no pill, underline or dot.
 *
 * Motion (the app's own could not be measured; it switches instantly): on a tab change the
 * outline and filled icons crossfade and the label colour fades, together, on tabcnTiming.
 * Nothing slides, scales or lifts. The plus never moves: its colour offsets are fixed, and a
 * press only dims it, at once, fading back on release. Reduce motion makes all of it
 * instant. The plus is marked with `usePanelAnchor('action')`, so a `TabPanel` can open
 * from it.
 *
 * TikTok turns the bar white on its Inbox and Profile screens. List those routes in
 * `lightRoutes` and the bar fades to `lightColors` (and back) on tabcnTiming while one of
 * them is active. The white look is from memory of the app, not measured; by default the
 * bar stays black, as in every screenshot.
 *
 * The bar is opaque, as in the app: no glass or blur.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 *
 * Measured on the app's App Store screenshot (v47.8, a 402 pt screen at 2.4 px per pt):
 * 49 pt of content over the home-indicator inset. Tabs sit in five equal 80.4 pt slots.
 * Icon glyphs are 20-22.5 pt tall and centred 19 pt below the bar's top; labels are about
 * 10 pt semibold, caps 37.5-44.3 pt down. The plus button is 46.3 x 30.1 pt, its top 10.3 pt
 * below the bar's top: three 38.7 x 30.1 pt rectangles with 8.75 pt corners, the cyan one
 * 3.8 pt left of the white one and the red one 3.8 pt right. The plus is 14 pt across with
 * 2.7 pt square-ended bars.
 */
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  interpolateColor,
  type SharedValue,
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
  /** The bar: measured #000000. */
  background: '#000000',
  /** Active icon and label. */
  foreground: '#ffffff',
  /** Inactive icons and labels: measured 187-191 grey, white at about 75% on black. */
  inactive: '#bebebe',
  /** The plus button's left (cyan) layer. Measured; TikTok's brand cyan is #25f4ee. */
  actionLeft: '#29d1ec',
  /** The plus button's right (red) layer. Measured; TikTok's brand red is #fe2c55. */
  actionRight: '#f12d6f',
  /** The plus button's top layer. */
  actionFace: '#ffffff',
  /** The plus glyph: TikTok's near-black ink. */
  actionGlyph: '#161823',
  /** Not in the screenshots: the app's red count bubble on Inbox. */
  badge: '#fe2c55',
  badgeText: '#ffffff',
};

export type OffsetPlusColors = typeof defaultColors;

/**
 * The white bar TikTok shows on its Inbox and Profile screens: dark ink icons and labels,
 * the plus unchanged. From memory of the app, not measured. Used for `lightRoutes`.
 */
export const offsetPlusLightColors: OffsetPlusColors = {
  background: '#ffffff',
  foreground: '#161823',
  inactive: '#8a8b91',
  actionLeft: '#29d1ec',
  actionRight: '#f12d6f',
  actionFace: '#ffffff',
  actionGlyph: '#161823',
  badge: '#fe2c55',
  badgeText: '#ffffff',
};

export interface OffsetPlusProps {
  /** Runs when the plus button is pressed. */
  onActionPress: () => void;
  /** Screen-reader label for the plus button. Default "Create". */
  actionLabel?: string;
  colors?: Partial<OffsetPlusColors>;
  /**
   * Route names (the `name` of each `Tabs.Screen`) on which the bar turns light, as TikTok's
   * does on Inbox and Profile. Default none: the bar stays black.
   */
  lightRoutes?: readonly string[];
  /** The colours used on `lightRoutes`. Default `offsetPlusLightColors`. */
  lightColors?: Partial<OffsetPlusColors>;
  /**
   * Label font. The app uses TikTok Sans semibold; load it and pass its name here.
   * Default: the system font at weight 600.
   */
  fontFamily?: string;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

/** Bar content height above the bottom safe area. */
const BAR = 49;
/** Icon box: the icons are drawn at 0.7 pt per unit of their 40-unit grid. */
const ICON = 28;
/** From the bar's top to the icon centres. */
const ICON_CENTER = 19;
/** From the bar's top to the top of the label's 12 pt line box (caps start 2.5 pt lower). */
const LABEL_TOP = 35;
/** Each of the plus button's three rectangles. */
const ACTION_WIDTH = 38.7;
const ACTION_HEIGHT = 30.1;
const ACTION_RADIUS = 8.75;
/** How far the cyan layer sits left of the white one, and the red layer right. */
const ACTION_OFFSET = 3.8;
const ACTION_TOP = 10.3;
const PLUS = 14;
const PLUS_STROKE = 2.7;
/** The plus button's opacity while held. Not measured: a plain highlight. */
const PRESSED_OPACITY = 0.7;
/** The badge fades on tabcnTiming's ease-out curve. */
const BADGE_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

const NO_ROUTES: readonly string[] = [];

interface Palettes {
  dark: OffsetPlusColors;
  light: OffsetPlusColors;
  /** 0 on the black bar, 1 on the light one, in between while it fades. */
  scheme: SharedValue<number>;
}

export function OffsetPlus({
  onActionPress,
  actionLabel = 'Create',
  colors: custom,
  lightRoutes = NO_ROUTES,
  lightColors,
  fontFamily,
  haptics = true,
}: OffsetPlusProps) {
  const dark = { ...defaultColors, ...custom };
  const light = { ...offsetPlusLightColors, ...lightColors };
  const { tabs, insets, activeIndex } = useTabBar();
  const hasLight = lightRoutes.length > 0;
  const routeName = tabs[activeIndex]?.routeName;
  const isLight = routeName != null && lightRoutes.includes(routeName);

  // The bar and everything on it fade between the two schemes together (colour only).
  const scheme = useSharedValue(isLight ? 1 : 0);
  useEffect(() => {
    scheme.value = withTiming(isLight ? 1 : 0, tabcnTiming);
  }, [isLight, scheme]);
  const fill = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(scheme.value, [0, 1], [dark.background, light.background]),
  }));
  const palettes: Palettes = { dark, light, scheme };

  // The plus sits in the middle slot: with four tabs, two on each side.
  const half = Math.ceil(tabs.length / 2);

  return (
    // The root holds the active scheme's colour, so it runs on under the home indicator and
    // stays put when a screen swaps the tabs out. The fill drawn over it crossfades from the
    // old colour to the new one.
    <TabBarRoot
      placement="docked"
      style={{
        backgroundColor: isLight ? light.background : dark.background,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fill]} />
      <TabList style={styles.bar}>
        {tabs.slice(0, half).map((tab) => (
          <Tab
            key={tab.key}
            tab={tab}
            palettes={palettes}
            hasLight={hasLight}
            fontFamily={fontFamily}
            haptics={haptics}
          />
        ))}
        <Action label={actionLabel} onPress={onActionPress} palettes={palettes} haptics={haptics} />
        {tabs.slice(half).map((tab) => (
          <Tab
            key={tab.key}
            tab={tab}
            palettes={palettes}
            hasLight={hasLight}
            fontFamily={fontFamily}
            haptics={haptics}
          />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

/**
 * The create button: cyan and red rectangles offset left and right under a white one with
 * the plus. An action, not a tab: it never looks selected, and it never moves.
 */
function Action({
  label,
  onPress,
  palettes: { dark, light, scheme },
  haptics,
}: {
  label: string;
  onPress: () => void;
  palettes: Palettes;
  haptics: boolean;
}) {
  const anchor = usePanelAnchor('action');
  const opacity = useSharedValue(1);
  const dim = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const left = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(scheme.value, [0, 1], [dark.actionLeft, light.actionLeft]),
  }));
  const right = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(scheme.value, [0, 1], [dark.actionRight, light.actionRight]),
  }));
  const face = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(scheme.value, [0, 1], [dark.actionFace, light.actionFace]),
  }));
  const glyph = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(scheme.value, [0, 1], [dark.actionGlyph, light.actionGlyph]),
  }));

  return (
    <View style={styles.slot}>
      <PressableScale
        {...anchor}
        scale={1}
        accessibilityLabel={label}
        hitSlop={{ top: ACTION_TOP, bottom: 8, left: 12, right: 12 }}
        onPress={onPress}
        onPressIn={() => {
          // Dims at once on touch (as a UIButton highlight does), fades back on release.
          opacity.value = PRESSED_OPACITY;
          if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onPressOut={() => {
          opacity.value = withTiming(1, tabcnTiming);
        }}
        style={styles.action}
      >
        {/* Dimmed as one flat image, so the colour layers never show through the white. */}
        <Animated.View needsOffscreenAlphaCompositing style={[styles.action, dim]}>
          <Animated.View style={[styles.layer, styles.layerLeft, left]} />
          <Animated.View style={[styles.layer, styles.layerRight, right]} />
          <Animated.View style={[styles.layer, styles.layerFace, face]}>
            <Animated.View style={[styles.plusBar, glyph]} />
            <Animated.View style={[styles.plusBar, styles.plusBarVertical, glyph]} />
          </Animated.View>
        </Animated.View>
      </PressableScale>
    </View>
  );
}

function Tab({
  tab,
  palettes: { dark, light, scheme },
  hasLight,
  fontFamily,
  haptics,
}: {
  tab: TabItem;
  palettes: Palettes;
  hasLight: boolean;
  fontFamily: string | undefined;
  haptics: boolean;
}) {
  // Grey outline to white fill: one crossfade, nothing moves or changes size.
  const progress = useFocusProgress(tab);
  const activeIcon = useAnimatedStyle(() => ({ opacity: progress.value }));
  // Each filled glyph covers its outline exactly, so the outline stays opaque under it until
  // the last stretch (no dip in ink mid-way), then drops out so the fill rests alone.
  const inactiveIcon = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [1, 0], 'clamp'),
  }));
  // The same for the two schemes: the light icons fade in over the dark ones.
  const darkLayer = useAnimatedStyle(() => ({
    opacity: interpolate(scheme.value, [0.8, 1], [1, 0], 'clamp'),
  }));
  const lightLayer = useAnimatedStyle(() => ({ opacity: scheme.value }));
  const label = useAnimatedStyle(() => {
    const off = interpolateColor(scheme.value, [0, 1], [dark.inactive, light.inactive]);
    const on = interpolateColor(scheme.value, [0, 1], [dark.foreground, light.foreground]);
    return { color: interpolateColor(progress.value, [0, 1], [off, on]) };
  });

  const icons = (colors: OffsetPlusColors) => (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, inactiveIcon]}>
        {tab.renderIcon?.({ focused: false, color: colors.inactive, size: ICON })}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, activeIcon]}>
        {tab.renderIcon?.({ focused: true, color: colors.foreground, size: ICON })}
      </Animated.View>
    </>
  );

  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.icon}>
        <Animated.View style={[StyleSheet.absoluteFill, darkLayer]}>{icons(dark)}</Animated.View>
        {hasLight ? (
          <Animated.View style={[StyleSheet.absoluteFill, lightLayer]}>
            {icons(light)}
          </Animated.View>
        ) : null}
        <Badge badge={tab.badge} colors={dark} />
      </View>
      <Animated.Text numberOfLines={1} style={[styles.label, { fontFamily }, label]}>
        {tab.label}
      </Animated.Text>
    </TabButton>
  );
}

/**
 * Not in the screenshots, which show no badges: a count is the app's red bubble at the
 * icon's top right, an empty badge a small dot there. The tab's accessibility label
 * already reads it.
 */
function Badge({ badge, colors }: { badge: TabItem['badge']; colors: OffsetPlusColors }) {
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
      style={[styles.count, { backgroundColor: colors.badge }]}
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
  // Five equal slots across the full width; no side padding.
  bar: {
    height: BAR,
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
  // The label's line box starts 2 pt below the icon box.
  label: {
    marginTop: LABEL_TOP - (ICON_CENTER + ICON / 2),
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    includeFontPadding: false,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    paddingTop: ACTION_TOP,
  },
  action: {
    width: ACTION_WIDTH + 2 * ACTION_OFFSET,
    height: ACTION_HEIGHT,
  },
  layer: {
    position: 'absolute',
    top: 0,
    width: ACTION_WIDTH,
    height: ACTION_HEIGHT,
    borderRadius: ACTION_RADIUS,
  },
  layerLeft: {
    left: 0,
  },
  layerRight: {
    right: 0,
  },
  layerFace: {
    left: ACTION_OFFSET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBar: {
    position: 'absolute',
    width: PLUS,
    height: PLUS_STROKE,
  },
  plusBarVertical: {
    width: PLUS_STROKE,
    height: PLUS,
  },
  dot: {
    position: 'absolute',
    top: 4,
    left: 22,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  count: {
    position: 'absolute',
    top: 1,
    left: 17,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4.5,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '700',
    includeFontPadding: false,
  },
});
