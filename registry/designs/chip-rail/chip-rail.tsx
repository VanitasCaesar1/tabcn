/**
 * Chip Rail: a black docked bar with a leading avatar and text-only chips that scroll
 * sideways. A lavender chip slides to the active tab; the rail scrolls it into view.
 * Motion: the chip slides and resizes on tabcnSpring, and each chip's surface and label
 * crossfade on the same spring so a dark label never sits on the bare rail. Nothing scales.
 * With reduce motion on, everything (the rail scroll too) is instant.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { type ComponentRef, type ReactNode, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
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
  const chips = useRef<Record<number, { x: number; width: number }>>({});
  const rail = useRef({ offset: 0, viewport: 0, content: 0 });
  const reduceMotion = useReducedMotion();

  // Keep the active chip in view. Skip when it is already fully visible, and clamp to the
  // last valid offset so the rail never overscrolls and rubber-bands back.
  useEffect(() => {
    const chip = chips.current[activeIndex];
    const { offset, viewport, content } = rail.current;
    if (!chip || viewport <= 0) return;
    if (chip.x >= offset && chip.x + chip.width <= offset + viewport) return;
    const max = Math.max(0, content - viewport);
    const x = Math.min(Math.max(0, chip.x - 60), max);
    scroll.current?.scrollTo({ x, animated: !reduceMotion });
  }, [activeIndex, reduceMotion]);

  return (
    <TabBarRoot placement="docked" style={{ backgroundColor: colors.background }}>
      <View style={styles.rail}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <ScrollView
          ref={scroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          scrollEventThrottle={16}
          onScroll={(e) => {
            rail.current.offset = e.nativeEvent.contentOffset.x;
          }}
          onLayout={(e) => {
            rail.current.viewport = e.nativeEvent.layout.width;
          }}
          onContentSizeChange={(width) => {
            rail.current.content = width;
          }}
        >
          <TabList style={styles.list}>
            <TabIndicator style={[styles.chip, { backgroundColor: colors.active }]} />
            {tabs.map((tab) => (
              <Chip
                key={tab.key}
                tab={tab}
                colors={colors}
                haptics={haptics}
                onFrame={(x, width) => {
                  chips.current[tab.index] = { x, width };
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
  onFrame,
}: {
  tab: TabItem;
  colors: ChipRailColors;
  haptics: boolean;
  onFrame: (x: number, width: number) => void;
}) {
  // Same spring as the lavender chip, so the surface and label change in step with it.
  // Critically damped with overshoot clamped: progress never passes 0 or 1.
  const progress = useSharedValue(tab.focused ? 1 : 0);
  useEffect(() => {
    progress.value = withSpring(tab.focused ? 1 : 0, tabcnSpring);
  }, [tab.focused, progress]);
  const surface = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.text, colors.activeText]),
  }));
  return (
    <TabButton
      tab={tab}
      style={styles.chip}
      onLayout={(e) => onFrame(e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
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
