/**
 * Playful Tiles: a white bar with a colour per tab; a bordered tile slides to
 * the active tab.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
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
    <TabBarRoot placement="docked" style={[styles.dock, { backgroundColor: colors.background }]}>
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
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : undefined}
    >
      {tab.renderIcon?.({ focused: true, color, size: 36 })}
      {tab.badge != null ? <View style={[styles.badge, { backgroundColor: badgeColor }]} /> : null}
    </TabButton>
  );
}

const styles = StyleSheet.create({
  // Docked like the app it comes from: full width and flush with the bottom edge, with the
  // background running under the home indicator. Side padding keeps the reference's tab spacing.
  dock: {
    paddingHorizontal: 16,
    boxShadow: '0 -6px 24px rgba(0, 0, 0, 0.08)',
  },
  bar: {
    height: 66,
  },
  tile: { borderRadius: 12, borderWidth: 2.5 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 16, right: '24%', width: 10, height: 10, borderRadius: 5 },
});
