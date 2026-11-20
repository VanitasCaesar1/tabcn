/** Icons drawn for the Top Notch design, on a 40-unit grid. Pass them as `tabBarIcon`. */
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

const stroke = (color: string, width = 2.7) => ({
  stroke: color,
  strokeWidth: width,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

const sparkle = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy - r}Q${cx + r * 0.18} ${cy - r * 0.18} ${cx + r} ${cy}Q${cx + r * 0.18} ${cy + r * 0.18} ${cx} ${cy + r}Q${cx - r * 0.18} ${cy + r * 0.18} ${cx - r} ${cy}Q${cx - r * 0.18} ${cy - r * 0.18} ${cx} ${cy - r}Z`;

export function TodayIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M1.6 36.4C4.6 31.8 8.2 27.4 12 25.4L18.4 24.4Q20.4 26.2 21.8 24.4C23.4 21.2 24.8 13.8 27 13.6 29.2 13.4 31.6 19 34 24.6L38.4 35Q38.9 36.4 37.4 36.4Z"
        {...stroke(color)}
      />
      <Circle cx={15} cy={23.4} r={4.3} fill={color} />
    </Svg>
  );
}

export function DiscoverIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d="M1.8 14Q6.2 8.2 11.2 11.4" {...stroke(color, 2.5)} />
      <Path d="M25.2 11Q29.8 7.8 34.6 12.6" {...stroke(color, 2.5)} />
      <Path d="M18.8 4.4V22.2Q18.8 26.4 15.4 26.4" {...stroke(color, 2.5)} />
      <Path d="M12.6 32.8H18.2" {...stroke(color, 2.5)} />
      <Circle cx={11.6} cy={32.8} r={1.6} fill={color} />
      <Path d="M21 28.8H32.4A3 3 0 1 0 29.6 25.8" {...stroke(color, 2.5)} />
      <Path d="M21 34.4H33.4A2.7 2.7 0 1 1 30.8 37.2" {...stroke(color, 2.5)} />
    </Svg>
  );
}

export function SleepIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d="M27 12.6A10.6 10.6 0 1 0 34 28.8 8.4 8.4 0 0 1 27 12.6Z" {...stroke(color)} />
      <Path d={sparkle(10.2, 14.6, 3.4)} fill={color} />
      <Path d={sparkle(20.6, 4, 2.6)} fill={color} />
    </Svg>
  );
}

export function CreateIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M20 37.4V24.4M20 24.4Q13.2 21.8 10.6 12.8L7.6 7M11.8 16.8 3.8 12M15.2 21.2 14.4 9.4M20 24.4Q26.8 21.8 29.4 12.8L32.4 7M28.2 16.8 36.2 12M24.8 21.2 25.6 9.4"
        {...stroke(color)}
      />
    </Svg>
  );
}

export function YouIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect x={1.6} y={7.6} width={36.8} height={29.6} rx={2.2} {...stroke(color)} />
      <Path d="M1.6 9.8Q1.6 7.6 3.8 7.6H36.2Q38.4 7.6 38.4 9.8V13.8H1.6Z" fill={color} />
      <Path d="M30.4 10.7H34.4" stroke="#f6f4ff" strokeWidth={1.4} strokeLinecap="round" />
      <Circle cx={9.4} cy={24.2} r={2.8} fill={color} />
      <Path d="M4.6 31.4Q4.6 27.8 9.4 27.8T14.2 31.4Z" fill={color} />
      <Path
        d="M17.2 30.2C18.8 27.4 19.6 23.6 21.2 23.6S23 27.8 24.6 27.8 26.6 21.8 28.4 21.8 31 26.6 32.8 30.2"
        {...stroke(color)}
      />
    </Svg>
  );
}
