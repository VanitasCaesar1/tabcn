/**
 * Sticker Tiles: a teal bar of sticker icons with bold labels. The active tab
 * sits on a light tile that slides between tabs; badges are red dots.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import {
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  tabcnTiming,
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
  /** Label font, e.g. a rounded bold sans. Default: system font, weight 700. */
  fontFamily?: string;
  haptics?: boolean;
}

export function StickerTiles({ colors: custom, fontFamily, haptics = true }: StickerTilesProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="docked" style={[styles.dock, { backgroundColor: colors.background }]}>
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
            entering={badgeIn}
            exiting={badgeOut}
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

// Motion: only the tile moves, sliding on the foundation's default tabcnSpring. Icons and labels
// look the same on every tab, and a press gives a haptic, not a scale. The badge dot fades in and
// out on tabcnTiming, with no pop; with "reduce motion" on, it appears and disappears instantly.
const BADGE_FADE_MS = tabcnTiming.duration ?? 200;
const BADGE_EASING = tabcnTiming.easing ?? Easing.linear;
const badgeIn = FadeIn.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);
const badgeOut = FadeOut.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);

/** The traced stickers' 40-unit box, in points, at the reference's scale. */
const ICON = 33.5;

const styles = StyleSheet.create({
  // Docked like the app it comes from: full width and flush with the bottom edge, with the
  // background running under the home indicator. Side padding keeps the reference's tab spacing.
  dock: {
    paddingHorizontal: 16,
  },
  bar: { height: 68.4, paddingHorizontal: 3.5 },
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
