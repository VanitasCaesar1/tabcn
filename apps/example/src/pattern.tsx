import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Line, Path, Rect, Pattern as SvgPattern } from 'react-native-svg';

export type PatternKind = 'rings' | 'dots' | 'plus' | 'grid' | 'stripes' | 'waves';

export interface PatternSpec {
  kind: PatternKind;
  /** Stroke/fill colour of the pattern marks (use a low-alpha colour). */
  color: string;
  /** Spacing between marks in points. */
  gap?: number;
}

/** Full-screen decorative background echoing each reference image. */
export function Pattern({ spec, centerY }: { spec: PatternSpec; centerY: number }) {
  const { width, height } = useWindowDimensions();
  const gap = spec.gap ?? 22;

  if (spec.kind === 'rings') {
    const max = Math.hypot(width, height);
    const rings = Array.from({ length: Math.ceil(max / gap) }, (_, i) => (i + 1) * gap);
    return (
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        {rings.map((r) => (
          <Circle
            key={r}
            cx={width / 2}
            cy={centerY}
            r={r}
            stroke={spec.color}
            strokeWidth={gap * 0.45}
            fill="none"
          />
        ))}
      </Svg>
    );
  }

  const tile = (() => {
    switch (spec.kind) {
      case 'dots':
        return <Circle cx={gap / 2} cy={gap / 2} r={1.6} fill={spec.color} />;
      case 'plus':
        return (
          <Path
            d={`M${gap / 2 - 3} ${gap / 2}H${gap / 2 + 3}M${gap / 2} ${gap / 2 - 3}V${gap / 2 + 3}`}
            stroke={spec.color}
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        );
      case 'grid':
        return <Path d={`M${gap} 0V${gap}M0 ${gap}H${gap}`} stroke={spec.color} strokeWidth={1} />;
      case 'stripes':
        return (
          <Line
            x1={0}
            y1={gap / 2}
            x2={gap}
            y2={gap / 2}
            stroke={spec.color}
            strokeWidth={gap * 0.35}
          />
        );
      case 'waves':
        return (
          <Path
            d={`M${gap / 2} 0Q${gap * 0.85} ${gap / 4} ${gap / 2} ${gap / 2}T${gap / 2} ${gap}`}
            stroke={spec.color}
            strokeWidth={1.4}
            fill="none"
          />
        );
      default:
        return null;
    }
  })();

  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <SvgPattern id="tabcn-bg" width={gap} height={gap} patternUnits="userSpaceOnUse">
          {tile}
        </SvgPattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#tabcn-bg)" />
    </Svg>
  );
}
