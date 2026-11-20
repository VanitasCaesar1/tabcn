/** Icons drawn for the Dark Capsule design. */
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

const line = (color: string) => ({
  stroke: color,
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

export function VideoIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3.6} y={3.6} width={16.8} height={16.8} rx={3.6} {...line(color)} />
      <Path
        d="M10 8.8V15.2L15.2 12Z"
        fill={color}
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SearchIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={10.6} cy={10.6} r={6.6} {...line(color)} />
      <Path d="M15.6 15.6 20.4 20.4" {...line(color)} />
    </Svg>
  );
}

export function SparkNoteIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 18.2V8.6L15.4 7.2V16.4" {...line(color)} />
      <Circle cx={6.8} cy={18.4} r={2.4} fill={color} />
      <Circle cx={13.2} cy={16.6} r={2.4} fill={color} />
      <Path
        d="M18.6 2.2Q18.6 5.4 21.8 5.4Q18.6 5.4 18.6 8.6Q18.6 5.4 15.4 5.4Q18.6 5.4 18.6 2.2Z"
        fill={color}
        stroke={color}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LibraryIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5 4.4V19.6M9 4.4V19.6M13 4.4V19.6M16.6 4.8 20.2 19.4"
        {...line(color)}
        strokeWidth={2.2}
      />
    </Svg>
  );
}

export function AvatarIcon({ size }: TabIconProps) {
  return (
    <Svg width={size + 8} height={size + 8} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="tabcn-avatar" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2fb7ff" />
          <Stop offset="0.55" stopColor="#3be0c4" />
          <Stop offset="1" stopColor="#8ef06b" />
        </LinearGradient>
      </Defs>
      <Circle cx={12} cy={12} r={11} fill="url(#tabcn-avatar)" />
      <Path d="M6 9Q9 6 12 9T18 10Q15 14 11 13T6 15Z" fill="#7ef08d" opacity={0.55} />
    </Svg>
  );
}
