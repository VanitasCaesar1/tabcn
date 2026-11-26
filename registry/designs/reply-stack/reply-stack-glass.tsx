/**
 * Reply Stack's glass: the frosted capsule both rows are made of, which narrows as the bar
 * minimizes, and the lens behind the active tab. Drawn once in SVG at their size, so nothing is
 * laid out or measured twice.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { BlurView } from 'expo-blur';
import { useId, useState } from 'react';
import { I18nManager, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedProps,
  useAnimatedReaction,
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

/** A capsule's resting size, and the size it shrinks to as the bar minimizes. */
export interface CapsuleShape {
  width: number;
  height: number;
  /** The size at `progress` 1. Default: the resting size (no change). */
  to?: { width: number; height: number };
  /** The end that moves in, in the layout's direction (`end`: the right, or the left in RTL). */
  moves?: 'start' | 'end';
}

/**
 * The frame of a capsule shrinking from `width` x `height` to `to`, its bottom edge and its
 * still end held in place, in a layer laid out left to right; and the opposite move that holds
 * content still inside it. Both are layout styles (left, top, width, height, radius): only plain
 * clips move, never a blur or the content inside them.
 */
export function useCapsuleFrame(progress: SharedValue<number> | undefined, shape: CapsuleShape) {
  const rest = useSharedValue(0);
  const narrow = progress ?? rest;
  const { width, height } = shape;
  const toWidth = shape.to?.width ?? width;
  const toHeight = shape.to?.height ?? height;
  // The physical side that moves. (react-native-web's I18nManager has no `isRTL` in a
  // left-to-right page, so it is read as a boolean.)
  const right = ((shape.moves ?? 'end') === 'end') !== Boolean(I18nManager.isRTL);
  const frame = useAnimatedStyle(() => {
    const w = width - narrow.value * (width - toWidth);
    const h = height - narrow.value * (height - toHeight);
    return {
      left: right ? 0 : width - w,
      top: height - h,
      width: w,
      height: h,
      borderRadius: h / 2,
    };
  });
  const hold = useAnimatedStyle(() => {
    const w = width - narrow.value * (width - toWidth);
    const h = height - narrow.value * (height - toHeight);
    return { left: right ? 0 : w - width, top: h - height };
  });
  return { frame, hold, right, toWidth, toHeight, narrow };
}

/**
 * A frosted capsule: a blur (a dense fill on Android), the tint, an edge lit from the top right,
 * and a soft shadow. Draws no content: lay it behind your own.
 *
 * As `progress` goes from 0 to 1 it shrinks to `to` (see `CapsuleShape`): one rounded clip
 * shrinks over one blur that keeps its size and place, so the blur is never resized and has no
 * seam (two blurs side by side would each blur the other's tint in where they meet). The edge is
 * drawn in SVG on the same frame, so its light follows the shape.
 *
 * `presence` (0 to 1) fades it in and out. iOS can't blur inside a view whose opacity, or any
 * parent's, is below 1: the screen would show through sharp. So nothing above the blur fades;
 * the blur's strength rises with `presence` and the layers over it (tint, edge, shadow) fade on
 * their own.
 */
