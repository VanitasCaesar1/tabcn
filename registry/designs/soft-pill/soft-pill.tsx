/**
 * Soft Pill: a white pill with icons and labels. One grey capsule slides to the
 * active tab on tabcnSpring (no overshoot), and the label turns bold instantly.
 * No press lift or scale: the tab moves only when the press commits.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text } from 'react-native';
import { TabBarRoot, TabButton, TabIndicator, type TabItem, TabList, useTabBar } from 'tabcn';

const defaultColors = {
  background: '#fafafa',
  capsule: '#e5e6e8',
  foreground: '#151517',
};

export type SoftPillColors = typeof defaultColors;

export interface SoftPillProps {
  colors?: Partial<SoftPillColors>;
  haptics?: boolean;
}

export function SoftPill({ colors: custom, haptics = true }: SoftPillProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="floating">
      <TabList style={[styles.pill, { backgroundColor: colors.background }]}>
        <TabIndicator
          inset={CAPSULE_INSET}
          style={[styles.capsule, { backgroundColor: colors.capsule }]}
        />
        {tabs.map((tab) => (
          <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

function Tab({ tab, colors, haptics }: { tab: TabItem; colors: SoftPillColors; haptics: boolean }) {
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      {tab.renderIcon?.({ focused: tab.focused, color: colors.foreground, size: ICON })}
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

/** The traced icons' 40-unit box, in points, at the reference's scale. */
const ICON = 18;
const TAB_WIDTH = 63;
/**
 * The active capsule is wider than its tab and overlaps its neighbours' padding:
 * a negative x inset grows the indicator past the tab's frame (63 + 2 * 3.75 = 70.5 pt).
 */
const CAPSULE_OVERHANG = 3.75;
const CAPSULE_INSET = { x: -CAPSULE_OVERHANG, y: 0 };

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    paddingVertical: 3.8,
    paddingHorizontal: 8,
    boxShadow: '0 10px 28px rgba(60, 40, 20, 0.14)',
  },
  capsule: { borderRadius: 999 },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5.5,
    paddingTop: 2.5,
    width: TAB_WIDTH,
    height: 50.7,
  },
  label: { fontSize: 9.5 },
});
