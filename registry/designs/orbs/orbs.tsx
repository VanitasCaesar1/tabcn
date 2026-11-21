/**
 * Orbs: separate glass circles instead of a bar. Each tab is a frosted orb with its art
 * inside; the centre one is a little larger. The active orb's glass brightens and its rim
 * turns solid white (a crossfade; no orb changes size). Badges are glossy red balls.
 *
 * The glass is Apple's Liquid Glass on iOS 26 and later, a frosted blur on older iOS, and a
 * translucent white tint on Android (no blur there: it's reliable and looks nearly the same
 * over the solid colours this design is meant for). Force one with `material`.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Platform, StyleSheet, View } from 'react-native';
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
  rim: 'rgba(255, 255, 255, 0.6)',
  /** The active orb: a brighter wash over its glass and a solid rim, crossfaded in. */
  activeTint: 'rgba(255, 255, 255, 0.2)',
  activeRim: '#ffffff',
  shadow: 'rgba(10, 60, 130, 0.28)',
  badge: '#f0151c',
};

export type OrbsColors = typeof defaultColors;

/** `glass`: Liquid Glass (iOS 26+). `blur`: frosted blur. `tint`: translucent fill, no blur. */
export type OrbsMaterial = 'auto' | 'glass' | 'blur' | 'tint';

export interface OrbsProps {
  colors?: Partial<OrbsColors>;
  /** Default `auto`: glass where available, blur on older iOS, tint on Android. */
  material?: OrbsMaterial;
  haptics?: boolean;
}

/** Measured on the app: side orbs 64.5 pt, the centre one 74 pt, centres 103 pt apart. */
const SMALL = 64.5;
const LARGE = 74;
const SPACING = 103;

function resolveMaterial(material: OrbsMaterial): Exclude<OrbsMaterial, 'auto'> {
  if (material !== 'auto') return material;
  if (isLiquidGlassAvailable()) return 'glass';
  return Platform.OS === 'ios' ? 'blur' : 'tint';
}

export function Orbs({ colors: custom, material = 'auto', haptics = true }: OrbsProps) {
  const colors = { ...defaultColors, ...custom };
  const surface = resolveMaterial(material);
  const { tabs } = useTabBar();
  // The app's centre orb is always the large one; it doesn't follow the active tab. With an
  // even count there's no centre, so every orb is small.
  const middle = tabs.length % 2 === 1 ? Math.floor(tabs.length / 2) : -1;
  return (
    <TabBarRoot placement="floating">
      <TabList style={styles.list}>
        {tabs.map((tab) => (
          <Orb
            key={tab.key}
            tab={tab}
            size={tab.index === middle ? LARGE : SMALL}
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
  colors,
  surface,
  haptics,
}: {
  tab: TabItem;
  size: number;
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
      style={styles.slot}
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
            style={[StyleSheet.absoluteFill, styles.shade, shade]}
          />
        </View>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          {/* Icons are drawn in the orb's own box, at the orb's fixed size. */}
          <View style={{ width: size, height: size }}>
            {tab.renderIcon?.({ focused: tab.focused, color: '#3c54ec', size })}
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
          <Animated.View style={styles.gloss} />
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
  list: { alignItems: 'center', gap: SPACING - LARGE, paddingVertical: 4 },
  slot: { width: LARGE, height: LARGE, alignItems: 'center', justifyContent: 'center' },
  orb: { alignItems: 'center', justifyContent: 'center' },
  clip: { borderRadius: 999, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  shade: { backgroundColor: '#000000' },
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
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
});
