/**
 * Chip Rail: a black docked bar with a leading avatar and text-only chips that scroll
 * sideways. A lavender chip slides to the active tab; the rail scrolls it into view.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { type ComponentRef, type ReactNode, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';
import {
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  useFocusProgress,
  useTabBar,
} from 'tabcn';

const defaultColors = {
  background: '#070707',
  chip: '#151515',
  chipBorder: '#232323',
  active: '#b4a7f9',
  activeText: '#121212',
  text: '#c4c4c4',
};

export type ChipRailColors = typeof defaultColors;

export interface ChipRailProps {
  /** Content before the chips, e.g. the user's avatar (37 pt circle). */
  leading?: ReactNode;
  colors?: Partial<ChipRailColors>;
  haptics?: boolean;
}

export function ChipRail({ leading, colors: custom, haptics = true }: ChipRailProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs, activeIndex } = useTabBar();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const offsets = useRef<Record<number, number>>({});

  useEffect(() => {
    const x = offsets.current[activeIndex];
    if (x != null) scroll.current?.scrollTo({ x: Math.max(0, x - 60), animated: true });
  }, [activeIndex]);

  return (
    <TabBarRoot placement="docked" style={{ backgroundColor: colors.background }}>
      <View style={styles.rail}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <ScrollView
          ref={scroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <TabList style={styles.list}>
            <TabIndicator style={[styles.chip, { backgroundColor: colors.active }]} />
            {tabs.map((tab) => (
              <Chip
                key={tab.key}
                tab={tab}
                colors={colors}
                haptics={haptics}
                onX={(x) => {
                  offsets.current[tab.index] = x;
                }}
              />
            ))}
          </TabList>
        </ScrollView>
      </View>
    </TabBarRoot>
  );
}

function Chip({
  tab,
  colors,
  haptics,
  onX,
}: {
  tab: TabItem;
  colors: ChipRailColors;
  haptics: boolean;
  onX: (x: number) => void;
}) {
  const progress = useFocusProgress(tab);
  const surface = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.text, colors.activeText]),
  }));
  return (
    <TabButton
      tab={tab}
      style={styles.chip}
      onLayout={(e) => onX(e.nativeEvent.layout.x)}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.chipSurface,
          { backgroundColor: colors.chip, borderColor: colors.chipBorder },
          surface,
        ]}
      />
      <Animated.Text numberOfLines={1} style={[styles.label, label]}>
        {tab.label}
      </Animated.Text>
    </TabButton>
  );
}

const styles = StyleSheet.create({
  // Docked like Phantom's own bar: full width and flush with the bottom edge, with the dark
  // background running under the home indicator.
  rail: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    overflow: 'hidden',
  },
  leading: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    marginRight: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingRight: 8 },
  list: { gap: 8, alignItems: 'center' },
  chip: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 13.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSurface: { borderRadius: 19, borderWidth: 1 },
  label: { fontSize: 15.3, fontWeight: '500' },
});
