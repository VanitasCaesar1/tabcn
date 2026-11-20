/**
 * Outline Dark: the Blank Spaces app's tab bar. A row of icons straight on the
 * black screen: no labels, no container, border, blur or indicator. Idle tabs
 * are grey outline glyphs; the active tab crossfades to the white filled glyph
 * (outline lock to solid lock, as in the app). Docked and flush with the
 * bottom; the outer icons sit 70 pt in from the edges and the rest are spread
 * evenly between them.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { TabBarRoot, TabButton, type TabItem, TabList, useFocusProgress, useTabBar } from 'tabcn';

const defaultColors = {
  /** The screen colour: the bar has no surface of its own. */
  background: '#000000',
  /** Active glyph. */
  icon: '#ffffff',
  /** Idle glyphs: measured about #8e8e8e to #919191 (the system grey). */
  inactive: '#8e8e93',
  badge: '#ff453a',
};

export type OutlineDarkColors = typeof defaultColors;

export interface OutlineDarkProps {
  colors?: Partial<OutlineDarkColors>;
  haptics?: boolean;
}

export function OutlineDark({ colors: custom, haptics = true }: OutlineDarkProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="docked" style={{ backgroundColor: colors.background }}>
      <TabList style={styles.bar}>
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
  colors: OutlineDarkColors;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  const idle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const active = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.iconBox}>
        <Animated.View style={[StyleSheet.absoluteFill, idle]}>
          {tab.renderIcon?.({ focused: false, color: colors.inactive, size: ICON })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, active]}>
          {tab.renderIcon?.({ focused: true, color: colors.icon, size: ICON })}
        </Animated.View>
        {tab.badge != null ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.badge, borderColor: colors.background },
            ]}
          />
        ) : null}
      </View>
    </TabButton>
  );
}

// Measured on the app's iPad screenshots at 1.578 px/pt (an 834 pt wide screen).
/** The icons' 40-unit box, in points: glyphs draw about 20 to 22 pt, as in the app. */
const ICON = 24;
/** Icon centres sit 40 pt above the bottom safe area and 56 pt below the content. */
const BAR_HEIGHT = 80;
/** Tap target width of each tab. */
const TAB_WIDTH = 64;
/** The outer icon centres sit 70 pt from the screen edges. */
const EDGE_TO_CENTRE = 70;

const styles = StyleSheet.create({
  // Side padding lives on the row: TabBarRoot sets the dock's left/right padding to the safe area.
  bar: {
    height: BAR_HEIGHT,
    paddingHorizontal: EDGE_TO_CENTRE - TAB_WIDTH / 2,
    justifyContent: 'space-between',
  },
  tab: { width: TAB_WIDTH, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: ICON, height: ICON },
  badge: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
});
