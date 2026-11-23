/**
 * Sliding Capsule: Wise's tab bar. A near-white glass pill floats just above the home
 * indicator, 373 x 62.5 pt with about 14.5 pt to each screen edge on a 402 pt phone.
 * Four tabs, each an outline icon over a sentence-case label, all in Wise forest green
 * (#163300) and one medium weight. The active tab gets a light grey capsule, a little
 * wider than its slot, that glides to the next tab. Nothing else changes: no colour or
 * weight change, no fill, no scale.
 *
 * Contrast: the grey capsule, the only active cue, is kept as the app has it (low contrast
 * against the bar). Set `colors.activeForeground` to give the active icon and label a colour
 * of their own, which crossfades in on tabcnTiming, so the active tab can meet 3:1.
 *
 * The glass is Apple's Liquid Glass on iOS 26 and later, a frosted blur on older iOS and on
 * the web, and a near-white tint on Android (no blur there). Force one with `material`.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  BadgeCount,
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
  /** The bar's fill where there's no Liquid Glass: measured #f0f0f0 at the top to #fefefe at the bottom. */
  background: '#f7f7f7',
  /** Active-tab capsule: measured #e0e0e0 at the top to #eaeaea at the bottom. */
  capsule: '#e5e5e5',
  /** Icons and labels, active and idle alike (the idle ones when `activeForeground` is set). */
  foreground: '#163300',
  /**
   * The active tab's icon and label, crossfaded in on tabcnTiming. Unset (the default), they
   * are `foreground` like the rest, as in the app.
   */
  activeForeground: undefined as string | undefined,
  /**
   * Tint of the Liquid Glass (iOS 26+), so the bar reads near-white as the app's does: untinted,
   * the glass took on strong colour from the content under it, with a hard seam at its edges.
   */
  glassTint: 'rgba(255, 255, 255, 0.55)',
  /** The bright 1 px edge of the bar (Liquid Glass draws its own). */
  rim: 'rgba(255, 255, 255, 0.95)',
  /** A faint, diffuse shadow around the bar. */
  shadow: 'rgba(0, 0, 0, 0.06)',
  /** Badge fill. */
  badge: '#ff3b30',
  /** Badge count text. */
  badgeText: '#ffffff',
};

export type SlidingCapsuleColors = typeof defaultColors;

/**
 * `glass`: Liquid Glass (iOS 26+). `blur`: frosted blur (iOS and web). `tint`: near-white fill,
 * no blur.
 */
export type SlidingCapsuleMaterial = 'auto' | 'glass' | 'blur' | 'tint';

