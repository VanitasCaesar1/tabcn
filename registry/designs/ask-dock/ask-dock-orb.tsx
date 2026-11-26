/**
 * Ask Dock's orb: a glossy blue-violet sphere with two bean-shaped eyes, the face of the search.
 *
 * The eyes are painted on the sphere, not laid flat on it: the head has a gaze (yaw, pitch, roll),
 * each eye sits on the sphere's surface and is drawn through its tangent frame, so an eye turning
 * towards the edge narrows and tilts the way a real one would. That model, the measured blink
 * schedule and the slow gaze drift come from bloub by Jérémy Perret (MIT,
 * https://github.com/jeremy-prt/bloub); see the licence notice at the end of this file. Every frame
 * is a pure function of time, worked out on the UI thread.
 *
 * At rest the orb looks up and to the left, drifts a little and blinks now and then. While a search
 * runs (`busy`) it scans: its gaze sweeps from side to side and holds, and its colours turn round.
 * With "reduce motion" on it holds one still frame.
 *
 * Use it on your own screens too (a large one over the empty state, a small one beside a reply):
 * `<Orb size={140} />`.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

/** The orb's colours. */
export interface OrbColors {
  /** The lit side, at the lower left. */
  light: string;
  /** The deep blue core, right of centre. */
  core: string;
  /** The violet side, at the upper right. */
  deep: string;
  /** The eyes and the gloss. */
  eye: string;
}

export const defaultOrbColors: OrbColors = {
  light: '#0e62ff',
  core: '#0208a8',
  deep: '#5a1bd8',
  eye: '#ffffff',
};

export interface OrbProps {
  /** Diameter in points. Default 40. */
  size?: number;
  /** A search is running: the gaze scans from side to side and the colours turn. Default false. */
  busy?: boolean;
  /** Drift and blink at rest. Default true; `false` holds the rest frame until it's busy. */
  alive?: boolean;
  colors?: Partial<OrbColors>;
}

// The face, measured from the reference at 3x, in units of the ball's radius.
/** Where the head looks at rest, in degrees: to the left and a little up. */
const REST = { yaw: -23, pitch: 7.5, roll: 0 };
/** Half the angle between the eyes on the sphere. */
const SPLIT = 13.5;
/** An eye's width and height on the sphere, before it is foreshortened. */
const EYE_W = 0.29;
const EYE_H = 0.55;
/** While busy: how far the gaze sweeps each way, and how far down it looks (at its work). */
const SCAN = 24;
const SCAN_PITCH = -3;

/**
 * One eye, in its own frame (x right, y down, -0.5 to 0.5): a bean, round on the left, with a
 * notch cut into its right side just below the middle, like an opening quote mark.
 */
type Pair = readonly [number, number];
type Six = readonly [number, number, number, number, number, number];
type Vec3 = [number, number, number];

/** Where the bean starts, then its cubic segments: two control points and an end point each. */
const BEAN_START: Pair = [0, -0.5];
const BEAN: readonly Six[] = [
  [0.3, -0.5, 0.48, -0.36, 0.46, -0.18],
  [0.45, -0.06, 0.3, -0.01, 0.14, 0.05],
  [0.34, 0.07, 0.5, 0.17, 0.5, 0.3],
  [0.5, 0.44, 0.31, 0.5, 0.04, 0.5],
  [-0.3, 0.5, -0.5, 0.32, -0.5, 0.02],
  [-0.5, -0.3, -0.3, -0.5, 0, -0.5],
];

/** The schedule and the drift read time modulo this, so an orb left on for hours stays precise. */
const WRAP = 900;

/** The blink schedule, drawn ahead (bloub's): 1.9 to 4.6 s apart, sometimes a double blink. */
const BLINKS: number[] = (() => {
  let a = 0x5eed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: number[] = [];
  let t = 1.4;
  while (t < WRAP) {
    out.push(t);
    t += 1.9 + rand() * 2.7;
    if (rand() < 0.18) {
      out.push(t);
      t += 0.24;
    }
  }
  return out;
})();

