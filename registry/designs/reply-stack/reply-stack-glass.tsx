/**
 * Reply Stack's glass: the frosted capsule both rows are made of, and the lens behind the active
 * tab. Drawn once in SVG at their size, so nothing is laid out or measured twice.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { BlurView } from 'expo-blur';
import { type ReactNode, useId } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { ReplyStackColors } from './reply-stack';

export type Tint = 'light' | 'dark';

/**
 * A gradient stop's colour and opacity. react-native-svg ignores the alpha of an `rgba()` stop
 * colour, so it is passed as `stopOpacity` instead.
 */
function stop(color: string) {
  const rgba = color.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/);
  if (!rgba) return { stopColor: color, stopOpacity: 1 };
  return { stopColor: `rgb(${rgba[1]}, ${rgba[2]}, ${rgba[3]})`, stopOpacity: Number(rgba[4]) };
}

/** An id for an SVG gradient, unique on the page (the web shares one id space). */
function useGradientId(name: string) {
  return `${name}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
}

/**
 * A frosted capsule: a blur (a dense fill on Android), the tint, and an edge lit from the top
 * right, drawn once in SVG at the capsule's size. Its children sit on top.
 *
 * `presence` (0 to 1) fades it in and out. iOS can't blur inside a view whose opacity, or any
 * parent's, is below 1: the screen would show through sharp. So nothing above the blur fades;
 * the blur's strength rises with `presence` and the layers over it (tint, edge, content, shadow)
 * fade on their own.
 */
export function Glass({
  colors,
  tint,
  intensity,
  width,
  height,
  presence,
  children,
}: {
  colors: ReplyStackColors;
  tint: Tint;
  intensity: number;
  width: number;
  height: number;
  presence?: SharedValue<number>;
  children: ReactNode;
}) {
  const rimId = useGradientId('rim');
  const radius = height / 2;
  // expo-blur's web blur is a CSS blur of a fifth of the intensity in px: half as strong as the
  // same intensity on iOS, so the web gets twice the intensity.
  const strength = Platform.OS === 'web' ? intensity * 2 : intensity;
  const shown = useSharedValue(1);
  const amount = presence ?? shown;
  const fade = useAnimatedStyle(() => ({ opacity: amount.value }));
  const blur = useAnimatedProps(() => ({ intensity: amount.value * strength }));
  return (
    <View style={{ width, height }}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.round,
          { borderRadius: radius, boxShadow: shadowFor(tint, colors.shadow) },
          fade,
        ]}
      />
      <View style={[styles.clip, { borderRadius: radius }]}>
        {Platform.OS === 'android' ? (
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.fill }, fade]}
          />
        ) : (
          <>
            {presence ? (
              <AnimatedBlurView
                // The starting strength as a plain prop, which the web build needs; the animated
                // one takes over as the row fades.
                intensity={presence.value * strength}
                animatedProps={blur}
                tint={tint}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <BlurView intensity={strength} tint={tint} style={StyleSheet.absoluteFill} />
            )}
            <Animated.View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.tint }, fade]}
            />
          </>
        )}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fade]}>
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id={rimId} x1="0.75" y1="0" x2="0.25" y2="1">
                <Stop offset="0" {...stop(colors.rim)} />
                <Stop offset="0.32" {...stop(colors.rimShade)} />
                <Stop offset="0.68" {...stop(colors.rimShade)} />
                <Stop offset="1" {...stop(colors.rim)} />
              </LinearGradient>
            </Defs>
            <Rect
              x={0.25}
              y={0.25}
              width={width - 0.5}
              height={height - 0.5}
              rx={radius - 0.25}
              fill="none"
              stroke={colors.outline}
              strokeWidth={0.5}
            />
            <Rect
              x={1}
              y={1}
              width={width - 2}
              height={height - 2}
              rx={radius - 1}
              fill="none"
              stroke={`url(#${rimId})`}
              strokeWidth={1.2}
            />
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.content, fade]}>{children}</Animated.View>
      </View>
    </View>
  );
}

function shadowFor(tint: Tint, color: string) {
  return tint === 'dark'
    ? `0 10px 28px ${color}`
    : `0 8px 24px ${color}, 0 1px 3px rgba(0, 0, 0, 0.06)`;
}

/**
 * The lens: a glass bead, lit from the top left and shaded to the bottom right, with a bright
 * rim where the light enters and leaves.
 */
export function Lens({
  colors,
  width,
  height,
}: {
  colors: ReplyStackColors;
  width: number;
  height: number;
}) {
  const fillId = useGradientId('lens');
  const rimId = useGradientId('lensRim');
  if (width <= 0) return null;
  const radius = height / 2;
  return (
    <Svg pointerEvents="none" width={width} height={height}>
      <Defs>
        <LinearGradient id={fillId} x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" {...stop(colors.lens)} />
          <Stop offset="1" {...stop(colors.lensShade)} />
        </LinearGradient>
        <LinearGradient id={rimId} x1="0.8" y1="0" x2="0.2" y2="1">
          <Stop offset="0" {...stop(colors.lensRim)} />
          <Stop offset="0.4" {...stop(colors.rimShade)} />
          <Stop offset="0.6" {...stop(colors.rimShade)} />
          <Stop offset="1" {...stop(colors.lensRim)} />
        </LinearGradient>
      </Defs>
      <Rect
        x={0.6}
        y={0.6}
        width={width - 1.2}
        height={height - 1.2}
        rx={radius - 0.6}
        fill={`url(#${fillId})`}
        stroke={`url(#${rimId})`}
        strokeWidth={1.2}
      />
    </Svg>
  );
}

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const styles = StyleSheet.create({
  round: { borderCurve: 'continuous' },
  clip: { flex: 1, overflow: 'hidden', borderCurve: 'continuous' },
  content: { flex: 1 },
});
