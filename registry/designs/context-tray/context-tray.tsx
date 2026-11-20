/**
 * Context Tray: a screen's own controls in the tab bar's place. While a screen is focused,
 * the bar's tabs crossfade out and the tray crossfades in, filling the bar's area: a wide
 * pill with a label, a percentage and a thin progress bar, and a round close button beside
 * it. When the screen loses focus the tabs come back.
 *
 * It is content for `useTabBarOverride` (from `tabcn/expo-router` or `tabcn/react-navigation`),
 * so it needs a `TabBarProvider` around the tabs navigator:
 *
 * ```tsx
 * useTabBarOverride(
 *   <ContextTray label="Explored" progress={0.42} onClose={() => router.navigate('/')} />,
 * );
 * ```
 *
 * On a rail (a navigator with `tabBarPosition: 'left'`, as Side Rail draws on tablets) the
 * tray stacks instead: the pill on top, the label over its percentage, and the close button
 * under it, both as wide as the rail.
 *
 * The tray draws its own surface (the bar's material fades with its tabs). The progress bar
 * glides to a new value on `tabcnSpring`, with no overshoot; a new label crossfades in on
 * `tabcnTiming`. With "reduce motion" on, both are instant.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { tabcnSpring, tabcnTiming, useTabBar } from 'tabcn';

const defaultColors = {
  /** Fill of the pill and the close button. Defaults suit light floating pills (Glass Expand). */
  surface: 'rgba(247, 246, 255, 0.94)',
  /** 1 pt rim around both shapes. */
  border: 'rgba(255, 255, 255, 0.9)',
  /** The label and the close glyph. */
  foreground: '#141417',
  /** The percentage. */
  muted: 'rgba(20, 20, 23, 0.5)',
  /** The progress bar's empty track. */
  track: 'rgba(60, 50, 140, 0.1)',
  /** The progress bar's fill. */
  progress: '#5b4fd6',
  /** The close button's fill while pressed. */
  closePressed: '#e6e4f4',
};

export type ContextTrayColors = typeof defaultColors;

export interface ContextTrayProps {
  /** What the screen is doing, such as "Explored" or "Uploading". One line. */
  label: string;
  /** 0 to 1. Shows a percentage and a progress bar; leave it out for a label alone. */
  progress?: number;
  /** Runs when the close button is pressed: navigate back, or to another tab. */
  onClose: () => void;
  colors?: Partial<ContextTrayColors>;
  /** Screen-reader label of the close button. Default "Close". */
  closeLabel?: string;
  haptics?: boolean;
}

