/**
 * Segment + Search: a gradient segment control of text tabs with a glass
 * capsule that slides between them, next to a separate round search button.
 *
 * Motion: only the capsule moves, sliding to the tapped tab on `tabcnSpring` (critically
 * damped, no overshoot) when the press is released. Labels stay full white; touch-down on a
 * tab gives a selection haptic and nothing visual. The round button never scales: while it is
 * pressed a faint white highlight fades in (100 ms) and out (200 ms) on the `tabcnTiming`
 * curve. With "reduce motion" on, everything is instant. The round button is the bar's
 * `usePanelAnchor('action')` element, so a `TabPanel` such as Quick Create can open from it.
 *
 * On a narrow screen the gap between the pill and the button narrows first, then the tabs,
 * so the row always fits; where there is room the sizes are exactly as measured.
 * The white labels on the light blue are kept as the reference draws them (low contrast).
 *
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import {
  PressableScale,
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  tabcnTiming,
  usePanelAnchor,
  useTabBar,
} from 'react-native-tabcn';

const defaultColors = {
  /** Top to bottom: a lighter band along the top edge, then the body colour. */
  gradient: ['#a4d2fe', '#86c1fb', '#86c1fb'] as const,
  /** Tab labels (active and inactive alike) and the magnifier. */
  text: '#ffffff',
  /** The glass capsule behind the active tab. */
  capsule: 'rgba(255, 255, 255, 0.2)',
  /** The capsule's thin bright edge. */
  capsuleBorder: 'rgba(255, 255, 255, 0.55)',
  /** The wash over the round button while it is pressed (drawn at 14% opacity). */
  highlight: '#ffffff',
  /** The soft grey shadow the pill and button sit in. */
  shadow: 'rgba(100, 120, 150, 0.34)',
};

export type SegmentSearchColors = typeof defaultColors;

export interface SegmentSearchProps {
  /** Runs when the round button is pressed. */
  onActionPress: () => void;
  /** Screen-reader label for the round button. Default "Search". */
  actionLabel?: string;
  /** Content of the round button. Default: a magnifying glass. */
  actionIcon?: ReactNode;
  colors?: Partial<SegmentSearchColors>;
  /** Selection haptic on tabs, a light impact on the round button. Default true. */
  haptics?: boolean;
}

export function SegmentSearch({
  onActionPress,
  actionLabel = 'Search',
  actionIcon,
  colors: custom,
  haptics = true,
}: SegmentSearchProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs, insets } = useTabBar();
  const window = useWindowDimensions();
  const anchor = usePanelAnchor('action');
  const highlight = useSharedValue(0);
  const highlightStyle = useAnimatedStyle(() => ({ opacity: highlight.value }));

  // Measured sizes where they fit; on a narrow screen the gap gives way first, then the tabs.
  const count = Math.max(1, tabs.length);
  const room = window.width - insets.left - insets.right - EDGE * 2;
  const fixed = LIST_PADDING * 2 + HEIGHT;
  const gap = Math.max(MIN_GAP, Math.min(GAP, room - fixed - TAB * count));
  const tabWidth = Math.max(MIN_TAB, Math.min(TAB, (room - fixed - gap) / count));
  return (
    <TabBarRoot placement="floating" style={[styles.row, { gap }]}>
      <View style={[styles.well, wellShadow(colors.shadow)]}>
        <LinearGradient colors={colors.gradient} locations={GRADIENT_STOPS} style={styles.pill}>
          <TabList style={styles.list}>
            <TabIndicator
              inset={{ x: 0.3, y: 4.5 }}
              style={[
                styles.capsule,
                { backgroundColor: colors.capsule, borderColor: colors.capsuleBorder },
              ]}
            />
            {tabs.map((tab) => (
              <Tab key={tab.key} tab={tab} color={colors.text} width={tabWidth} haptics={haptics} />
            ))}
          </TabList>
        </LinearGradient>
      </View>
      <View style={[styles.well, wellShadow(colors.shadow)]}>
        <PressableScale
          {...anchor}
          scale={1}
          accessibilityLabel={actionLabel}
          onPress={onActionPress}
          onPressIn={() => {
            highlight.value = withTiming(PRESSED_HIGHLIGHT, { ...tabcnTiming, duration: 100 });
            if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          onPressOut={() => {
            highlight.value = withTiming(0, tabcnTiming);
          }}
        >
          <LinearGradient colors={colors.gradient} locations={GRADIENT_STOPS} style={styles.round}>
            <Animated.View
              pointerEvents="none"
              style={[styles.highlight, { backgroundColor: colors.highlight }, highlightStyle]}
            />
            {actionIcon ?? <Magnifier color={colors.text} />}
          </LinearGradient>
        </PressableScale>
      </View>
    </TabBarRoot>
  );
}

/** Both labels stay full white: only the capsule marks the active tab. */
function Tab({
  tab,
  color,
  width,
  haptics,
}: {
  tab: TabItem;
  color: string;
  width: number;
  haptics: boolean;
}) {
  return (
    <TabButton
      tab={tab}
      style={[styles.tab, { width }]}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[styles.label, { color }]}>
        {tab.label}
      </Text>
    </TabButton>
  );
}

function Magnifier({ color }: { color: string }) {
  return (
    <View style={styles.magnifier}>
      <View style={[styles.lens, { borderColor: color }]} />
      <View style={[styles.handle, { backgroundColor: color }]} />
    </View>
  );
}

const HEIGHT = 58;
/** Each tab's measured width, and the least it narrows to on a small screen. */
const TAB = 86;
const MIN_TAB = 64;
/** The measured gap between the pill and the round button, and the least it narrows to. */
const GAP = 89;
const MIN_GAP = 12;
/** The pill's inner padding at each end. */
const LIST_PADDING = 5.2;
/** Space kept from each screen edge when the row has to shrink. */
const EDGE = 16;
const GRADIENT_STOPS = [0, 0.45, 1] as const;
/** Opacity of the white wash over the round button while it is pressed. */
const PRESSED_HIGHLIGHT = 0.14;

/** A soft shadow on every side, a little stronger below: the shapes look set into the page. */
function wellShadow(color: string) {
  return { boxShadow: `0 0 2px ${color}, 0 0 12px 3px ${color}, 0 5px 12px ${color}` };
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  well: { borderRadius: 999 },
  pill: { height: HEIGHT, borderRadius: 999, overflow: 'hidden' },
  list: { flex: 1, alignItems: 'stretch', paddingHorizontal: LIST_PADDING },
  capsule: { borderRadius: 999, borderWidth: 0.8 },
  tab: { justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 15, fontWeight: '500' },
  round: {
    width: HEIGHT,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: HEIGHT / 2,
  },
  magnifier: { width: 18, height: 18 },
  lens: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.4,
  },
  handle: {
    position: 'absolute',
    left: 10.4,
    top: 12.6,
    width: 7.2,
    height: 2.6,
    borderRadius: 1.3,
    transform: [{ rotate: '45deg' }],
  },
});