export function Glass({
  colors,
  tint,
  intensity,
  presence,
  progress,
  ...shape
}: CapsuleShape & {
  colors: ReplyStackColors;
  tint: Tint;
  intensity: number;
  presence?: SharedValue<number>;
  progress?: SharedValue<number>;
}) {
  const { width, height } = shape;
  const rimId = useGradientId('rim');
  const radius = height / 2;
  // expo-blur's web blur is a CSS blur of a fifth of the intensity in px: half as strong as the
  // same intensity on iOS, so the web gets twice the intensity.
  const strength = Platform.OS === 'web' ? intensity * 2 : intensity;
  const full = useSharedValue(1);
  const amount = presence ?? full;
  const { frame, hold, right, toWidth, toHeight, narrow } = useCapsuleFrame(progress, shape);
  const fade = useAnimatedStyle(() => ({ opacity: amount.value }));
  const blur = useAnimatedProps(() => ({ intensity: amount.value * strength }));
  // The edge, on the same frame at progress `m`, inset by half its stroke.
  const edgeAt = (m: number, inset: number) => {
    'worklet';
    const w = width - m * (width - toWidth);
    const h = height - m * (height - toHeight);
    return {
      x: (right ? 0 : width - w) + inset,
      y: height - h + inset,
      width: w - inset * 2,
      height: h - inset * 2,
      rx: h / 2 - inset,
    };
  };
  const outline = useAnimatedProps(() => edgeAt(narrow.value, 0.25));
  const rim = useAnimatedProps(() => edgeAt(narrow.value, 1));
  // On the web, react-native-svg's animated shapes drop the last frames of a change and stop
  // short, so there the edge follows the progress through React state instead.
  const web = Platform.OS === 'web';
  const [webProgress, setWebProgress] = useState(() => narrow.value);
  useAnimatedReaction(
    () => (web ? narrow.value : 0),
    (next, previous) => {
      if (web && next !== previous) runOnJS(setWebProgress)(next);
    },
  );
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, LTR]}>
      <Animated.View
        style={[
          styles.capsule,
          { height, borderRadius: radius, boxShadow: shadowFor(tint, colors.shadow) },
          frame,
          fade,
        ]}
      />
      <Animated.View style={[styles.capsule, styles.clip, { height, borderRadius: radius }, frame]}>
        <Animated.View style={[styles.still, { width, height }, hold]}>
          {Platform.OS === 'android' ? (
            <Animated.View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.fill }, fade]}
            />
          ) : presence ? (
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
        </Animated.View>
        {Platform.OS === 'android' ? null : (
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.tint }, fade]}
          />
        )}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, fade]}>
        {/* Keyed by the colours: on the web an animated shape keeps its last props, so a new
            stroke colour would be undone by the next frame. */}
        <Svg key={`${colors.outline}${colors.rim}`} width={width} height={height}>
          <Defs>
            <LinearGradient id={rimId} x1="0.75" y1="0" x2="0.25" y2="1">
              <Stop offset="0" {...stop(colors.rim)} />
              <Stop offset="0.32" {...stop(colors.rimShade)} />
              <Stop offset="0.68" {...stop(colors.rimShade)} />
              <Stop offset="1" {...stop(colors.rim)} />
            </LinearGradient>
          </Defs>
          {web ? (
            <>
              <Rect
                {...edgeAt(webProgress, 0.25)}
                fill="none"
                stroke={colors.outline}
                strokeWidth={0.5}
              />
              <Rect
                {...edgeAt(webProgress, 1)}
                fill="none"
                stroke={`url(#${rimId})`}
                strokeWidth={1.2}
              />
            </>
          ) : (
            <>
              <AnimatedRect
                {...edgeAt(0, 0.25)}
                animatedProps={outline}
                fill="none"
                stroke={colors.outline}
                strokeWidth={0.5}
              />
              <AnimatedRect
                {...edgeAt(0, 1)}
                animatedProps={rim}
                fill="none"
                stroke={`url(#${rimId})`}
                strokeWidth={1.2}
              />
            </>
          )}
        </Svg>
      </Animated.View>
    </View>
  );
}

/**
 * A fixed layout direction. React Native Web spells it `writingDirection` (CSS `direction`): in
 * development it drops `direction` with an error, so the web would follow the app's direction.
 */
export const LTR: ViewStyle =
  Platform.OS === 'web' ? ({ writingDirection: 'ltr' } as ViewStyle) : { direction: 'ltr' };
/** The app's own layout direction, restored inside a layer laid out left to right. */
export const APP_DIRECTION: ViewStyle = I18nManager.isRTL
  ? Platform.OS === 'web'
    ? ({ writingDirection: 'rtl' } as ViewStyle)
    : { direction: 'rtl' }
  : LTR;

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
const AnimatedRect = Animated.createAnimatedComponent(Rect);

const styles = StyleSheet.create({
  // The capsule's frame: its left and width follow the narrowing.
  capsule: { position: 'absolute', top: 0, borderCurve: 'continuous' },
  clip: { overflow: 'hidden' },
  // The blur, held at the capsule's resting frame while the clip narrows over it.
  still: { position: 'absolute', top: 0 },
});
