/**
 * Mono Type: a white bar with line icons and uppercase monospace labels; the
 * active tab takes the accent colour and its label letter-spacing widens.
 * Built on tabcn: https://github.com/OWNER/tabcn
 */
import * as Haptics from 'expo-haptics';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle } from 'react-native-reanimated';
import { TabBarRoot, TabButton, type TabItem, TabList, useFocusProgress, useTabBar } from 'tabcn';

const defaultColors = {
  background: '#ffffff',
  accent: '#d61fc8',
  foreground: '#1a1a1a',
  badge: '#d61fc8',
};

export type MonoTypeColors = typeof defaultColors;

export interface MonoTypeProps {
  colors?: Partial<MonoTypeColors>;
  haptics?: boolean;
}

const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

export function MonoType({ colors: custom, haptics = true }: MonoTypeProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="floating" style={styles.outer}>
      <TabList style={[styles.bar, { backgroundColor: colors.background }]}>
        {tabs.map((tab) => (
          <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

function Tab({ tab, colors, haptics }: { tab: TabItem; colors: MonoTypeColors; haptics: boolean }) {
  const progress = useFocusProgress(tab);
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.foreground, colors.accent]),
    letterSpacing: interpolate(progress.value, [0, 1], [0.5, 1.5]),
  }));
  const plain = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const accent = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.iconBox}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, plain]}>
          {tab.renderIcon?.({ focused: false, color: colors.foreground, size: 30 })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, accent]}>
          {tab.renderIcon?.({ focused: false, color: colors.accent, size: 30 })}
        </Animated.View>
        {tab.badge != null ? (
          <View style={[styles.badge, { backgroundColor: colors.badge }]} />
        ) : null}
      </View>
      <Animated.Text numberOfLines={1} style={[styles.label, { fontFamily: mono }, label]}>
        {tab.label.toUpperCase()}
      </Animated.Text>
    </TabButton>
  );
}

const styles = StyleSheet.create({
  outer: { alignSelf: 'stretch', paddingHorizontal: 16 },
  bar: {
    borderRadius: 20,
    paddingVertical: 12,
    boxShadow: '0 8px 26px rgba(0, 0, 0, 0.12)',
  },
  tab: { flex: 1, alignItems: 'center', gap: 6 },
  iconBox: { width: 34, height: 34 },
  center: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13 },
  badge: { position: 'absolute', top: 0, right: -2, width: 8, height: 8, borderRadius: 4 },
});
