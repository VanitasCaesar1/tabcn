/**
 * Sticker Pills: a playful floating row for dark apps. Each tab is a glossy sticker icon
 * overlapping a small label pill in heavy condensed capitals. Idle pills are a faint grey; the
 * active one fills with its tab's own colour (`tones`), and the whole tab pops: it grows a
 * little, tilts and springs level, like a sticker slapped on. The row sits on a dark fade over
 * the screen, so content scrolls under it.
 *
 * Motion (lively): on focus the tab springs from 0.9 to 1.1 of its size (about 420 ms, one small
 * overshoot) and rocks from an 8 degree tilt to level on a looser spring (about 600 ms, swinging
 * just past level once); its colour fills in 160 ms. Losing focus,
 * its colour drains in 110 ms (70%) and it eases back to size, with no bounce. Pressing dips the
 * tab to 94% as the finger lands. With reduce motion on, the tab changes size and colour at once.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useEffect, useMemo } from 'react';
import { I18nManager, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  BadgeCount,
  TabBarRoot,
  TabButton,
  type TabIconProps,
  type TabItem,
  TabList,
  tabcnTiming,
  useTabBar,
} from 'react-native-tabcn';

/** One tab's colours when it's active. */
export interface StickerPillsTone {
  /** The pill's fill. */
  fill: string;
  /** The pill's light rim. */
  rim: string;
  /** The label on the fill. */
  label: string;
}

/** Tones given to tabs in order when `tones` names no tone for a tab: sun, green, coral, sky, lilac. */
export const stickerPillsTones: readonly StickerPillsTone[] = [
  { fill: '#f2dc85', rim: '#fff6cf', label: '#3d2e05' },
  { fill: '#5bc254', rim: '#c9f2b8', label: '#0f3310' },
  { fill: '#ff8a72', rim: '#ffd9cf', label: '#4a130a' },
  { fill: '#7cc4ff', rim: '#d6edff', label: '#0b2c4a' },
  { fill: '#c3a6ff', rim: '#eadfff', label: '#2a1252' },
];

const defaultColors = {
  /** The fade behind the row, opaque at the bottom edge. Match the screen's background. */
  scrim: '#0b0b0d',
  /** An idle tab's pill. */
  idle: 'rgba(255, 255, 255, 0.08)',
  /** An idle tab's label. */
  idleLabel: 'rgba(255, 255, 255, 0.56)',
  /** The badge: a sticker-red dot or count with a white rim. */
  badge: '#ff3b47',
  /** Badge text. */
  badgeText: '#ffffff',
};

export type StickerPillsColors = typeof defaultColors;

