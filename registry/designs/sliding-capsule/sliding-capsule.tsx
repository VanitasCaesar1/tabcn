/**
 * Sliding Capsule: a white floating pill with icons and labels; a grey capsule
 * slides to the active tab. Built on tabcn: https://github.com/OWNER/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import { TabBarRoot, TabButton, TabIndicator, type TabItem, TabList, useTabBar } from 'tabcn';

const defaultColors = {
  background: '#ffffff',
  capsule: '#ececee',
  foreground: '#111114',
  badge: '#ff3b30',
};

export type SlidingCapsuleColors = typeof defaultColors;

export interface SlidingCapsuleProps {
  colors?: Partial<SlidingCapsuleColors>;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

export function SlidingCapsule({ colors: custom, haptics = true }: SlidingCapsuleProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();

  return (
    <TabBarRoot placement="floating">
      <TabList style={[styles.pill, { backgroundColor: colors.background }]}>
        <TabIndicator inset={5} style={[styles.capsule, { backgroundColor: colors.capsule }]} />
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
  colors: SlidingCapsuleColors;
  haptics: boolean;
}) {
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View>
        {tab.renderIcon?.({ focused: tab.focused, color: colors.foreground, size: 21 })}
        {tab.badge != null ? (
          <Animated.View
            entering={ZoomIn.springify()}
            exiting={ZoomOut}
            style={[styles.badge, { backgroundColor: colors.badge }]}
          >
            <Text style={styles.badgeText}>{tab.badge}</Text>
          </Animated.View>
        ) : null}
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          { color: colors.foreground, fontWeight: tab.focused ? '700' : '500' },
        ]}
      >
        {tab.label}
      </Text>
    </TabButton>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    padding: 0,
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.14)',
  },
  capsule: {
    borderRadius: 999,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    width: 82.5,
    height: 58.5,
  },
  label: {
    fontSize: 10.5,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
