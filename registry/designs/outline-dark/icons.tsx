/** Icons drawn for the Outline Dark design. */
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

const line = (color: string) => ({
  stroke: color,
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

export function AppsIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3.5} y={3.5} width={7} height={7} rx={2.2} {...line(color)} />
      <Rect x={13.5} y={3.5} width={7} height={7} rx={2.2} {...line(color)} />
      <Rect x={3.5} y={13.5} width={7} height={7} rx={2.2} {...line(color)} />
      <Rect x={13.5} y={13.5} width={7} height={7} rx={2.2} {...line(color)} />
    </Svg>
  );
}

export function LockIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7.6 10.4V7.8A4.4 4.4 0 0 1 16.4 7.8V10.4" {...line(color)} />
      <Rect x={4.8} y={10.4} width={14.4} height={10.4} rx={2.6} {...line(color)} />
      <Path d="M12 14.4V16.6" {...line(color)} />
    </Svg>
  );
}

export function StatsIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3.4} y={3.4} width={17.2} height={17.2} rx={3.4} {...line(color)} />
      <Path d="M8.6 16.4V12.4M12 16.4V8M15.4 16.4V11" {...line(color)} />
    </Svg>
  );
}

export function PersonIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={7.6} r={3.8} {...line(color)} />
      <Rect x={4.6} y={14.6} width={14.8} height={6} rx={3} {...line(color)} />
    </Svg>
  );
}
