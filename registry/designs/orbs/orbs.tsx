/**
 * Orbs: separate floating circles instead of a bar. Each inactive tab is its
 * icon art (a round sticker); the active one grows into a larger white orb. Badges are
 * glossy red balls.
 * Built on tabcn: https://github.com/OWNER/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, ZoomIn } from 'react-native-reanimated';
import { TabBarRoot, TabButton, type TabItem, TabList, useFocusProgress, useTabBar } from 'tabcn';

const defaultColors = {
  active: '#ffffff',
  badge: '#f0151c',
};

export type OrbsColors = typeof defaultColors;

export interface OrbsProps {
  colors?: Partial<OrbsColors>;
  haptics?: boolean;
}

const SMALL = 60;
const LARGE = 68;

export function Orbs({ colors: custom, haptics = true }: OrbsProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="floating">
      <TabList style={styles.list}>
        {tabs.map((tab) => (
          <Orb key={tab.key} tab={tab} colors={colors} haptics={haptics} />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

function Orb({ tab, colors, haptics }: { tab: TabItem; colors: OrbsColors; haptics: boolean }) {
  const progress = useFocusProgress(tab);
  const size = useAnimatedStyle(() => {
    const d = interpolate(progress.value, [0, 1], [SMALL, LARGE]);
    return { width: d, height: d, borderRadius: d / 2 };
  });
  const white = useAnimatedStyle(() => ({ opacity: progress.value }));
  const icon = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 0.72]) }],
  }));
  return (
    <TabButton
      tab={tab}
      style={styles.slot}
      scale={0.92}
      onPressIn={
        haptics ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) : undefined
      }
    >
      <Animated.View style={[styles.orb, size]}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.active }, white]}
        />
        <Animated.View style={icon}>
          {tab.renderIcon?.({ focused: tab.focused, color: colors.active, size: SMALL * 1.08 })}
        </Animated.View>
      </Animated.View>
      {tab.badge != null ? (
        <Animated.View
          entering={ZoomIn.springify()}
          style={[styles.badge, { backgroundColor: colors.badge }]}
        >
          <Animated.View style={styles.gloss} />
        </Animated.View>
      ) : null}
    </TabButton>
  );
}

const styles = StyleSheet.create({
  list: { alignItems: 'center', gap: 30, paddingVertical: 4 },
  slot: { width: LARGE, height: LARGE, alignItems: 'center', justifyContent: 'center' },
  orb: {
    boxShadow: '0 6px 16px rgba(120, 90, 40, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
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
