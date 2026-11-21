/**
 * Orbs: separate glass circles instead of a bar. Each tab is a frosted orb with its art
 * inside; the centre one is a little larger. The active orb's glass brightens and its rim
 * turns solid white (a crossfade; no orb changes size). Badges are glossy red balls.
 *
 * The glass is Apple's Liquid Glass on iOS 26 and later, a frosted blur on older iOS and on the
 * web, and a translucent white tint on Android (no blur there: it's reliable and looks nearly the same
 * over the solid colours this design is meant for). Force one with `material`.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  tabcnTiming,
  useFocusProgress,
  useTabBar,
} from 'react-native-tabcn';

const defaultColors = {
  /** The fill over the blur, or the whole surface where there's no blur (Android). */
  tint: 'rgba(255, 255, 255, 0.38)',
  /** Tint of the Liquid Glass (iOS 26+). */
  glassTint: 'rgba(255, 255, 255, 0.22)',
  /** Every orb's thin rim. */
  rim: 'rgba(255, 255, 255, 0.6)',
  /** The active orb: a brighter wash over its glass and a solid rim, crossfaded in. */
  activeTint: 'rgba(255, 255, 255, 0.2)',
  activeRim: '#ffffff',
  /** The soft blue drop shadow under each orb. */
  shadow: 'rgba(10, 60, 130, 0.28)',
  /** The glossy badge ball. */
  badge: '#f0151c',
  /** The highlight on the badge ball. */
  gloss: 'rgba(255, 255, 255, 0.55)',
  /** The darkening inside the glass while an orb is pressed (shown at 6% opacity). */
  pressShade: '#000000',
  /**
   * Colour passed to `tabBarIcon`. The orb art draws its own colours and ignores it; it
   * reaches icons of your own.
   */
  icon: '#3c54ec',
};

export type OrbsColors = typeof defaultColors;

/**
 * `glass`: Liquid Glass (iOS 26+). `blur`: frosted blur (iOS and web). `tint`: translucent
 * fill, no blur.
 */
export type OrbsMaterial = 'auto' | 'glass' | 'blur' | 'tint';