export interface StickerPillsProps {
  /** Colours of the row; each tab's active colours come from `tones`. */
  colors?: Partial<StickerPillsColors>;
  /**
   * Active colours per tab, keyed by route name. A tab without one takes the next tone from
   * `stickerPillsTones` by its position.
   */
  tones?: Record<string, StickerPillsTone>;
  /**
   * Label font. Default: Avenir Next Condensed Heavy on iOS, the system condensed sans in bold
   * on Android and the web.
   */
  fontFamily?: string;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

/** The sticker icon's size, and how far it reaches over its pill. */
const ICON = 34;
const OVERLAP = 12;
const PILL_HEIGHT = 26;
/** How high the fade reaches above the row. */
const SCRIM_RISE = 40;

/** A focused tab's size, the size it pops from, and its tilt before it springs level. */
const ACTIVE_SCALE = 1.1;
const POP_FROM = 0.9;
const TILT = 8;
/** The icon grows a touch more than its pill, as the reference's sticker does. */
const ICON_BOOST = 1.06;

const pop = { duration: 420, dampingRatio: 0.6, reduceMotion: ReduceMotion.System };
/** The tilt settles on its own, slower spring, rocking just past level once. */
const rock = { duration: 600, dampingRatio: 0.4, reduceMotion: ReduceMotion.System };
const settle = {
  duration: 160,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
  reduceMotion: ReduceMotion.System,
};
const fillIn = {
  duration: 160,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
  reduceMotion: ReduceMotion.System,
};
const drain = {
  duration: 110,
  easing: Easing.bezier(0.4, 0, 1, 1),
  reduceMotion: ReduceMotion.System,
};

const condensed = Platform.select({
  ios: 'AvenirNextCondensed-Heavy',
  default: 'sans-serif-condensed',
});

export function StickerPills({
  colors: custom,
  tones,
  fontFamily,
  haptics = true,
}: StickerPillsProps) {
  const colors = useColors(custom);
  const { tabs, insets } = useTabBar();
  return (
    <TabBarRoot placement="floating" offset={6} style={styles.root}>
      {/* Solid behind the row and down to the screen's edge, fading out above it. */}
      <View
        pointerEvents="none"
        style={[styles.scrim, { backgroundColor: colors.scrim, bottom: -(insets.bottom + 6) }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[transparent(colors.scrim), colors.scrim]}
        style={styles.fade}
      />
      <TabList style={styles.row}>
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            tab={tab}
            tone={
              tones?.[tab.routeName] ??
              (stickerPillsTones[tab.index % stickerPillsTones.length] as StickerPillsTone)
            }
            colors={colors}
            fontFamily={fontFamily ?? condensed}
            haptics={haptics}
          />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

/** The colours merged with the defaults, changing only when a colour does. */
function useColors(custom: Partial<StickerPillsColors> | undefined): StickerPillsColors {
  const { scrim, idle, idleLabel, badge, badgeText } = custom ?? {};
  return useMemo(
    () => ({
      scrim: scrim ?? defaultColors.scrim,
      idle: idle ?? defaultColors.idle,
      idleLabel: idleLabel ?? defaultColors.idleLabel,
      badge: badge ?? defaultColors.badge,
      badgeText: badgeText ?? defaultColors.badgeText,
    }),
    [scrim, idle, idleLabel, badge, badgeText],
  );
}

function Tab({
  tab,
  tone,
  colors,
  fontFamily,
  haptics,
}: {
  tab: TabItem;
  tone: StickerPillsTone;
  colors: StickerPillsColors;
  fontFamily: string | undefined;
  haptics: boolean;
}) {
  // `on` is the colour (0 idle, 1 the tab's tone); `size` the tab's pop, which overshoots.
  const on = useSharedValue(tab.focused ? 1 : 0);
  const size = useSharedValue(tab.focused ? ACTIVE_SCALE : 1);
  const tilt = useSharedValue(0);
  const lean = I18nManager.isRTL ? TILT : -TILT;
  useEffect(() => {
    if (tab.focused) {
      on.value = withTiming(1, fillIn);
      // Pops from a little under its idle size, tilted, and springs to full size and level.
      if (size.value < ACTIVE_SCALE - 0.01) {
        size.value = POP_FROM;
        tilt.value = lean;
      }
      size.value = withSpring(ACTIVE_SCALE, pop);
      tilt.value = withSpring(0, rock);
    } else {
      on.value = withTiming(0, drain);
      size.value = withTiming(1, settle);
      tilt.value = withTiming(0, settle);
    }
  }, [tab.focused, on, size, tilt, lean]);

  const { idle, idleLabel } = colors;
  const { fill, rim, label } = tone;
  const body = useAnimatedStyle(() => ({
    transform: [{ scale: size.value }, { rotate: `${tilt.value}deg` }],
  }));
  const pill = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [idle, fill]),
    borderColor: interpolateColor(on.value, [0, 1], ['rgba(255, 255, 255, 0)', rim]),
  }));
  const text = useAnimatedStyle(() => ({
    color: interpolateColor(on.value, [0, 1], [idleLabel, label]),
  }));
  const icon = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(on.value, [0, 1], [1, ICON_BOOST]) }],
  }));

  return (
    <TabButton
      tab={tab}
      scale={0.94}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <Animated.View style={[styles.body, body]}>
        <Animated.View style={[styles.pill, pill]}>
          <Animated.Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            maxFontSizeMultiplier={1.2}
            style={[styles.label, { fontFamily }, Platform.OS !== 'ios' && styles.bold, text]}
          >
            {tab.label}
          </Animated.Text>
        </Animated.View>
        <Animated.View style={[styles.icon, icon]}>
          {tab.renderIcon ? <Icon render={tab.renderIcon} focused={tab.focused} /> : null}
          <Badge badge={tab.badge} colors={colors} fontFamily={fontFamily} />
        </Animated.View>
      </Animated.View>
    </TabButton>
  );
}

