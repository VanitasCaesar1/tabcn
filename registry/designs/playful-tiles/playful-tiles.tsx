/**
 * Playful Tiles: a white bar with a colour per tab; a bordered tile slides to
 * the active tab and its icon bounces.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { TabBarRoot, TabButton, TabIndicator, type TabItem, TabList, useTabBar } from 'tabcn';

const defaultColors = {
  background: '#ffffff',
  tile: '#e3f4ff',
  tileBorder: '#8fd3ff',
  badge: '#ff4b4b',
};

/** Icon colour per tab position; cycles when there are more tabs. */
const defaultTabColors = ['#ff9600', '#ffc800', '#ce82ff', '#ff86d0', '#1cb0f6', '#58cc02'];

export type PlayfulTilesColors = typeof defaultColors;

export interface PlayfulTilesProps {
  colors?: Partial<PlayfulTilesColors>;
  tabColors?: string[];
  haptics?: boolean;
}

export function PlayfulTiles({
  colors: custom,
  tabColors = defaultTabColors,
  haptics = true,
}: PlayfulTilesProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="floating" style={styles.outer}>
      <TabList style={[styles.bar, { backgroundColor: colors.background }]}>
        <TabIndicator
          inset={{ x: 9, y: 11 }}
          style={[styles.tile, { backgroundColor: colors.tile, borderColor: colors.tileBorder }]}
        />
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            tab={tab}
            color={tabColors[tab.index % tabColors.length] ?? '#1cb0f6'}
            badgeColor={colors.badge}
            haptics={haptics}
          />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

function Tab({
  tab,
  color,
  badgeColor,
  haptics,
}: {
  tab: TabItem;
  color: string;
  badgeColor: string;
  haptics: boolean;
}) {
  const bounce = useSharedValue(0);
  useEffect(() => {
    if (tab.focused) {
      bounce.value = withSequence(
        withTiming(-3, { duration: 110, reduceMotion: ReduceMotion.System }),
        withSpring(0, { damping: 18, stiffness: 300, reduceMotion: ReduceMotion.System }),
      );
    }
  }, [tab.focused, bounce]);
  const icon = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      scale={0.94}
      onPressIn={haptics ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : undefined}
    >
      <Animated.View style={icon}>
        {tab.renderIcon?.({ focused: true, color, size: 36 })}
      </Animated.View>
      {tab.badge != null ? <View style={[styles.badge, { backgroundColor: badgeColor }]} /> : null}
    </TabButton>
  );
}

const styles = StyleSheet.create({
  outer: { alignSelf: 'stretch', paddingHorizontal: 16 },
  bar: {
    height: 66,
    borderRadius: 20,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.10)',
  },
  tile: { borderRadius: 12, borderWidth: 2.5 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 16, right: '24%', width: 10, height: 10, borderRadius: 5 },
});
