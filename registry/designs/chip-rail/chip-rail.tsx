/**
 * Chip Rail: a black docked bar with a leading avatar and text-only chips that scroll
 * sideways. A lavender chip slides to the active tab; the rail scrolls it into view.
 * Motion: the chip slides and resizes on tabcnSpring, and each chip's surface and label
 * crossfade on the same spring so a dark label never sits on the bare rail. Nothing scales.
 * With reduce motion on, everything (the rail scroll too) is instant.
 * Glass is opt-in: `material="glass"` (or `"auto"`) turns the black bar into dark Liquid Glass on
 * iOS 26 (expo-glass-effect), under the same chips; the default stays the solid bar.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { type ComponentRef, type ReactNode, useCallback, useEffect, useRef } from 'react';
import { processColor, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  BadgeCount,
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  tabcnSpring,
  useTabBar,
} from 'react-native-tabcn';

const defaultColors = {
  /** The docked bar, running under the home indicator. */
  background: '#070707',
  /** Fill of the inactive chips. */
  chip: '#151515',
  /** 1 pt edge of the inactive chips. */
  chipBorder: '#232323',
  /** The lavender chip that slides to the active tab. */
  active: '#b4a7f9',
  /** The active chip's label. */
  activeText: '#121212',
  /** The inactive chips' labels. */
  text: '#c4c4c4',
  /** Badge fill, drawn only when a tab sets `tabBarBadge`. */
  badge: '#ff4d4d',
  /** Badge count text. */
  badgeText: '#ffffff',
  /**
   * Tint over the Liquid Glass (iOS 26), when `material` asks for glass. Unset, `background`
   * at 60%, so the light chips and labels keep their contrast over light screens (the glass
   * follows what is behind it); `'transparent'` for clear glass.
   */
  glassTint: undefined as string | undefined,
};

export type ChipRailColors = typeof defaultColors;

export interface ChipRailProps {
  /** Content before the chips, e.g. the user's avatar (37 pt circle). */
  leading?: ReactNode;
  colors?: Partial<ChipRailColors>;
  /**
   * The bar's surface: `'solid'` (the black bar it copies), `'glass'` (Liquid Glass, iOS 26),
   * or `'auto'` (glass where the system has it, solid elsewhere). Default `'solid'`.
   */
  material?: 'auto' | 'glass' | 'solid';
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

export function ChipRail({
  leading,
  colors: custom,
  material = 'solid',
  haptics = true,
}: ChipRailProps) {
  const colors = { ...defaultColors, ...custom };
  const glass = material === 'glass' || (material === 'auto' && isLiquidGlassAvailable());
  const { tabs, activeIndex } = useTabBar();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const chips = useRef<Record<number, { x: number; width: number }>>({});
  const rail = useRef({ offset: 0, viewport: 0, content: 0 });
  const reduceMotion = useReducedMotion();

  // Keep the active chip in view. Skip when it is already fully visible, and clamp to the
  // last valid offset so the rail never overscrolls and rubber-bands back.
  const reveal = useCallback(
    (index: number, animated: boolean) => {
      const chip = chips.current[index];
      const { offset, viewport, content } = rail.current;
      if (!chip || viewport <= 0) return;
      if (chip.x >= offset && chip.x + chip.width <= offset + viewport) return;
      const max = Math.max(0, content - viewport);
      const x = Math.min(Math.max(0, chip.x - 60), max);
      scroll.current?.scrollTo({ x, animated: animated && !reduceMotion });
    },
    [reduceMotion],
  );
  useEffect(() => {
    reveal(activeIndex, true);
  }, [activeIndex, reveal]);

  return (
    <TabBarRoot
      placement="docked"
      style={glass ? undefined : { backgroundColor: colors.background }}
    >
      {glass ? (
        // The glass fills the bar and the home-indicator area under it, as the colour did.
        <GlassView
          pointerEvents="none"
          glassEffectStyle="regular"
          colorScheme="dark"
          tintColor={colors.glassTint ?? withAlpha(colors.background, 0.6)}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
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
          // The first layouts (the rail's, its content's, the active chip's) come after the
          // effect above has run, so each one reveals the active chip too: a deep link to a tab
          // past the screen's edge opens with its chip in view, without animating.
          onLayout={(e) => {
            rail.current.viewport = e.nativeEvent.layout.width;
            reveal(activeIndex, false);
          }}
          onContentSizeChange={(width) => {
            rail.current.content = width;
            reveal(activeIndex, false);
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
                  if (tab.index === activeIndex) reveal(activeIndex, false);
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
  // The chip's dark fill draws over the sliding lavender chip (it is inside the button, the
  // lavender is behind the row), so it is only ever visible where the lavender isn't: it clears
  // in the first 15% of the slide as the lavender arrives, and comes back in the last 15% as it
  // leaves. The label changes colour in the middle, when the lavender covers half of it.
  const surface = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15], [1, 0], 'clamp'),
  }));
  // Strings, not `colors`: a worklet that captured the object made on each render would
  // restart its animated style on every render.
  const fromColor = colors.text;
  const toColor = colors.activeText;
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0.35, 0.65], [fromColor, toColor]),
  }));
  return (
    <TabButton
      tab={tab}
      style={styles.chip}
      // 38 pt chips in a 56 pt rail: reach 44 pt without overlapping the next chip.
      hitSlop={HIT_SLOP}
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
      <Animated.Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[styles.label, label]}>
        {tab.label}
      </Animated.Text>
      <Badge badge={tab.badge} colors={colors} />
    </TabButton>
  );
}

/**
 * A badge at the chip's top right, drawn only when the tab sets one: an empty badge ('') is a
 * dot, a number a count. Hidden from screen readers: `TabButton` reads it with the label.
 */
function Badge({ badge, colors }: { badge: TabItem['badge']; colors: ChipRailColors }) {
  if (badge == null) return null;
  const text = String(badge).trim();
  if (!text) {
    return (
      <View
        style={[styles.dot, { backgroundColor: colors.badge, borderColor: colors.background }]}
      />
    );
  }
  const textStyle = [styles.badgeText, { color: colors.badgeText }];
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.count, { backgroundColor: colors.badge, borderColor: colors.background }]}
    >
      {typeof badge === 'number' ? (
        <BadgeCount value={badge} textStyle={textStyle} />
      ) : (
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={[textStyle, styles.badgeTextCap]}
        >
          {text}
        </Text>
      )}
    </View>
  );
}

const HIT_SLOP = { top: 3, bottom: 3 };

/** `color` at `alpha` opacity (React Native's parser, so any colour format works). */
function withAlpha(color: string, alpha: number): string {
  const v = processColor(color);
  if (typeof v !== 'number') return color;
  return `rgba(${(v >>> 16) & 255}, ${(v >>> 8) & 255}, ${v & 255}, ${alpha})`;
}

const styles = StyleSheet.create({
  // A text badge stays on one line and stops growing at this width, ending in an ellipsis.
  badgeTextCap: { maxWidth: 56 },
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
  // The vertical padding keeps the chips' hit slop and badges inside the scroll view's clip;
  // the rail centres it, so the chips don't move.
  scroll: { paddingRight: 8, paddingVertical: 6 },
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
  dot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  count: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 13, fontWeight: '700' },
});
