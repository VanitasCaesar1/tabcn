/**
 * Gradient Stickers: a cream pill with a two-tone glow along its top edge and
 * sticker icons. A soft tinted capsule glides to the active sticker.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { TabBarRoot, TabButton, TabIndicator, type TabItem, TabList, useTabBar } from 'tabcn';

const defaultColors = {
  background: '#fef0c3',
  /** The glow along the top edge, left to right. */
  glow: ['#ffd392', '#ffd392', '#fff5c1', '#dcee82', '#dcee82'] as const,
  rim: 'rgba(255, 250, 214, 0.9)',
  capsule: 'rgba(214, 160, 60, 0.22)',
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
        <View
          style={[styles.pill, { backgroundColor: colors.background, borderColor: colors.rim }]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={colors.glow}
            locations={[0, 0.46, 0.52, 0.57, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.glow}
          >
            <LinearGradient
              colors={[`${colors.background}00`, colors.background]}
              locations={[0.5, 1]}
              style={StyleSheet.absoluteFill}
            />
          </LinearGradient>
          <TabList style={styles.list}>
            <TabIndicator
              inset={{ x: -2.5, y: 0 }}
              style={[styles.capsule, { backgroundColor: colors.capsule }]}
            />
            {tabs.map((tab) => (
              <Tab key={tab.key} tab={tab} badge={colors.badge} haptics={haptics} />
            ))}
          </TabList>
        </View>
      </View>
    </TabBarRoot>
  );
}

function Tab({ tab, badge, haptics }: { tab: TabItem; badge: string; haptics: boolean }) {
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      {tab.renderIcon?.({ focused: tab.focused, color: '#000000', size: ICON })}
      {tab.badge != null ? <View style={[styles.badge, { backgroundColor: badge }]} /> : null}
    </TabButton>
  );
}

/** The traced stickers' 40-unit box, in points, at the reference's scale. */
const ICON = 35.5;

const styles = StyleSheet.create({
  outer: { width: 330, maxWidth: '100%' },
  shadow: { borderRadius: 30, boxShadow: '0 10px 26px rgba(150, 110, 40, 0.22)' },
  pill: {
    borderRadius: 30,
    paddingVertical: 2.5,
    paddingHorizontal: 5,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  glow: { position: 'absolute', left: 0, right: 0, top: 0, height: 15 },
  list: { alignItems: 'stretch' },
  capsule: { borderRadius: 999 },
  tab: { flex: 1, height: 50.5, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 12, right: '22%', width: 10, height: 10, borderRadius: 5 },
});
