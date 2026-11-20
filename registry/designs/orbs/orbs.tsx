/**
 * Orbs: separate glass circles instead of a bar. Each tab is a frosted orb with its art
 * inside; the active one is a little larger. Badges are glossy red balls.
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
import Animated, { FadeIn, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { TabBarRoot, TabButton, type TabItem, TabList, useFocusProgress, useTabBar } from 'tabcn';

const defaultColors = {
  /** The fill over the blur, or the whole surface where there's no blur (Android). */
  tint: 'rgba(255, 255, 255, 0.38)',
  /** Tint of the Liquid Glass (iOS 26+). */
  glassTint: 'rgba(255, 255, 255, 0.22)',
  rim: 'rgba(255, 255, 255, 0.6)',
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

/** Measured on the app: side orbs 64.5 pt, the active one 74 pt, centres 103 pt apart. */
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
  return (
    <TabBarRoot placement="floating">
      <TabList style={styles.list}>
        {tabs.map((tab) => (
          <Orb key={tab.key} tab={tab} colors={colors} surface={surface} haptics={haptics} />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

function Orb({
  tab,
  colors,
  surface,
  haptics,
}: {
  tab: TabItem;
  colors: OrbsColors;
  surface: Exclude<OrbsMaterial, 'auto'>;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  // Grows on an eased curve when it becomes active; no spring, no bounce.
  const size = useAnimatedStyle(() => {
    const d = interpolate(progress.value, [0, 1], [SMALL, LARGE]);
    return { width: d, height: d, borderRadius: d / 2 };
  });
  // Icons are drawn in the orb's own box, so the art scales with the orb.
  const art = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [SMALL / LARGE, 1]) }],
  }));
  return (
    <TabButton
      tab={tab}
      style={styles.slot}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <Animated.View style={[styles.orb, { boxShadow: `0 6px 16px ${colors.shadow}` }, size]}>
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
        </View>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Animated.View style={[styles.art, art]}>
            {tab.renderIcon?.({ focused: tab.focused, color: '#3c54ec', size: LARGE })}
          </Animated.View>
        </View>
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.rim, { borderColor: colors.rim }]}
        />
      </Animated.View>
      {tab.badge != null ? (
        <Animated.View
          entering={FadeIn.duration(160)}
          style={[styles.badge, { backgroundColor: colors.badge }]}
        >
          <Animated.View style={styles.gloss} />
        </Animated.View>
      ) : null}
    </TabButton>
  );
}

const styles = StyleSheet.create({
  list: { alignItems: 'center', gap: SPACING - LARGE, paddingVertical: 4 },
  slot: { width: LARGE, height: LARGE, alignItems: 'center', justifyContent: 'center' },
  orb: { alignItems: 'center', justifyContent: 'center' },
  clip: { borderRadius: 999, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  art: { width: LARGE, height: LARGE },
  rim: { borderRadius: 999, borderWidth: 1.2 },
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
