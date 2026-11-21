/**
 * Composer Dock's tabs: an icon tab with the soft glass capsule it gets while held, and the
 * dark pill that names the tab under a scrubbing finger. Part of the Composer Dock design
 * (composer-dock.tsx). Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { GlassView } from 'expo-glass-effect';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TabButton, type TabItem, useTabIndicator } from 'react-native-tabcn';
import {
  type ComposerDockColors,
  type Frame,
  fade,
  GLASS_STYLE,
  measure,
  TAB_WIDTH,
} from './composer-dock-theme';

export function DockTab({
  tab,
  colors,
  lit,
  held,
  onHold,
  register,
  glass,
}: {
  tab: TabItem;
  colors: ComposerDockColors;
  lit: boolean;
  held: boolean;
  /** The held tab's capsule is Liquid Glass, as in the app. */
  glass: boolean;
  onHold?: (tab: TabItem, anchor: Frame) => void;
  /** Hands the dock this tab's icon, which its menu opens from. */
  register: (key: string, node: ComponentRef<typeof View> | null) => void;
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
      style={styles.tab}
      // Touch holds are handled by the row's hold gesture (see ComposerDock); this long press is
      // the screen readers' way in.
      onLongPress={onHold ? open : undefined}
      accessibilityActions={onHold ? [{ name: 'longpress', label: 'Show recent' }] : undefined}
    >
      <View
        ref={(node) => {
          ref.current = node;
          register(tab.key, node);
        }}
        collapsable={false}
        style={styles.iconBox}
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
  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    width: width.value,
    transform: [{ translateX: x.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.labelTrack, style]}
    >
      <View style={[styles.labelPill, { backgroundColor: colors.label }]}>
        <Text numberOfLines={1} style={[styles.labelText, { color: colors.labelText }]}>
          {text}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tab: { width: TAB_WIDTH, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 60, height: 42, alignItems: 'center', justifyContent: 'center' },
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
  labelTrack: { position: 'absolute', left: 0, top: -20, alignItems: 'center' },
  labelPill: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: { fontSize: 12, fontWeight: '600' },
});