export function Orb({ size = 40, busy = false, alive = true, colors: custom }: OrbProps) {
  const colors = { ...defaultOrbColors, ...custom };
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduceMotion = useReducedMotion();

  // The clock: seconds since the orb appeared, on the UI thread. It doesn't run with reduce
  // motion on, or at rest when `alive` is off.
  const clock = useSharedValue(0);
  const running = !reduceMotion && (alive || busy);
  useFrameCallback((frame) => {
    clock.value = (frame.timeSinceFirstFrame / 1000) % WRAP;
  }, running);
  // 0 at rest, 1 scanning: an ease-out morph between the two poses, never a spring.
  const scanning = useSharedValue(busy ? 1 : 0);
  useEffect(() => {
    scanning.value = withTiming(busy ? 1 : 0, MORPH);
  }, [busy, scanning]);
  const spin = useSharedValue(0);
  useEffect(() => {
    if (!busy || reduceMotion) {
      cancelAnimation(spin);
      return;
    }
    const started = spin.value;
    spin.value = withTiming(started + 100, { duration: 360000, easing: Easing.linear });
  }, [busy, reduceMotion, spin]);

  const eyes = useDerivedValue(() => {
    const t = clock.value;
    const live = running ? 1 : 0;
    const k = scanning.value;
    // Gaze drift at rest (bloub's periods, prime to each other so it never visibly repeats).
    const yawDrift = (noise(t, 11.3, 0.4) * 5.5 + noise(t, 3.7, 2.1) * 1.6) * live;
    const pitchDrift = (noise(t, 9.1, 1.3) * 4.2 + noise(t, 4.3, 0.7) * 1.3) * live;
    const rollDrift = noise(t, 13.7, 3.2) * 2.2 * live;
    const rest = { yaw: REST.yaw + yawDrift, pitch: REST.pitch + pitchDrift, roll: rollDrift };
    const look = { yaw: scanYaw(t) * live, pitch: SCAN_PITCH + pitchDrift * 0.4, roll: 0 };
    const yaw = rest.yaw + (look.yaw - rest.yaw) * k;
    const pitch = rest.pitch + (look.pitch - rest.pitch) * k;
    const roll = rest.roll * (1 - k);
    const lid = live ? blinkLid(t) : 1;
    return pose(yaw, pitch, roll, lid);
  });
  const eye0 = useAnimatedProps(() => ({ d: eyes.value.d0, fillOpacity: eyes.value.o0 }));
  const eye1 = useAnimatedProps(() => ({ d: eyes.value.d1, fillOpacity: eyes.value.o1 }));
  const swirl = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));

  return (
    <View style={{ width: size, height: size }} accessible={false} pointerEvents="none">
      {/* The body: its colours turn round while a search runs; the gloss and eyes stay put. */}
      <Animated.View style={[StyleSheet.absoluteFill, swirl]}>
        <Svg width={size} height={size} viewBox="-100 -100 200 200">
          <Defs>
            <LinearGradient id={`body${id}`} x1="0.2" y1="0.95" x2="0.8" y2="0.05">
              <Stop offset="0" stopColor={colors.light} />
              <Stop offset="0.5" stopColor={colors.light} />
              <Stop offset="0.72" stopColor={colors.core} />
              <Stop offset="1" stopColor={colors.deep} />
            </LinearGradient>
            <RadialGradient id={`core${id}`} cx="0.68" cy="0.54" r="0.42">
              <Stop offset="0" stopColor={colors.core} stopOpacity={1} />
              <Stop offset="1" stopColor={colors.core} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={`cap${id}`} cx="0.62" cy="0.02" r="0.6">
              <Stop offset="0" stopColor={colors.deep} stopOpacity={0.95} />
              <Stop offset="1" stopColor={colors.deep} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle r={100} fill={`url(#body${id})`} />
          <Circle r={100} fill={`url(#core${id})`} />
          <Circle r={100} fill={`url(#cap${id})`} />
        </Svg>
      </Animated.View>
      <Svg width={size} height={size} viewBox="-100 -100 200 200" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={`edge${id}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0.8" stopColor="#12045a" stopOpacity={0} />
            <Stop offset="1" stopColor="#12045a" stopOpacity={0.3} />
          </RadialGradient>
          <RadialGradient id={`glow${id}`} cx="0.28" cy="0.8" r="0.42">
            <Stop offset="0" stopColor="#3b8dff" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#4aa6ff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle r={100} fill={`url(#glow${id})`} />
        <Circle r={100} fill={`url(#edge${id})`} />
        {/* Gloss: a long highlight inside the upper left edge, a short one at the upper right,
            and a faint one along the bottom. */}
        <Path
          d="M -82 -30 Q -70 -70 -30 -88 Q -62 -66 -74 -28 Q -78 -18 -82 -30 Z"
          fill={colors.eye}
          fillOpacity={0.4}
        />
        <Path d="M 50 -78 Q 74 -64 84 -40 Q 70 -58 48 -72 Z" fill={colors.eye} fillOpacity={0.3} />
        <Path d="M -50 80 Q -10 98 36 90 Q -8 92 -46 76 Z" fill={colors.eye} fillOpacity={0.18} />
        <AnimatedPath animatedProps={eye0} fill={colors.eye} />
        <AnimatedPath animatedProps={eye1} fill={colors.eye} />
      </Svg>
    </View>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

const MORPH = {
  duration: 450,
  easing: Easing.bezier(0.22, 1, 0.36, 1), // ease-out quint
  reduceMotion: ReduceMotion.System,
};

/** Seamless 1D noise over `period` (bloub's loopNoise). */
function noise(t: number, period: number, seed: number) {
  'worklet';
  const p = (t / period) * Math.PI * 2;
  return (
    0.55 * Math.sin(p + seed) +
    0.3 * Math.sin(2 * p + seed * 1.7 + 1.1) +
    0.15 * Math.sin(3 * p + seed * 2.3 + 2.4)
  );
}

/**
 * The scan while busy: glance left, hold, glance right, hold, every 2.4 s. Each glance is an
 * ease-out (quint), as every move of the face is.
 */
function scanYaw(t: number) {
  'worklet';
  const p = t % 2.4;
  const ease = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 5;
  if (p < 1.2) return SCAN - 2 * SCAN * ease(p / 0.4);
  return -SCAN + 2 * SCAN * ease((p - 1.2) / 0.4);
}

/** 1 open, 0 shut: a quick close and a slightly slower open, 0.18 s in all (bloub's). */
function blinkLid(t: number) {
  'worklet';
  // The last blink that started by `t` (binary search: the schedule is sorted).
  let lo = 0;
  let hi = BLINKS.length - 1;
  if (hi < 0 || t < (BLINKS[0] as number)) return 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((BLINKS[mid] as number) <= t) lo = mid;
    else hi = mid - 1;
  }
  const k = (t - (BLINKS[lo] as number)) / 0.18;
  if (k > 1) return 1;
  return k < 0.45 ? 1 - k / 0.45 : (k - 0.45) / 0.55;
}

/**
 * Both eyes for a head gaze (degrees) and a lid (1 open): each eye's centre on the unit sphere,
 * its tangent frame projected straight on (so it narrows towards the edge), squashed vertically
 * on screen as it blinks, and faded as it turns away. Paths are in the -100..100 view box.
 */
function pose(yaw: number, pitch: number, roll: number, lid: number) {
  'worklet';
  const rad = Math.PI / 180;
  // Turns two axes of an orthonormal frame by an angle in their shared plane.
  const turn = (u: Vec3, v: Vec3, angle: number): [Vec3, Vec3] => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
      [u[0] * c + v[0] * s, u[1] * c + v[1] * s, u[2] * c + v[2] * s],
      [v[0] * c - u[0] * s, v[1] * c - u[1] * s, v[2] * c - u[2] * s],
    ];
  };
  // Screen frame: x right, y down, z towards the viewer. Yaw, then pitch, then roll.
  let f: Vec3 = [0, 0, 1];
  let right: Vec3 = [1, 0, 0];
  let down: Vec3 = [0, 1, 0];
  [f, right] = turn(f, right, yaw * rad);
  [down, f] = turn(down, f, pitch * rad);
  [right, down] = turn(right, down, roll * rad);
  const squash = 0.06 + 0.94 * Math.min(1, Math.max(0, lid));
  const eye = (side: number) => {
    const [ef, er] = turn(f, right, SPLIT * side * rad);
    const cx = ef[0] * 100;
    const cy = ef[1] * 100;
    const point = (u: number, v: number) => {
      const x = cx + (er[0] * u * EYE_W + down[0] * v * EYE_H) * 100;
      const y = cy + (er[1] * u * EYE_W + down[1] * v * EYE_H) * 100 * squash;
      return `${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`;
    };
    let d = `M ${point(BEAN_START[0], BEAN_START[1])}`;
    for (const c of BEAN) {
      d += ` C ${point(c[0], c[1])} ${point(c[2], c[3])} ${point(c[4], c[5])}`;
    }
    // Fades as it turns away from the viewer.
    const opacity = Math.min(1, Math.max(0, (ef[2] - 0.05) / 0.25));
    return { d: `${d} Z`, opacity };
  };
  const a = eye(-1);
  const b = eye(1);
  return { d0: a.d, o0: a.opacity, d1: b.d, o1: b.opacity };
}

/*
 * bloub, whose eye-on-sphere model, blink schedule and gaze drift this file ports:
 *
 * MIT License
 *
 * Copyright (c) 2026 Jérémy Perret
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 * and associated documentation files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
