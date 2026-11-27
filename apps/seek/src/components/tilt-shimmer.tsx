/**
 * A band of light that sweeps across a loading placeholder, and leans with the phone: tilt it
 * and the band's angle and place follow, as light catching a sheet of glass would. The gravity
 * sensor is read on the UI thread; with no sensor (the simulator) it just sweeps. Reduce motion
 * holds it off. Lay it over a placeholder inside a view that clips (overflow hidden).
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  SensorType,
  useAnimatedSensor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const BAND = 140;

export function TiltShimmer({ width, delay = 0 }: { width: number; delay?: number }) {
  const reduceMotion = useReducedMotion();
  const gravity = useAnimatedSensor(SensorType.GRAVITY, { interval: 'auto' });
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    sweep.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.cubic) }),
          withTiming(0, { duration: 0 }),
          withTiming(0, { duration: 450 }),
        ),
        -1,
      ),
    );
  }, [reduceMotion, delay, sweep]);
  const band = useAnimatedStyle(() => {
    // Gravity in m/s²: x leans with a left-right tilt, y with tipping towards or away.
    const roll = Math.max(-1, Math.min(1, gravity.sensor.value.x / 9.81));
    const pitch = Math.max(-1, Math.min(1, gravity.sensor.value.y / 9.81));
    return {
      opacity: reduceMotion ? 0 : 1,
      transform: [
        { translateX: -BAND + sweep.value * (width + BAND * 2) + roll * 40 },
        { rotate: `${18 + roll * 22 + pitch * 6}deg` },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.band, band]}>
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(170,190,255,0.16)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  band: { position: 'absolute', top: -60, bottom: -60, left: 0, width: BAND },
});
