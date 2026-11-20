/**
 * Companion Chip: a small frosted control that sits against the tab bar, drawn inside
 * `TabBarCompanion`. Three forms:
 *
 * - `round`: a 48 pt circle with an icon, such as a locate button on a map;
 * - `pill`: an icon and a label, such as a search pill;
 * - `count`: a compact chip with a label and a number, such as "32 views".
 *
 * ```tsx
 * const focused = useIsFocused();
 * <TabBarCompanion position="above-end" visible={focused}>
 *   <CompanionChip variant="round" icon={LocateIcon} accessibilityLabel="Locate me" onPress={recenter} />
 * </TabBarCompanion>
 * ```
 *
 * `TabBarCompanion` places it against the bar without magic numbers: it follows the bar when
 * it minimizes, slides away with it for the keyboard, rides above a peeking mini player, and
 * fades out while a panel is open. Needs a `TabBarProvider`.
 *
 * Pressing it darkens its fill (a colour change; nothing scales or moves). A new count
 * crossfades in on tabcnTiming. With "reduce motion" on, every change is instant.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { BlurView } from 'expo-blur';
import { type ReactNode, useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { tabcnTiming } from 'tabcn';

const defaultColors = {
  /** Tint over the blur (and the fill on Android, where there is no blur). */
  surface: 'rgba(250, 250, 252, 0.78)',
  /** The fill while pressed. */
  pressed: 'rgba(232, 232, 236, 0.92)',
  /** Hairline edge. */
  border: 'rgba(0, 0, 0, 0.08)',
  /** Icon and label. */
  foreground: '#151517',
  /** The count in a `count` chip. */
  accent: '#2f6bff',
};

export type CompanionChipColors = typeof defaultColors;

/** What an icon is drawn with. Tab icon components (`TabIconProps`) fit too. */
export interface CompanionChipIconProps {
  color: string;
  size: number;
}

export interface CompanionChipProps {
  /** Default `round`. */
  variant?: 'round' | 'pill' | 'count';
  /** Draws the chip's icon: any tab icon component fits. A `count` chip draws it smaller. */
  icon?: (props: CompanionChipIconProps) => ReactNode;
  /** The pill's text, or the count chip's text before the number. */
  label?: string;
  /** The count chip's number. */
  count?: number;
  /** Runs when the chip is pressed. */
  onPress?: () => void;
  /** Screen-reader label. Default: the label and count, which a `round` chip needs instead. */
  accessibilityLabel?: string;
  /** `light` suits light screens; `dark` dark ones. Default `light`. */
  tint?: 'light' | 'dark';
  colors?: Partial<CompanionChipColors>;
}

const darkColors: CompanionChipColors = {
  surface: 'rgba(28, 28, 32, 0.72)',
  pressed: 'rgba(48, 48, 54, 0.9)',
  border: 'rgba(255, 255, 255, 0.12)',
  foreground: '#ffffff',
  accent: '#8fb2ff',
};

export function CompanionChip({
  variant = 'round',
  icon,
  label,
  count,
  onPress,
  accessibilityLabel,
  tint = 'light',
  colors: custom,
}: CompanionChipProps) {
  const colors = { ...(tint === 'dark' ? darkColors : defaultColors), ...custom };
  const shape =
    variant === 'round' ? styles.round : variant === 'pill' ? styles.pill : styles.count;
  const spoken =
    accessibilityLabel ?? [label, count === undefined ? undefined : String(count)].join(' ').trim();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken || undefined}
      onPress={onPress}
      hitSlop={variant === 'count' ? 8 : 0}
      style={[styles.base, shape, { borderColor: colors.border }]}
    >
      {({ pressed }) => (
        <>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={28} tint={tint} style={StyleSheet.absoluteFill} />
          ) : null}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: pressed ? colors.pressed : colors.surface },
            ]}
          />
          {icon ? icon({ color: colors.foreground, size: variant === 'count' ? 14 : 20 }) : null}
          {variant !== 'round' && label ? (
            <Text
              numberOfLines={1}
              style={[
                variant === 'pill' ? styles.pillLabel : styles.countLabel,
                { color: colors.foreground },
              ]}
            >
              {label}
            </Text>
          ) : null}
          {variant === 'count' && count !== undefined ? (
            <Count value={count} color={colors.accent} />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

/** The number in a count chip: a new value crossfades in. */
function Count({ value, color }: { value: number; color: string }) {
  const opacity = useSharedValue(1);
  const shown = useRef(value);
  useEffect(() => {
    if (shown.current === value) return;
    shown.current = value;
    // A new value starts faint and fades up, so the change reads without anything moving.
    opacity.value = 0.25;
    opacity.value = withTiming(1, tabcnTiming);
  }, [value, opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.Text style={[styles.countValue, { color }, fade]}>{String(value)}</Animated.Text>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.12)',
  },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  pill: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    gap: 8,
  },
  count: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    gap: 6,
  },
  pillLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  countLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  countValue: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
