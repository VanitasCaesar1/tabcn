import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  Path,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
  Pattern as SvgPattern,
} from 'react-native-svg';

/** Background patterns matching the reference images (sizes in points). */
export type PatternSpec =
  | { kind: 'rings'; color: string; gap: number; stroke: number }
  | { kind: 'dottedRings'; color: string; gap: number; dot: number }
  | { kind: 'plus'; color: string; gap: number; size: number; stroke: number }
  | { kind: 'dots'; color: string; gap: number; r: number; stagger?: boolean }
  | { kind: 'stripes'; light: string; dark: string; gap: number }
  | { kind: 'waveform'; color: string; gap: number; width: number }
  | { kind: 'contours'; color: string }
  | { kind: 'waves'; color: string; gap: number; amp: number; wavelength: number }
  | { kind: 'wood'; light: string; dark: string }
  | { kind: 'rays'; color: string; count: number }
  | { kind: 'capsules'; color: string; gap: number }
  | { kind: 'grid'; color: string; gap: number };

/** Small deterministic PRNG so generated patterns look the same on every render. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f1 = (n: number) => n.toFixed(1);

export function Pattern({ spec, centerY }: { spec: PatternSpec; centerY: number }) {
  const { width: W, height: H } = useWindowDimensions();
  const cx = W / 2;
  const svg = (children: React.ReactNode) => (
    // An explicit size: on web an absolutely placed <svg> keeps its 300 × 150 default otherwise.
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      {children}
    </Svg>
  );

  switch (spec.kind) {
    case 'rings':
    case 'dottedRings': {
      const max = Math.hypot(W, H);
      const radii = Array.from({ length: Math.ceil(max / spec.gap) }, (_, i) => (i + 1) * spec.gap);
      return svg(
        radii.map((r) =>
          spec.kind === 'rings' ? (
            <Circle
              key={r}
              cx={cx}
              cy={centerY}
              r={r}
              stroke={spec.color}
              strokeWidth={spec.stroke}
              fill="none"
            />
          ) : (
            <Circle
              key={r}
              cx={cx}
              cy={centerY}
              r={r}
              stroke={spec.color}
              strokeWidth={spec.dot}
              strokeDasharray={`0.1 ${spec.dot * 2.2}`}
              strokeLinecap="round"
              fill="none"
            />
          ),
        ),
      );
    }
    case 'capsules': {
      const g = spec.gap;
      return svg(
        <>
          <Defs>
            <SvgPattern id="bg-tile" width={g * 2} height={g} patternUnits="userSpaceOnUse">
              <Path
                d={`M${g * 0.2} ${g * 0.25}H${g * 0.75}A${g * 0.25} ${g * 0.25} 0 0 1 ${g * 0.75} ${g * 0.75}H${g * 0.2}Z`}
                fill={spec.color}
              />
              <Path
                d={`M${g * 1.2} ${g * -0.25}H${g * 1.75}A${g * 0.25} ${g * 0.25} 0 0 1 ${g * 1.75} ${g * 0.25}H${g * 1.2}Z`}
                fill={spec.color}
              />
              <Path
                d={`M${g * 1.2} ${g * 0.75}H${g * 1.75}A${g * 0.25} ${g * 0.25} 0 0 1 ${g * 1.75} ${g * 1.25}H${g * 1.2}Z`}
                fill={spec.color}
              />
            </SvgPattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bg-tile)" />
        </>,
      );
    }
    case 'grid': {
      const g = spec.gap;
      return svg(
        <>
          <Defs>
            <SvgPattern id="bg-tile" width={g} height={g} patternUnits="userSpaceOnUse">
              <Path d={`M${g} 0V${g}M0 ${g}H${g}`} stroke={spec.color} strokeWidth={1} />
            </SvgPattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bg-tile)" />
        </>,
      );
    }
    case 'plus':
    case 'dots': {
      const g = spec.gap;
      const tile =
        spec.kind === 'plus' ? (
          <Path
            d={`M${g / 2 - spec.size / 2} ${g / 2}H${g / 2 + spec.size / 2}M${g / 2} ${g / 2 - spec.size / 2}V${g / 2 + spec.size / 2}`}
            stroke={spec.color}
            strokeWidth={spec.stroke}
            strokeLinecap="round"
          />
        ) : spec.stagger ? (
          <>
            <Circle cx={g / 4} cy={g / 4} r={spec.r} fill={spec.color} />
            <Circle cx={(g * 3) / 4} cy={(g * 3) / 4} r={spec.r} fill={spec.color} />
          </>
        ) : (
          <Circle cx={g / 2} cy={g / 2} r={spec.r} fill={spec.color} />
        );
      return svg(
        <>
          <Defs>
            <SvgPattern id="bg-tile" width={g} height={g} patternUnits="userSpaceOnUse">
              {tile}
            </SvgPattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bg-tile)" />
        </>,
      );
    }
    case 'stripes': {
      const g = spec.gap;
      return svg(
        <>
          <Defs>
            <SvgLinearGradient id="bg-stripe" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={spec.light} />
              <Stop offset="0.55" stopColor={spec.light} />
              <Stop offset="1" stopColor={spec.dark} />
            </SvgLinearGradient>
            <SvgPattern id="bg-tile" width={W} height={g} patternUnits="userSpaceOnUse">
              <Rect width={W} height={g} fill="url(#bg-stripe)" />
            </SvgPattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bg-tile)" />
        </>,
      );
    }
    case 'waveform': {
      const rand = rng(12);
      const bars = Math.ceil(W / spec.gap);
      return svg(
        Array.from({ length: bars }, (_, i) => {
          const x = i * spec.gap + spec.gap / 2;
          const h = 12 + rand() * 20 + Math.sin(i / 3) * 5;
          return (
            <Line
              key={x}
              x1={x}
              x2={x}
              y1={centerY - h}
              y2={centerY + h}
              stroke={spec.color}
              strokeWidth={spec.width}
              strokeLinecap="round"
            />
          );
        }),
      );
    }
    case 'waves': {
      const lines = Math.ceil(W / spec.gap) + 2;
      return svg(
        Array.from({ length: lines }, (_, i) => {
          const x0 = (i - 1) * spec.gap;
          let d = `M${f1(x0)} 0`;
          for (let y = 0; y <= H; y += spec.wavelength / 2) {
            const side = (y / (spec.wavelength / 2)) % 2 === 0 ? 1 : -1;
            d += `Q${f1(x0 + side * spec.amp * 2)} ${f1(y + spec.wavelength / 4)} ${f1(x0)} ${f1(y + spec.wavelength / 2)}`;
          }
          return <Path key={x0} d={d} stroke={spec.color} strokeWidth={1} fill="none" />;
        }),
      );
    }
    case 'wood': {
      const rand = rng(7);
      const paths: React.ReactNode[] = [];
      for (let x = -10, i = 0; x < W + 20; i++) {
        const w = 10 + rand() * 22;
        const a = 2 + rand() * 4;
        const ph = rand() * 6;
        let left = '';
        let right = '';
        for (let y = 0; y <= H; y += 20) {
          const off = Math.sin(y / 70 + ph) * a;
          left += `${y === 0 ? 'M' : 'L'}${f1(x + off)} ${y}`;
          right = `L${f1(x + w + off)} ${y}${right}`;
        }
        if (i % 2 === 0) paths.push(<Path key={i} d={`${left}${right}Z`} fill={spec.dark} />);
        x += w;
      }
      return svg(
        <>
          <Rect width="100%" height="100%" fill={spec.light} />
          {paths}
        </>,
      );
    }
    case 'rays': {
      const R = Math.hypot(W, H);
      const step = (Math.PI * 2) / spec.count;
      return svg(
        Array.from({ length: spec.count / 2 }, (_, i) => {
          const a0 = i * step * 2;
          const a1 = a0 + step;
          const d = `M${f1(cx)} ${f1(centerY)}L${f1(cx + Math.cos(a0) * R)} ${f1(centerY + Math.sin(a0) * R)}L${f1(cx + Math.cos(a1) * R)} ${f1(centerY + Math.sin(a1) * R)}Z`;
          return <Path key={a0} d={d} fill={spec.color} />;
        }),
      );
    }
    case 'contours': {
      const rand = rng(3);
      const paths: string[] = [];
      // Long meandering lines…
      for (let i = 0; i < 14; i++) {
        const x0 = (i / 13) * W * 1.1 - W * 0.05;
        const a = 8 + rand() * 18;
        const p1 = rand() * 6;
        const p2 = rand() * 6;
        let d = '';
        for (let y = -10; y <= H + 10; y += 12) {
          const x = x0 + Math.sin(y / 90 + p1) * a + Math.sin(y / 37 + p2) * a * 0.35;
          d += `${d ? 'L' : 'M'}${f1(x)} ${y}`;
        }
        paths.push(d);
      }
      // …and a few closed rings, like hills.
      for (let i = 0; i < 6; i++) {
        const ox = rand() * W;
        const oy = rand() * H;
        for (let k = 1; k <= 3; k++) {
          const r = 9 * k + rand() * 6;
          const ph = rand() * 6;
          let d = '';
          for (let t = 0; t <= 24; t++) {
            const ang = (t / 24) * Math.PI * 2;
            const rr = r * (1 + 0.22 * Math.sin(ang * 3 + ph));
            d += `${t ? 'L' : 'M'}${f1(ox + Math.cos(ang) * rr * 1.3)} ${f1(oy + Math.sin(ang) * rr)}`;
          }
          paths.push(`${d}Z`);
        }
      }
      return svg(
        paths.map((d) => <Path key={d} d={d} stroke={spec.color} strokeWidth={0.8} fill="none" />),
      );
    }
    default:
      return null;
  }
}
