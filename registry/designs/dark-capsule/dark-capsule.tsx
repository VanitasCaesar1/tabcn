/**
 * Dark Capsule: a dark bar with icons only; an outlined capsule slides behind
 * the active tab. The capsule's colours are kept as the reference has them, faint as they are.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
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
  /** The bar, which also fills the home-indicator area. */
  background: '#0e0e10',
  /** The capsule that slides behind the active tab. */
  capsule: '#1c1c1f',
  /** The capsule's 1 pt outline. */
  capsuleBorder: '#38383d',
  /** The active tab's icon. */
  active: '#ffffff',
  /** The other tabs' icons. */
  inactive: '#8a8a90',
  /** The badge dot; it is ringed in `background`. */
  badge: '#ff453a',
};

export type DarkCapsuleColors = typeof defaultColors;

export interface DarkCapsuleProps {
  colors?: Partial<DarkCapsuleColors>;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

export function DarkCapsule({ colors: custom, haptics = true }: DarkCapsuleProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="docked" style={[styles.dock, { backgroundColor: colors.background }]}>
      <TabList style={[styles.bar, { backgroundColor: colors.background }]}>
        <TabIndicator
          inset={{ x: 11, y: 12.5 }}
          style={[
            styles.capsule,
            { backgroundColor: colors.capsule, borderColor: colors.capsuleBorder },
          ]}
        />
        {tabs.map((tab) => (
          <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

function Tab({
  tab,
  colors,
  haptics,
}: {
  tab: TabItem;
  colors: DarkCapsuleColors;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  // Colour-only change: the inactive glyph stays fully opaque underneath while the active
  // glyph fades in on top, then drops out over the last stretch so the active glyph rests
  // alone (no grey outline or fringe left under a filled icon). Fading both layers against
  // each other would dip the glyph darker mid-change and dim an icon that ignores `color`.
  const inactive = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [1, 0], 'clamp'),
  }));
  const active = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.iconBox}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, inactive]}>
          {tab.renderIcon?.({ focused: false, color: colors.inactive, size: 26 })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, active]}>
          {tab.renderIcon?.({ focused: true, color: colors.active, size: 26 })}
        </Animated.View>
        {tab.badge != null ? (
          <Animated.View
            entering={badgeIn}
            exiting={badgeOut}
            pointerEvents="none"
            style={[
              styles.badge,
              { backgroundColor: colors.badge, borderColor: colors.background },
            ]}
          />
        ) : null}
      </View>
    </TabButton>
  );
}

// The badge dot fades in and out on tabcnTiming, with no pop; instant with reduce motion on.
const BADGE_FADE_MS = tabcnTiming.duration ?? 200;
const BADGE_EASING = tabcnTiming.easing ?? Easing.linear;
const badgeIn = FadeIn.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);
const badgeOut = FadeOut.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);

const styles = StyleSheet.create({
  // Docked like the app it comes from: full width and flush with the bottom edge, with the
  // background running under the home indicator. Side padding keeps the reference's tab spacing.
  dock: {
    paddingHorizontal: 16,
  },
  bar: { height: 62 },
  capsule: { borderRadius: 999, borderWidth: 1 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 30, height: 30 },
  center: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
});