export interface SlidingCapsuleProps {
  colors?: Partial<SlidingCapsuleColors>;
  /** Default `auto`: glass where available, blur on older iOS and web, tint on Android. */
  material?: SlidingCapsuleMaterial;
  /**
   * Appearance of the Liquid Glass (iOS 26+). Default `light`, as in Wise. Pass `auto` or
   * `dark` with dark `colors`, so light glyphs don't sit on light glass.
   */
  glassColorScheme?: 'auto' | 'light' | 'dark';
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

/**
 * Measured on the App Store screenshots at 1.537 px/pt (a 618 px wide, 402 pt screen):
 * tabs 89.5 pt apart inside a 62.5 pt tall bar with 7.5 pt of padding at each end
 * (373 pt in all), and a 96.5 x 54.5 pt capsule. The bar's bottom edge sits about 1 pt
 * above the home-indicator safe area.
 */
const TAB_WIDTH = 89.5;
/** On a narrow screen the tabs shrink to fit, down to this width. */
/** Tabs shrink to fit down to this; low enough that seven fit a 320 pt screen. */
const MIN_TAB_WIDTH = 32;
const BAR_HEIGHT = 62.5;
const BAR_PADDING = 7.5;
const CAPSULE_INSET = { x: -3.5, y: 4 };
const OFFSET = 1;
/** Icon box. The glyphs inside are about 19-21.5 pt across. */
const ICON = 24;

/** Top-to-bottom sheen over any fill colour, as on the app's bar and capsule. */
const BAR_SHEEN = 'linear-gradient(rgba(0, 0, 0, 0.03), rgba(255, 255, 255, 0.75))';
const CAPSULE_SHEEN = 'linear-gradient(rgba(0, 0, 0, 0.02), rgba(255, 255, 255, 0.2))';

/** Badges fade in and out on tabcn's timing (200 ms ease-out); instant with reduce motion. */
const FADE_MS = tabcnTiming.duration ?? 200;
const FADE_EASING = tabcnTiming.easing ?? Easing.bezier(0.25, 0.1, 0.25, 1);
const badgeIn = FadeIn.duration(FADE_MS).easing(FADE_EASING).reduceMotion(ReduceMotion.System);
const badgeOut = FadeOut.duration(FADE_MS).easing(FADE_EASING).reduceMotion(ReduceMotion.System);

function resolveMaterial(
  material: SlidingCapsuleMaterial,
): Exclude<SlidingCapsuleMaterial, 'auto'> {
  if (material !== 'auto') return material;
  if (isLiquidGlassAvailable()) return 'glass';
  // expo-blur blurs on web too (CSS backdrop-filter); only Android gets the plain tint.
  return Platform.OS === 'android' ? 'tint' : 'blur';
}

export function SlidingCapsule({
  colors: custom,
  material = 'auto',
  glassColorScheme = 'light',
  haptics = true,
}: SlidingCapsuleProps) {
  const colors = { ...defaultColors, ...custom };
  const surface = resolveMaterial(material);
  const { tabs } = useTabBar();

  return (
    <TabBarRoot placement="floating" offset={OFFSET}>
      <View style={[styles.bar, { boxShadow: `0 1px 12px ${colors.shadow}` }]}>
        <View style={[StyleSheet.absoluteFill, styles.clip]}>
          {surface === 'glass' ? (
            <GlassView
              glassEffectStyle="regular"
              colorScheme={glassColorScheme}
              tintColor={colors.glassTint}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <>
              {surface === 'blur' ? (
                <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
              ) : null}
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: colors.background,
                    opacity: surface === 'blur' ? 0.75 : 0.97,
                    // `backgroundImage` works on iOS, Android and the web alike.
                    backgroundImage: BAR_SHEEN,
                  },
                ]}
              />
            </>
          )}
        </View>
        <TabList style={styles.list}>
          <TabIndicator
            inset={CAPSULE_INSET}
            style={[
              styles.capsule,
              { backgroundColor: colors.capsule, backgroundImage: CAPSULE_SHEEN },
            ]}
          />
          {tabs.map((tab) => (
            <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
          ))}
        </TabList>
        {surface === 'glass' ? null : (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.rim, { borderColor: colors.rim }]}
          />
        )}
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
  colors: SlidingCapsuleColors;
  haptics: boolean;
}) {
  // With `activeForeground`, the active colour fades in over the idle one, which stays opaque
  // until late in the change, so the tab never looks dimmed half-way.
  const active = colors.activeForeground;
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
      <View style={styles.iconBox}>
        {active === undefined ? (
          icon(colors.foreground)
        ) : (
          <>
            <Animated.View style={[StyleSheet.absoluteFill, outgoing]}>
              {icon(colors.foreground)}
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, incoming]}>
              {icon(active)}
            </Animated.View>
          </>
        )}
        {tab.badge != null ? (
          <Animated.View
            entering={badgeIn}
            exiting={badgeOut}
            style={[styles.badge, { backgroundColor: colors.badge }]}
          >
            {typeof tab.badge === 'number' ? (
              <BadgeCount
                value={tab.badge}
                textStyle={[styles.badgeText, { color: colors.badgeText }]}
              />
            ) : (
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
                style={[styles.badgeText, { color: colors.badgeText }]}
              >
                {tab.badge}
              </Text>
            )}
          </Animated.View>
        ) : null}
      </View>
      {active === undefined ? (
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={[styles.label, { color: colors.foreground }]}
        >
          {tab.label}
        </Text>
      ) : (
        // The idle label sets the width; the active one is laid over it.
        <View>
          <Animated.Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={[styles.label, { color: colors.foreground }, outgoing]}
          >
            {tab.label}
          </Animated.Text>
          <Animated.Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={[styles.label, styles.over, { color: active }, incoming]}
          >
            {tab.label}
          </Animated.Text>
        </View>
      )}
    </TabButton>
  );
}

const styles = StyleSheet.create({
  bar: {
    // Fits the screen when the tabs' full width doesn't: they shrink instead.
    maxWidth: '100%',
    borderRadius: BAR_HEIGHT / 2,
  },
  clip: {
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  list: {
    paddingHorizontal: BAR_PADDING,
  },
  rim: {
    borderRadius: BAR_HEIGHT / 2,
    borderWidth: 0.75,
  },
  capsule: {
    borderRadius: 999,
  },
  // Icon centre 24 pt and label baseline 48.5 pt below the bar's top edge, as measured.
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: TAB_WIDTH,
    flexShrink: 1,
    minWidth: MIN_TAB_WIDTH,
    height: BAR_HEIGHT,
    paddingTop: 0.75,
  },
  iconBox: {
    width: ICON,
    height: ICON,
  },
  label: {
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '500',
  },
  over: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