/** The tab's `tabBarIcon`, in a component of its own so each tab's icon keeps its hooks. */
function Icon({
  render,
  focused,
}: {
  render: (props: TabIconProps) => ReactNode;
  focused: boolean;
}) {
  return render({ focused, color: '#ffffff', size: ICON });
}

// Badges fade in and out on tabcnTiming, with no pop; at once with reduce motion on.
const BADGE_FADE_MS = tabcnTiming.duration ?? 200;
const BADGE_EASING = tabcnTiming.easing ?? Easing.linear;
const badgeIn = FadeIn.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);
const badgeOut = FadeOut.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);

/**
 * On the sticker's top corner: a red dot for an empty badge, else a red count or text, each with
 * a white rim like a sticker's. Screen readers hear the badge with the tab's label.
 */
function Badge({
  badge,
  colors,
  fontFamily,
}: {
  badge: TabItem['badge'];
  colors: StickerPillsColors;
  fontFamily: string | undefined;
}) {
  if (badge === undefined) return null;
  const dot = badge === '';
  const text = [
    styles.badgeText,
    { color: colors.badgeText, fontFamily },
    Platform.OS !== 'ios' && styles.bold,
  ];
  return (
    <Animated.View
      entering={badgeIn}
      exiting={badgeOut}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[dot ? styles.dot : styles.count, { backgroundColor: colors.badge }]}
    >
      {typeof badge === 'number' ? (
        <BadgeCount value={badge} textStyle={text} />
      ) : dot ? null : (
        <Text maxFontSizeMultiplier={1.2} style={text}>
          {badge}
        </Text>
      )}
    </Animated.View>
  );
}

/** `color` with no opacity, for the top of the fade: the same colour, so it doesn't grey out. */
function transparent(color: string) {
  if (/^#[0-9a-f]{6}$/i.test(color)) return `${color}00`;
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const [r, g, b] = color.slice(1);
    return `#${r}${r}${g}${g}${b}${b}00`;
  }
  return 'transparent';
}

const styles = StyleSheet.create({
  // As wide as the screen, so the fade spans it; the row is centred inside.
  root: { width: '100%', alignItems: 'center' },
  scrim: { position: 'absolute', left: 0, right: 0, top: 0 },
  fade: { position: 'absolute', left: 0, right: 0, top: -SCRIM_RISE, height: SCRIM_RISE },
  row: { gap: 8, paddingHorizontal: 12 },
  tab: { height: 48, justifyContent: 'center' },
  body: { flexDirection: 'row', alignItems: 'center' },
  // The label starts after the part of the icon that overlaps the pill.
  pill: {
    height: PILL_HEIGHT,
    marginStart: ICON - OVERLAP,
    paddingStart: OVERLAP + 4,
    paddingEnd: 9,
    borderRadius: 9,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  bold: { fontWeight: '700' },
  // Over the pill's leading end, drawn above it.
  icon: {
    position: 'absolute',
    start: 0,
    top: (PILL_HEIGHT - ICON) / 2,
    width: ICON,
    height: ICON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: -1,
    end: -1,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  count: {
    position: 'absolute',
    top: -4,
    end: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, lineHeight: 13, fontVariant: ['tabular-nums'] },
});
