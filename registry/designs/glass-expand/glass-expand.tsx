/**
 * Glass Expand: a frosted lavender pill of icon-only tabs. The active tab grows
 * into a glass capsule that reveals its label. The capsule glides and resizes on
 * one eased curve, and the label fades in once it has room.
 * Built on tabcn: https://github.com/OWNER/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { TabBarRoot, TabButton, TabIndicator, type TabItem, TabList, useTabBar } from 'tabcn';

const defaultColors = {
  background: '#bbb3fe',
  border: 'rgba(255, 255, 255, 0.55)',
  capsule: '#afa8ec',
  capsuleBorder: 'rgba(255, 255, 255, 0.5)',
  foreground: '#0d0d12',
};

export type GlassExpandColors = typeof defaultColors;

export interface GlassExpandProps {
  colors?: Partial<GlassExpandColors>;
  haptics?: boolean;
}

/**
 * One critically damped spring (no overshoot) for the resize and the slide, so the capsule
 * and the tabs move together and settle without a wobble.
 */
const DURATION = 340;
const layout = LinearTransition.springify()
  .duration(DURATION)
  .dampingRatio(1)
  .reduceMotion(ReduceMotion.System);
const slide = { duration: DURATION, dampingRatio: 1, reduceMotion: ReduceMotion.System };

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
            spring={slide}
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
      {tab.renderIcon?.({ focused: tab.focused, color: colors.foreground, size: ICON })}
      {tab.focused ? (
        <Animated.Text
          entering={FadeIn.duration(180).delay(120).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(90).reduceMotion(ReduceMotion.System)}
          numberOfLines={1}
          style={[styles.label, { color: colors.foreground }]}
        >
          {tab.label}
        </Animated.Text>
      ) : null}
    </TabButton>
  );
}

/** The traced icons' 40-unit box, in points, at the reference's scale. */
const ICON = 30.2;

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    padding: 3,
    boxShadow: '0 6px 18px rgba(20, 10, 110, 0.28)',
  },
  list: { alignItems: 'center' },
  capsule: { borderRadius: 999, borderWidth: 1 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 62,
    paddingHorizontal: 22.5,
  },
  tabFocused: { paddingHorizontal: 34 },
  label: { fontSize: 13.5, fontWeight: '500' },
});
