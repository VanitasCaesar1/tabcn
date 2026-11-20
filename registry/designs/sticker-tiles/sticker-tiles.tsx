/**
 * Sticker Tiles: a teal bar of sticker icons with bold labels. The active tab
 * sits on a light tile that slides between tabs; badges are red dots.
 * Built on tabcn: https://github.com/OWNER/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { TabBarRoot, TabButton, TabIndicator, type TabItem, TabList, useTabBar } from 'tabcn';

const defaultColors = {
  background: '#27799f',
  tile: 'rgba(255, 255, 255, 0.33)',
  label: '#ffffff',
  badge: '#ff4d57',
};

export type StickerTilesColors = typeof defaultColors;

export interface StickerTilesProps {
  colors?: Partial<StickerTilesColors>;
  /** Label font, e.g. a rounded bold sans. Default: system font, weight 700. */
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
          inset={{ x: 0, y: 3.9 }}
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
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View>
        {tab.renderIcon?.({ focused: tab.focused, color: colors.label, size: ICON })}
        {tab.badge != null ? (
          <Animated.View
            entering={ZoomIn.springify().dampingRatio(0.8).duration(320)}
            style={[styles.badge, { backgroundColor: colors.badge }]}
          />
        ) : null}
      </View>
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

/** The traced stickers' 40-unit box, in points, at the reference's scale. */
const ICON = 33.5;

const styles = StyleSheet.create({
  outer: { width: 370, maxWidth: '100%' },
  bar: { height: 68.4, borderRadius: 14, borderCurve: 'continuous', paddingHorizontal: 3.5 },
  tile: { borderRadius: 16, borderCurve: 'continuous' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1, paddingTop: 1 },
  label: { fontSize: 10.6 },
  systemWeight: { fontWeight: '700' },
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
