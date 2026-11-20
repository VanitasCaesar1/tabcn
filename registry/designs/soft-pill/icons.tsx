/** Line icons drawn for the Soft Pill design. */
import Svg, { Circle, Path } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

const line = (color: string) => ({
  stroke: color,
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

export function HomeIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M3.6 10.6Q3.6 9.4 4.6 8.6L10.6 4Q12 3 13.4 4L19.4 8.6Q20.4 9.4 20.4 10.6V17.4Q20.4 20.4 17.4 20.4H6.6Q3.6 20.4 3.6 17.4Z"
        {...line(color)}
      />
      <Path d="M7.4 14.4Q12 18 16.6 14.4" {...line(color)} />
    </Svg>
  );
}

export function IdeasIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 16.4Q9 14.6 7.6 13.2A6 6 0 1 1 16.4 13.2Q15 14.6 15 16.4Z" {...line(color)} />
      <Path d="M9.6 19.6H14.4M10.6 22H13.4" {...line(color)} />
    </Svg>
  );
}

export function ExploreIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} {...line(color)} />
      <Path d="M15.6 8.4 13.2 13.2 8.4 15.6 10.8 10.8Z" {...line(color)} fill={color} />
    </Svg>
  );
}

export function HistoryIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 6.4Q8.6 4.2 3 4.8V18.4Q8.6 17.8 12 20Q15.4 17.8 21 18.4V4.8Q15.4 4.2 12 6.4Z"
        {...line(color)}
      />
      <Path d="M12 6.4V20" {...line(color)} />
    </Svg>
  );
}

export function TrendsIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 20V12M8 20V7M12 20V3.6M16 20V9M20 20V13" {...line(color)} />
    </Svg>
  );
}
