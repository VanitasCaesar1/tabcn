/**
 * The still being analysed: full bleed in a glowing blue-to-violet frame, a band of light
 * sweeping down it, sparks twinkling over it and a magnifier circling at its centre. Every
 * motion runs on the UI thread and stops with reduce motion.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography } from 'panelui-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { STILL } from '@/lib/films';
import { MagnifierIcon, sparkPath } from './icons';

export function Analyzing({ query }: { query: string }) {
  const reduceMotion = useReducedMotion();
  const sweep = useSharedValue(0);
  const circle = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    sweep.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
    );
    circle.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1);
  }, [reduceMotion, sweep, circle]);
  const band = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(sweep.value, [0, 1], [-160, 520]) }],
  }));
  const lens = useAnimatedStyle(() => {
    const a = circle.value * Math.PI * 2;
    return { transform: [{ translateX: Math.cos(a) * 9 }, { translateY: Math.sin(a) * 9 }] };
  });
  return (
    <Animated.View
      entering={FadeInDown.duration(320).reduceMotion(ReduceMotion.System)}
      className="flex-1 items-center gap-6 px-7 pt-6"
    >
      <Typography type="large" weight="medium" align="center" className="tracking-tight">
        {query}
      </Typography>
      <View style={styles.glow}>
        <LinearGradient
          colors={['#3d6bff', '#5b4dff', '#7a36ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ring}
        >
          <View style={styles.frame}>
            <Image source={STILL} style={StyleSheet.absoluteFill} contentFit="cover" />
            {/* The still's pale sky, warmed into the haze the rest of the frame has. */}
            <LinearGradient
              colors={[
                'rgba(120, 52, 14, 0.62)',
                'rgba(120, 52, 14, 0.18)',
                'rgba(10, 6, 30, 0.25)',
              ]}
              locations={[0, 0.42, 1]}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View pointerEvents="none" style={[styles.band, band]}>
              <LinearGradient
                colors={['rgba(120,160,255,0)', 'rgba(150,180,255,0.32)', 'rgba(120,160,255,0)']}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            {SPARKS.map((spark, i) => (
              <Twinkle
                key={`${spark.x}-${spark.y}`}
                {...spark}
                delay={i * 260}
                still={reduceMotion}
              />
            ))}
            <View style={styles.center}>
              <Animated.View style={lens}>
                <MagnifierIcon />
              </Animated.View>
              <Typography type="body" weight="semibold" className="text-white">
                Analysing…
              </Typography>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

/** Where the sparks sit on the still (percent) and how big they are. */
const SPARKS = [
  { x: 12, y: 12, size: 18 },
  { x: 74, y: 22, size: 30 },
  { x: 34, y: 44, size: 14 },
  { x: 10, y: 60, size: 24 },
  { x: 80, y: 64, size: 16 },
  { x: 24, y: 80, size: 15 },
  { x: 64, y: 84, size: 20 },
];

function Twinkle({
  x,
  y,
  size,
  delay,
  still,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
  still: boolean;
}) {
  const glow = useSharedValue(still ? 0.8 : 0);
  useEffect(() => {
    if (still) return;
    glow.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) }),
          withTiming(0.15, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [still, delay, glow]);
  const style = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 0.6 + 0.4 * glow.value }, { rotate: `${glow.value * 45}deg` }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.twinkle, { left: `${x}%`, top: `${y}%`, width: size, height: size }, style]}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={sparkPath(10, 13, 9.5)} fill="#ffffff" fillOpacity={0.92} />
        <Path d={sparkPath(20, 4.5, 3.6)} fill="#ffffff" fillOpacity={0.8} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: {
    width: '100%',
    aspectRatio: 0.78,
    borderRadius: 34,
    borderCurve: 'continuous',
    boxShadow: '0 0 28px rgba(96, 84, 255, 0.55)',
  },
  ring: { flex: 1, borderRadius: 34, borderCurve: 'continuous', padding: 4 },
  frame: { flex: 1, borderRadius: 30, borderCurve: 'continuous', overflow: 'hidden' },
  band: { position: 'absolute', left: 0, right: 0, height: 150 },
  twinkle: { position: 'absolute' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 4 },
});
