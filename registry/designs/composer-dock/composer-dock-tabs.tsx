/**
 * Composer Dock's tabs: an icon tab with the soft glass capsule it gets while held, and the
 * dark pill that names the tab under a scrubbing finger. Part of the Composer Dock design
 * (composer-dock.tsx). Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { GlassView } from 'expo-glass-effect';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { I18nManager, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TabButton, type TabItem, useTabIndicator } from 'react-native-tabcn';
import {
  type ComposerDockColors,
  type ComposerDockLabels,
  type Frame,
  fade,
  GLASS_STYLE,
  measure,
} from './composer-dock-theme';

/** The icon's box, which the held capsule reaches just past: narrower only in a crowded row. */
const ICON_BOX = 60;

export function DockTab({
  tab,
  colors,
  labels,
  lit,
  held,
  onHold,
  register,
  glass,
  width,
}: {
  tab: TabItem;
  colors: ComposerDockColors;
  labels: ComposerDockLabels;
  lit: boolean;
  held: boolean;
  /** The held tab's capsule is Liquid Glass, as in the app. */
  glass: boolean;
  onHold?: (tab: TabItem, anchor: Frame) => void;
  /** Hands the dock this tab's icon, which its menu opens from. */
  register: (key: string, node: ComponentRef<typeof View> | null) => void;
  /** The tab's width: TAB_WIDTH, narrowed so every tab fits the row. */
  width: number;
}) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const square = useSharedValue(held ? 1 : 0);
  useEffect(() => {
    square.value = withTiming(held ? 1 : 0, fade);
  }, [held, square]);
  const squareStyle = useAnimatedStyle(() => ({ opacity: square.value }));
  const color = lit ? colors.foreground : colors.muted;

  const open = () => {
    if (onHold) measure(ref, (frame) => onHold(tab, frame));
  };
  return (
    <TabButton
      tab={tab}
      style={[styles.tab, { width }]}
      // Touch holds are handled by the row's hold gesture (see ComposerDock); this long press is
      // the screen readers' way in.
      onLongPress={onHold ? open : undefined}
      accessibilityActions={onHold ? [{ name: 'longpress', label: labels.showRecent }] : undefined}
    >
      <View
        ref={(node) => {
          ref.current = node;
          register(tab.key, node);
        }}
        collapsable={false}
        style={[styles.iconBox, { width: Math.min(ICON_BOX, width) }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.heldCapsule, glass ? null : { backgroundColor: colors.held }, squareStyle]}
        >
          {glass ? (
            <GlassView
              glassEffectStyle={GLASS_STYLE}
              tintColor={colors.heldGlassTint}
              style={[StyleSheet.absoluteFill, styles.heldGlass]}
            />
          ) : null}
        </Animated.View>
        {tab.renderIcon?.({ focused: tab.focused, color, size: 20 })}
      </View>
    </TabButton>
  );
}

/** The dark pill over the tab under the finger. It rides on the scrub indicator. */
export function ScrubLabel({ tab, colors }: { tab: TabItem | null; colors: ComposerDockColors }) {
  const { x, width } = useTabIndicator();
  // Keeps the last name while the pill fades out.
  const [text, setText] = useState(tab?.label ?? '');
  if (tab && tab.label !== text) setText(tab.label);
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = withTiming(tab ? 1 : 0, fade);
  }, [tab, shown]);
  // A zero-width track moved to the tab's centre: the pill centres on it with no layout per
  // frame (animating the track's width re-laid it out on every frame of a scrub).
  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateX: x.value + width.value / 2 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.labelTrack, PHYSICAL_LEFT, style]}
    >
      <View style={[styles.labelPill, { backgroundColor: colors.label }]}>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={[styles.labelText, { color: colors.labelText }]}
        >
          {text}
        </Text>
      </View>
    </Animated.View>
  );
}

/**
 * The scrub frame's x is measured from the row's physical left edge, but in a right-to-left
 * layout React Native reads `left` as the start edge (the right) unless the app turned that
 * swap off. Pin the pill to the physical left either way, so its translateX lands on the tab.
 */
const PHYSICAL_LEFT =
  I18nManager.isRTL && (I18nManager.getConstants?.().doLeftAndRightSwapInRTL ?? true)
    ? { right: 0 }
    : { left: 0 };

const styles = StyleSheet.create({
  tab: { alignItems: 'center', justifyContent: 'center' },
  iconBox: { height: 42, alignItems: 'center', justifyContent: 'center' },
  // Wider than the icon box: it reaches past it, as the app's does.
  heldCapsule: {
    position: 'absolute',
    left: -2,
    right: -2,
    top: -3,
    bottom: -3,
    borderRadius: 24,
    borderCurve: 'continuous',
  },
  heldGlass: { borderRadius: 24 },
  labelTrack: {
    position: 'absolute',
    top: -20,
    width: 0,
    alignItems: 'center',
    overflow: 'visible',
  },
  labelPill: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: { fontSize: 12, fontWeight: '600' },
});
