/** Icons drawn for the Top Notch design. Pass them as `tabBarIcon`. */
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

const line = (color: string) => ({
  stroke: color,
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

const sparkle = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z`;

export function TodayIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M2.5 18.5C4.5 15 5.8 9.5 8.3 9.5S10.6 13 12.2 13 14 6 16.8 6 20 13.5 21.5 18.5Z"
        {...line(color)}
      />
      <Circle cx={8.4} cy={10.2} r={2.6} fill={color} />
    </Svg>
  );
}

export function DiscoverIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M2.8 7.2Q5 4.4 7.6 6.6" {...line(color)} />
      <Path d="M15.6 5.4Q18.2 3.6 20.6 6.4" {...line(color)} />
      <Path d="M11.6 2.6V12.6Q11.6 14.4 9.8 14.4" {...line(color)} />
      <Circle cx={8.6} cy={17.4} r={1} fill={color} />
      <Path d="M11 16.6H18.4A1.8 1.8 0 1 0 16.6 14.8" {...line(color)} />
      <Path d="M11 19.6H19.6A1.7 1.7 0 1 1 17.9 21.3" {...line(color)} />
    </Svg>
  );
}

export function SleepIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M13.2 5.4A7.6 7.6 0 1 0 20.6 15.6 6.2 6.2 0 0 1 13.2 5.4Z" {...line(color)} />
      <Path d={sparkle(5.6, 6.6, 2.2)} fill={color} />
      <Path d={sparkle(16.6, 2.6, 1.5)} fill={color} />
    </Svg>
  );
}

export function CreateIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 22V9.5M12 14.5 7 9.6 5 3.6M7 9.6 3.6 7.6M12 12.4 16.8 7.6 18 3M16.8 7.6 20.4 5.6M12 9.5 10.8 3.4M12 9.5 13.8 2.8"
        {...line(color)}
      />
    </Svg>
  );
}

export function YouIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={2.6} y={3.6} width={18.8} height={16.8} rx={1.6} {...line(color)} />
      <Path d="M2.6 7.4H21.4" {...line(color)} />
      <Circle cx={8} cy={12.2} r={1.7} fill={color} />
      <Path d="M5.2 17.4Q8 13.4 10.8 17.4Z" fill={color} />
      <Path d="M12.4 16.4 14.4 13 15.8 15.2 17.4 12.2 19.2 16.4" {...line(color)} />
    </Svg>
  );
}