export interface OrbsProps {
  colors?: Partial<OrbsColors>;
  /** Default `auto`: glass where available, blur on older iOS and web, tint on Android. */
  material?: OrbsMaterial;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

/** Measured on the app: side orbs 64.5 pt, the centre one 74 pt, centres 103 pt apart. */
const SMALL = 64.5;
const LARGE = 74;
const SPACING = 103;
/** Room kept on each side of the row on a screen too narrow for it. */
const MARGIN = 12;
/** The row never scales below this, so the orbs stay tappable. */
const MIN_SCALE = 0.5;

function resolveMaterial(material: OrbsMaterial): Exclude<OrbsMaterial, 'auto'> {
  if (material !== 'auto') return material;
  if (isLiquidGlassAvailable()) return 'glass';
  // expo-blur blurs on web too (CSS backdrop-filter); only Android gets the plain tint.
  return Platform.OS === 'android' ? 'tint' : 'blur';
}

export function Orbs({ colors: custom, material = 'auto', haptics = true }: OrbsProps) {
  const colors = { ...defaultColors, ...custom };
  const surface = resolveMaterial(material);
  const { tabs, insets } = useTabBar();
  // At the measured sizes the row of 3 needs 280 pt. On a screen too narrow for the row (4 or
  // more orbs on a small phone) every size and gap scales down together.
  const window = useWindowDimensions();
  const natural = tabs.length * LARGE + Math.max(0, tabs.length - 1) * (SPACING - LARGE);
  const room = window.width - insets.left - insets.right - MARGIN * 2;
  const scale = natural > room ? Math.max(MIN_SCALE, room / natural) : 1;
  // The app's centre orb is always the large one; it doesn't follow the active tab. With an
  // even count there's no centre, so every orb is small.
  const middle = tabs.length % 2 === 1 ? Math.floor(tabs.length / 2) : -1;
  return (
    <TabBarRoot placement="floating">
      <TabList style={[styles.list, { gap: (SPACING - LARGE) * scale }]}>
        {tabs.map((tab) => (
          <Orb
            key={tab.key}
            tab={tab}
            size={(tab.index === middle ? LARGE : SMALL) * scale}
            slot={LARGE * scale}
            colors={colors}
            surface={surface}
            haptics={haptics}
          />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

function Orb({
  tab,
  size,
  slot,
  colors,
  surface,
  haptics,
}: {
  tab: TabItem;
  size: number;
  /** Width and height of the tab button: the large orb's size. */
  slot: number;
  colors: OrbsColors;
  surface: Exclude<OrbsMaterial, 'auto'>;
  haptics: boolean;
}) {
  // Active cue: a brighter wash and a solid rim crossfade in (focus progress runs on
  // tabcnTiming, so reduce motion makes it instant). The orb itself never changes size.
  const progress = useFocusProgress(tab);
  const active = useAnimatedStyle(() => ({ opacity: progress.value }));
  // Press feedback: a faint darkening inside the glass, never a scale.
  const press = useSharedValue(0);
  const shade = useAnimatedStyle(() => ({ opacity: press.value }));
  return (
    <TabButton
      tab={tab}
      style={[styles.slot, { width: slot, height: slot }]}
      onPressIn={() => {
        press.value = withTiming(PRESS_SHADE, PRESS_IN);
        if (haptics) Haptics.selectionAsync();
      }}
      onPressOut={() => {
        press.value = withTiming(0, tabcnTiming);
      }}
    >
      <View
        style={[
          styles.orb,
          { width: size, height: size, borderRadius: size / 2 },
          { boxShadow: `0 6px 16px ${colors.shadow}` },
        ]}
      >
        <View style={[StyleSheet.absoluteFill, styles.clip]}>
          {surface === 'glass' ? (
            // Liquid Glass already frosts; a light tint on the clear style matches the app.
            <GlassView
              glassEffectStyle="clear"
              tintColor={colors.glassTint}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <>
              {surface === 'blur' ? (
                <BlurView intensity={24} tint="light" style={StyleSheet.absoluteFill} />
              ) : null}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tint }]} />
            </>
          )}
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.activeTint }, active]}
          />
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.pressShade }, shade]}
          />
        </View>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          {/* Icons are drawn in the orb's own box, at the orb's fixed size. */}
          <View style={{ width: size, height: size }}>
            {tab.renderIcon?.({ focused: tab.focused, color: colors.icon, size })}
          </View>
        </View>
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.rim, { borderColor: colors.rim }]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.activeRim,
            { borderColor: colors.activeRim },
            active,
          ]}
        />
      </View>
      {tab.badge != null ? (
        <Animated.View
          entering={badgeIn}
          exiting={badgeOut}
          style={[styles.badge, { backgroundColor: colors.badge }]}
        >
          <Animated.View style={[styles.gloss, { backgroundColor: colors.gloss }]} />
        </Animated.View>
      ) : null}
    </TabButton>
  );
}

// Motion: the orbs never change size or move. The active orb's wash and rim crossfade in and
// out on focus progress (tabcnTiming). A press darkens the glass slightly (in on a shortened tabcnTiming, out on tabcnTiming), and the
// badge fades in and out with no pop. With "reduce motion" on, all of it is instant.
const PRESS_SHADE = 0.06;
const PRESS_IN = { ...tabcnTiming, duration: 100 };
const BADGE_FADE_MS = tabcnTiming.duration ?? 200;
const BADGE_EASING = tabcnTiming.easing ?? Easing.linear;
const badgeIn = FadeIn.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);
const badgeOut = FadeOut.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);

const styles = StyleSheet.create({
  list: { alignItems: 'center', paddingVertical: 4 },
  slot: { alignItems: 'center', justifyContent: 'center' },
  orb: { alignItems: 'center', justifyContent: 'center' },
  clip: { borderRadius: 999, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  rim: { borderRadius: 999, borderWidth: 1.2 },
  activeRim: { borderRadius: 999, borderWidth: 2 },
  badge: { position: 'absolute', top: 2, right: 2, width: 13, height: 13, borderRadius: 7 },
  gloss: {
    position: 'absolute',
    top: 2,
    left: 3,
    width: 5,
    height: 3,
    borderRadius: 2,
  },
});
