/** Line icons drawn for the Mono Type design. */
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

const line = (color: string) => ({
  stroke: color,
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});
const sparkle = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z`;

export function HouseIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 10.6 12 3 21 10.6M5 9V21H19V9" {...line(color)} />
      <Path d="M8 21V15.4H11.4V21" {...line(color)} />
      <Rect x={13.4} y={10.4} width={4} height={4} {...line(color)} />
      <Path d="M15.4 10.4V14.4M13.4 12.4H17.4M16 3.8V6" {...line(color)} />
    </Svg>
  );
}

export function CrystalIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={10.4} r={7.6} {...line(color)} />
      <Path d={sparkle(9.4, 9.4, 2.2)} {...line(color)} />
      <Path d={sparkle(14.6, 12.4, 2.2)} {...line(color)} />
      <Path d={sparkle(12.6, 5.6, 1.2)} {...line(color)} />
      <Path d="M7.6 16.6 6.4 20.6H17.6L16.4 16.6" {...line(color)} />
    </Svg>
  );
}

export function WheelIcon({ color, size }: TabIconProps) {
  const spokes = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 8);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9.2} {...line(color)} />
      {spokes.map((a) => (
        <Path
          key={a}
          d={`M${12 - Math.cos(a) * 9.2} ${12 - Math.sin(a) * 9.2}L${12 + Math.cos(a) * 9.2} ${12 + Math.sin(a) * 9.2}`}
          {...line(color)}
        />
      ))}
    </Svg>
  );
}

export function ClockIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={13} r={7.6} {...line(color)} />
      <Path d="M12 9V13.2H15M7 20.4 6 22M17 20.4 18 22" {...line(color)} />
      <Path d="M3.2 6.6A3.2 3.2 0 0 1 7.6 3.4M16.4 3.4A3.2 3.2 0 0 1 20.8 6.6" {...line(color)} />
    </Svg>
  );
}

export function HeadphonesIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 16V12A8 8 0 0 1 20 12V16" {...line(color)} />
      <Rect x={4} y={14} width={3.6} height={7} rx={1.8} {...line(color)} />
      <Rect x={16.4} y={14} width={3.6} height={7} rx={1.8} {...line(color)} />
    </Svg>
  );
}
