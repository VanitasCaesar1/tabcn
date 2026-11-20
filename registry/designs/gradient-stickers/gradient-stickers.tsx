/**
 * Gradient Stickers: a warm gradient pill of sticker icons. The active sticker
 * sits in a soft circle that slides between tabs, and the sticker pops.
 * Built on tabcn: https://github.com/OWNER/tabcn
 */
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import {
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  useFocusProgress,
  useTabBar,
} from 'tabcn';

const defaultColors = {
  gradient: ['#ffd49a', '#fff3be', '#fff0b0', '#e3f19a'] as const,
  highlight: 'rgba(255, 255, 255, 0.55)',
  bubble: 'rgba(214, 178, 104, 0.32)',
  badge: '#ff4b4b',
};

export type GradientStickersColors = typeof defaultColors;

export interface GradientStickersProps {
  colors?: Partial<GradientStickersColors>;
  haptics?: boolean;
}

export function GradientStickers({ colors: custom, haptics = true }: GradientStickersProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="floating" style={styles.outer}>
      <View style={styles.shadow}>
        <LinearGradient
          colors={colors.gradient}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.pill}
        >
          <View
            pointerEvents="none"
            style={[styles.shine, { backgroundColor: colors.highlight }]}
          />
          <TabList style={styles.list}>
            <TabIndicator
              inset={{ x: 8, y: 6 }}
              style={[styles.bubble, { backgroundColor: colors.bubble }]}
            />
            {tabs.map((tab) => (
              <Tab key={tab.key} tab={tab} badge={colors.badge} haptics={haptics} />
            ))}
          </TabList>
        </LinearGradient>
      </View>
    </TabBarRoot>
  );
}

function Tab({ tab, badge, haptics }: { tab: TabItem; badge: string; haptics: boolean }) {
  const progress = useFocusProgress(tab);
  const sticker = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 0.6, 1], [1, 1.16, 1.08]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, -6])}deg` },
    ],
  }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      scale={0.9}
      onPressIn={haptics ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : undefined}
    >
      <Animated.View style={sticker}>
        {tab.renderIcon?.({ focused: tab.focused, color: '#000000', size: 46 })}
      </Animated.View>
      {tab.badge != null ? <View style={[styles.badge, { backgroundColor: badge }]} /> : null}
    </TabButton>
  );
}

const styles = StyleSheet.create({
  outer: { alignSelf: 'stretch', paddingHorizontal: 20 },
  shadow: { borderRadius: 40, boxShadow: '0 10px 26px rgba(150, 110, 40, 0.22)' },
  pill: { borderRadius: 40, padding: 4, overflow: 'hidden' },
  shine: { position: 'absolute', left: 24, right: 24, top: 3, height: 10, borderRadius: 999 },
  list: { alignItems: 'stretch' },
  bubble: { borderRadius: 999 },
  tab: { flex: 1, height: 72, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 12, right: '22%', width: 10, height: 10, borderRadius: 5 },
});
