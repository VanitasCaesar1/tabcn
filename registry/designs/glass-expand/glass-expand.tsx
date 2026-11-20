/**
 * Glass Expand: a frosted lavender pill of icon-only tabs. The active tab grows
 * into a glass capsule that reveals its label; the capsule springs to fit.
 * Built on tabcn: https://github.com/OWNER/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import {
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  tabcnSpring,
  useTabBar,
} from 'tabcn';

const defaultColors = {
  background: 'rgba(196, 189, 255, 0.94)',
  border: 'rgba(255, 255, 255, 0.75)',
  capsule: 'rgba(150, 138, 235, 0.38)',
  capsuleBorder: 'rgba(255, 255, 255, 0.7)',
  foreground: '#0d0d12',
};

export type GlassExpandColors = typeof defaultColors;

export interface GlassExpandProps {
  colors?: Partial<GlassExpandColors>;
  haptics?: boolean;
}

const layout = LinearTransition.springify().damping(20).stiffness(220);

export function GlassExpand({ colors: custom, haptics = true }: GlassExpandProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="floating">
      <Animated.View
        layout={layout}
        style={[styles.pill, { backgroundColor: colors.background, borderColor: colors.border }]}
      >
        <TabList style={styles.list}>
          <TabIndicator
            inset={{ x: 0, y: 0 }}
            spring={tabcnSpring}
            style={[
              styles.capsule,
              { backgroundColor: colors.capsule, borderColor: colors.capsuleBorder },
            ]}
          />
          {tabs.map((tab) => (
            <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
          ))}
        </TabList>
      </Animated.View>
    </TabBarRoot>
  );
}

function Tab({
  tab,
  colors,
  haptics,
}: {
  tab: TabItem;
  colors: GlassExpandColors;
  haptics: boolean;
}) {
  return (
    <TabButton
      tab={tab}
      layout={layout}
      style={[styles.tab, tab.focused && styles.tabFocused]}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      {tab.renderIcon?.({ focused: tab.focused, color: colors.foreground, size: 30 })}
      {tab.focused ? (
        <Animated.Text
          entering={FadeIn.duration(200).delay(60)}
          exiting={FadeOut.duration(120)}
          numberOfLines={1}
          style={[styles.label, { color: colors.foreground }]}
        >
          {tab.label}
        </Animated.Text>
      ) : null}
    </TabButton>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    borderWidth: 1.5,
    padding: 5,
    boxShadow: '0 10px 30px rgba(20, 10, 120, 0.35)',
  },
  list: { alignItems: 'center' },
  capsule: { borderRadius: 999, borderWidth: 1.5 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    minWidth: 74,
    paddingHorizontal: 18,
  },
  tabFocused: { paddingHorizontal: 26 },
  label: { fontSize: 14, fontWeight: '500' },
});