/** Space between the pill and the close button. */
const GAP = 8;
/** Height of the progress bar. */
const TRACK = 4;
/** Height of the label line; labels crossfade inside it. */
const LINE = 20;
/** The close glyph: two strokes this long, crossing at the centre. */
const GLYPH = 16;
const STROKE = 2;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function ContextTray({
  label,
  progress,
  onClose,
  colors: custom,
  closeLabel = 'Close',
  haptics = true,
}: ContextTrayProps) {
  const colors = { ...defaultColors, ...custom };
  // The override slot is the bar's own box: a wide strip at the bottom, or a tall column on
  // a rail, where a circle "as tall as the bar" would be as wide as the screen is tall.
  const rail = useTabBar().position === 'left';
  const hasProgress = progress != null && Number.isFinite(progress);
  const value = hasProgress ? clamp(progress) : 0;
  const percent = Math.round(value * 100);

  const fill = useSharedValue(value);
  useEffect(() => {
    fill.value = withSpring(value, tabcnSpring);
  }, [value, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  const surface = { backgroundColor: colors.surface, borderColor: colors.border };

  return (
    <View style={[styles.tray, rail && styles.railTray]}>
      <View
        accessible
        accessibilityRole={hasProgress ? 'progressbar' : 'text'}
        accessibilityLabel={label}
        accessibilityValue={hasProgress ? { min: 0, max: 100, now: percent } : undefined}
        style={[styles.pill, rail && styles.railPill, surface]}
      >
        <View style={[styles.row, rail && styles.railRow]}>
          <Label text={label} color={colors.foreground} rail={rail} />
          {hasProgress ? (
            <Text style={[styles.percent, { color: colors.muted }]}>{percent}%</Text>
          ) : null}
        </View>
        {hasProgress ? (
          <View style={[styles.track, { backgroundColor: colors.track }]}>
            <Animated.View style={[styles.fill, { backgroundColor: colors.progress }, fillStyle]} />
          </View>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
        onPress={onClose}
        style={({ pressed }) => [
          styles.close,
          rail && styles.railClose,
          surface,
          pressed && { backgroundColor: colors.closePressed },
        ]}
      >
        <View style={styles.glyph}>
          <View
            style={[styles.stroke, styles.strokeDown, { backgroundColor: colors.foreground }]}
          />
          <View style={[styles.stroke, styles.strokeUp, { backgroundColor: colors.foreground }]} />
        </View>
      </Pressable>
    </View>
  );
}

/**
 * The label line. A new label crossfades over the old one on `tabcnTiming`; the first one
 * shows at once, because the whole tray already crossfades in with the bar.
 */
function Label({ text, color, rail }: { text: string; color: string; rail: boolean }) {
  const [shown, setShown] = useState(text);
  const [previous, setPrevious] = useState<string | null>(null);
  // Tracked during render, so the commit with the new label already draws both.
  if (text !== shown) {
    setPrevious(shown);
    setShown(text);
  }
  const fade = useSharedValue(1);
  useEffect(() => {
    if (previous === null) return;
    const done = () => setPrevious(null);
    fade.value = 0;
    fade.value = withTiming(1, tabcnTiming, (finished) => {
      'worklet';
      if (finished) runOnJS(done)();
    });
  }, [previous, fade]);
  const inStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const outStyle = useAnimatedStyle(() => ({ opacity: 1 - fade.value }));
  const textStyle = [styles.label, { color }];

  return (
    <View style={[styles.labelBox, rail && styles.railLabelBox]}>
      {previous !== null ? (
        <Animated.Text
          numberOfLines={1}
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[textStyle, outStyle]}
        >
          {previous}
        </Animated.Text>
      ) : null}
      <Animated.Text numberOfLines={1} style={[textStyle, previous !== null && inStyle]}>
        {shown}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Fills the bar's area: the override slot is the bar's own box.
  tray: { flex: 1, flexDirection: 'row', alignItems: 'stretch', gap: GAP },
  pill: {
    flex: 1,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 22,
    borderCurve: 'continuous',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  labelBox: { flex: 1, height: LINE, justifyContent: 'center' },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontSize: 15,
    lineHeight: LINE,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  percent: {
    fontSize: 13,
    lineHeight: LINE,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  track: { height: TRACK, borderRadius: TRACK / 2, marginTop: 8, overflow: 'hidden' },
  fill: { height: TRACK, borderRadius: TRACK / 2 },
  // A circle as tall as the bar.
  close: {
    height: '100%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { width: GLYPH, height: GLYPH, alignItems: 'center', justifyContent: 'center' },
  stroke: { position: 'absolute', width: GLYPH * Math.SQRT2, height: STROKE, borderRadius: 1 },
  // On a rail: stacked at the top of the column, each as wide as the rail.
  railTray: { flexDirection: 'column', justifyContent: 'flex-start' },
  railPill: { flex: 0, borderRadius: 24, paddingHorizontal: 12, paddingVertical: 14 },
  railRow: { flexDirection: 'column', alignItems: 'stretch', gap: 2 },
  railLabelBox: { flex: 0 },
  railClose: { width: '100%', height: undefined },
  strokeDown: { transform: [{ rotate: '45deg' }] },
  strokeUp: { transform: [{ rotate: '-45deg' }] },
});
