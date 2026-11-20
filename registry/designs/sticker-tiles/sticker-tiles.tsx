/**
 * Sticker Tiles: a teal bar of sticker icons with bold labels. The active tab
 * sits on a light tile that slides between tabs; badges are red dots.
 * Built on tabcn: https://github.com/OWNER/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, ZoomIn } from 'react-native-reanimated';
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
  background: '#27799f',
  tile: 'rgba(255, 255, 255, 0.33)',
  label: '#ffffff',
  badge: '#ff4d57',
};

export type StickerTilesColors = typeof defaultColors;

export interface StickerTilesProps {
  colors?: Partial<StickerTilesColors>;
  /** Label font, e.g. a rounded heavy sans. Default: system font, weight 800. */
  fontFamily?: string;
  haptics?: boolean;
}

export function StickerTiles({ colors: custom, fontFamily, haptics = true }: StickerTilesProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="floating" style={styles.outer}>
      <TabList style={[styles.bar, { backgroundColor: colors.background }]}>
        <TabIndicator
          inset={{ x: 1.5, y: 4 }}
          style={[styles.tile, { backgroundColor: colors.tile }]}
        />
        {tabs.map((tab) => (
          <Tab key={tab.key} tab={tab} colors={colors} fontFamily={fontFamily} haptics={haptics} />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

function Tab({
  tab,
  colors,
  fontFamily,
  haptics,
}: {
  tab: TabItem;
  colors: StickerTilesColors;
  fontFamily?: string;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  const icon = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 0.5, 1], [1, 1.12, 1.04]) }],
  }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      scale={0.92}
      onPressIn={haptics ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : undefined}
    >
      <Animated.View style={icon}>
        {tab.renderIcon?.({ focused: tab.focused, color: colors.label, size: 40 })}
        {tab.badge != null ? (
          <Animated.View
            entering={ZoomIn.springify()}
            style={[styles.badge, { backgroundColor: colors.badge }]}
          />
        ) : null}
      </Animated.View>
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          { color: colors.label },
          fontFamily ? { fontFamily } : styles.systemWeight,
        ]}
      >
        {tab.label}
      </Text>
    </TabButton>
  );
}

const styles = StyleSheet.create({
  outer: { width: 371, maxWidth: '100%' },
  bar: { height: 68, borderRadius: 13, paddingHorizontal: 4 },
  tile: { borderRadius: 14 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 0 },
  label: { fontSize: 12.5 },
  systemWeight: { fontWeight: '800' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});
