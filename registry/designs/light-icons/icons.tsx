/** Icons drawn for the Light Icons design: outline when inactive, filled when focused. */
import Svg, { Circle, Path } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

const line = (color: string) => ({
  stroke: color,
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

export function HookIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M8.2 6.6A3.6 3.6 0 1 1 12.6 10.4Q10.6 11.4 11.8 13.6L14.2 17.4A2.2 2.2 0 1 0 17.8 15"
        {...line(color)}
        strokeWidth={focused ? 3.4 : 3}
      />
      <Circle cx={8.4} cy={6.8} r={focused ? 1.9 : 1.5} fill={color} />
    </Svg>
  );
}

export function SearchIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={10.6} cy={10.6} r={6.8} {...line(color)} strokeWidth={focused ? 2.8 : 2.2} />
      <Path d="M15.8 15.8 20.6 20.6" {...line(color)} strokeWidth={focused ? 2.8 : 2.2} />
    </Svg>
  );
}

export function RecordIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9.2} {...line(color)} />
      <Circle cx={12} cy={12} r={4.4} fill={color} />
    </Svg>
  );
}

export function BubbleIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12.4 3.4C17.6 3.4 21 6.8 21 11.2S17.4 19 12.4 19Q10.6 19 9 18.4L4 20.6 5.2 16.4Q3.6 14.2 3.6 11.2C3.6 6.8 7.2 3.4 12.4 3.4Z"
        {...line(color)}
        fill={focused ? color : 'none'}
      />
    </Svg>
  );
}

export function PersonIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={7.8} r={3.9} {...line(color)} fill={focused ? color : 'none'} />
      <Path
        d="M4.6 19.4Q4.6 14.6 12 14.6T19.4 19.4Q19.4 20.6 18.2 20.6H5.8Q4.6 20.6 4.6 19.4Z"
        {...line(color)}
        fill={focused ? color : 'none'}
      />
    </Svg>
  );
}
