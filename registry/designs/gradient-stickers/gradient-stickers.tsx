/**
 * Gradient Stickers: a cream pill with a two-tone glow along its top edge and
 * sticker icons. A soft tinted capsule glides to the active sticker.
 *
 * Contrast: the tinted capsule, the only active cue, is low in contrast against the cream.
 * The stickers draw their own colours; with icons of your own, set `colors.activeForeground`
 * to give the active icon a colour of its own, which crossfades in on tabcnTiming, so the
 * active tab can meet 3:1.
 * On iOS 26 the pill is light Liquid Glass (expo-glass-effect) tinted with the cream at 50%, so it
 * keeps its colour, with no cream fill, glow, rim or shadow (the glow fades into the cream, so it
 * goes with it); elsewhere, or with
 * `material="solid"`, it is the cream pill. Choose with `material`.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { processColor, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  tabcnTiming,
  useFocusProgress,
  useTabBar,
} from 'react-native-tabcn';

const defaultColors = {
  /** The pill's cream fill; the glow fades into it. */
  background: '#fef0c3',
  /** The glow along the top edge, left to right: two or more colours. */
  glow: ['#ffd392', '#ffd392', '#fff5c1', '#dcee82', '#dcee82'] as readonly string[],
  /** The pill's light edge. */
  rim: 'rgba(255, 250, 214, 0.9)',
  /** The tinted capsule behind the active sticker. */
  capsule: 'rgba(214, 160, 60, 0.22)',
  /** The badge dot. */
  badge: '#ff4b4b',
  /**
   * Colour passed to `tabBarIcon`. The traced stickers draw their own colours and ignore it;
   * it reaches icons of your own.
   */
  icon: '#000000',
  /**
   * Colour passed to the active tab's `tabBarIcon`, crossfaded in on tabcnTiming. Unset (the
   * default), the active tab gets `icon` like the rest. The stickers ignore it too.
   */
  activeForeground: undefined as string | undefined,
  /**
   * Tint over the Liquid Glass (iOS 26). Unset, `background` (the cream) at 50%, so the pill keeps
   * its colour over any screen; `'transparent'` for clear glass.
   */
  glassTint: undefined as string | undefined,
};

export type GradientStickersColors = typeof defaultColors;

export interface GradientStickersProps {
  colors?: Partial<GradientStickersColors>;
  /**
   * The pill's surface: `'glass'` (Liquid Glass, iOS 26), `'solid'` (the cream fill with its
   * glow, rim and shadow), or `'auto'` (glass where the system has it, solid elsewhere).
   * Default `'auto'`.
   */
  material?: 'auto' | 'glass' | 'solid';
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

export function GradientStickers({
  colors: custom,
  material = 'auto',
  haptics = true,
}: GradientStickersProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  const glass = material === 'glass' || (material === 'auto' && isLiquidGlassAvailable());
  // LinearGradient needs two colours at least: a single one is a flat glow.
  const only = colors.glow[0] ?? 'transparent';
  const glow = (colors.glow.length >= 2 ? colors.glow : [only, only]) as readonly [
    string,
    string,
    ...string[],
  ];
  return (
    <TabBarRoot placement="floating" style={styles.outer}>
      <View style={glass ? styles.frame : styles.shadow}>
        {glass ? (
          <GlassView
            pointerEvents="none"
            glassEffectStyle="regular"
            colorScheme="light"
            tintColor={colors.glassTint ?? withAlpha(colors.background, 0.5)}
            style={[StyleSheet.absoluteFill, styles.glass]}
          />
        ) : null}
        <View
          style={
            glass
              ? [styles.pill, styles.clear]
              : [styles.pill, { backgroundColor: colors.background, borderColor: colors.rim }]
          }
        >
          {glass ? null : (
            <LinearGradient
              pointerEvents="none"
              colors={glow}
              locations={glowLocations(glow.length)}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.glow}
            >
              <LinearGradient
                colors={[transparent(colors.background), colors.background]}
                locations={[0.5, 1]}
                style={StyleSheet.absoluteFill}
              />
            </LinearGradient>
          )}
          <TabList style={styles.list}>
            <TabIndicator
              inset={{ x: -2.5, y: 0 }}
              style={[styles.capsule, { backgroundColor: colors.capsule }]}
            />
            {tabs.map((tab) => (
              <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
            ))}
          </TabList>
        </View>
      </View>
    </TabBarRoot>
  );
}

function Tab({
  tab,
  colors,
  haptics,
}: {
  tab: TabItem;
  colors: GradientStickersColors;
  haptics: boolean;
}) {
  // With `activeForeground`, the active colour fades in over the idle one, which stays opaque
  // until late in the change, so the icon never looks dimmed half-way.
  const progress = useFocusProgress(tab);
  const outgoing = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.6, 1], [1, 0], 'clamp'),
  }));
  const incoming = useAnimatedStyle(() => ({ opacity: progress.value }));
  const icon = (color: string) =>
    tab.renderIcon?.({ focused: tab.focused, color, size: ICON }) ?? null;
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      {/* The icon's own box: the badge is pinned to it, not to the tab, so it stays on the
          sticker however wide the tabs are (a share of the tab's width floated it off with
          two or three tabs). */}
      <View style={styles.iconBox}>
        {colors.activeForeground === undefined ? (
          icon(colors.icon)
        ) : (
          <View>
            <Animated.View style={outgoing}>{icon(colors.icon)}</Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, incoming]}>
              {icon(colors.activeForeground)}
            </Animated.View>
          </View>
        )}
        {tab.badge != null ? (
          <Animated.View
            entering={badgeIn}
            exiting={badgeOut}
            style={[styles.badge, { backgroundColor: colors.badge }]}
          />
        ) : null}
      </View>
    </TabButton>
  );
}

/** The default glow's stops: its warm and green ends meet in a narrow pale band mid-way. */
const GLOW_LOCATIONS = [0, 0.46, 0.52, 0.57, 1] as const;

/** Stops for `count` glow colours: the measured ones for five, evenly spread otherwise. */
function glowLocations(count: number): readonly [number, number, ...number[]] {
  if (count === GLOW_LOCATIONS.length) return GLOW_LOCATIONS;
  const stops = Array.from({ length: count }, (_, i) => i / (count - 1));
  return stops as readonly number[] as readonly [number, number, ...number[]];
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

/** `color` at `alpha` opacity; colours it can't read are returned as they are. */
function withAlpha(color: string, alpha: number): string {
  const c = channels(color);
  return c ? `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})` : color;
}

/** `color` with zero alpha, so the glow fades into the fill without a grey midpoint. */
function transparent(color: string): string {
  const c = channels(color);
  return c ? `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0)` : 'transparent';
}

// Motion: only the capsule moves, sliding and resizing on the foundation's default tabcnSpring
// (critically damped, no overshoot). Stickers look the same on every tab (unless
// `activeForeground` is set: then the active icon's colour crossfades), and a press gives a
// haptic, not a scale. The glow, rim and shadow never change. The badge dot fades in and out on
// tabcnTiming, with no pop; with "reduce motion" on, everything happens instantly.
const BADGE_FADE_MS = tabcnTiming.duration ?? 200;
const BADGE_EASING = tabcnTiming.easing ?? Easing.linear;
const badgeIn = FadeIn.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);
const badgeOut = FadeOut.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);

/** The traced stickers' 40-unit box, in points, at the reference's scale. */
const ICON = 35.5;
const TAB_HEIGHT = 50.5;
const PILL_PADDING = 2.5;
const PILL_BORDER = 1.5;

const styles = StyleSheet.create({
  outer: { width: 330, maxWidth: '100%' },
  shadow: { borderRadius: 30, boxShadow: '0 10px 26px rgba(150, 110, 40, 0.22)' },
  frame: { borderRadius: 30 },
  // Half the pill's 58.5 pt height (tab 50.5 + padding 5 + border 3), set exactly: the glass
  // draws its corners from it.
  glass: { borderRadius: (TAB_HEIGHT + PILL_PADDING * 2 + PILL_BORDER * 2) / 2 },
  pill: {
    borderRadius: 30,
    paddingVertical: PILL_PADDING,
    paddingHorizontal: 5,
    overflow: 'hidden',
    borderWidth: PILL_BORDER,
  },
  // Over glass the pill keeps its border's room (so it is the same size) but draws nothing.
  clear: { borderColor: 'transparent' },
  glow: { position: 'absolute', left: 0, right: 0, top: 0, height: 15 },
  list: { alignItems: 'stretch' },
  capsule: { borderRadius: 999 },
  tab: { flex: 1, height: TAB_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: ICON, height: ICON, alignItems: 'center', justifyContent: 'center' },
  // Where the reference has it on a 4-tab bar: just inside the sticker's top right.
  badge: { position: 'absolute', top: 4.5, right: 4.5, width: 10, height: 10, borderRadius: 5 },
});
