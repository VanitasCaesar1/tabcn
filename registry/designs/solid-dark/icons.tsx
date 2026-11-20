/** Icons drawn for the Solid Dark design: outline when inactive, filled when focused. */
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

const line = (color: string) => ({
  stroke: color,
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});
const paint = (color: string, focused: boolean) =>
  focused ? { ...line(color), fill: color } : line(color);

export function HomeIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 10.4 11 4.6Q12 3.8 13 4.6L20 10.4V18.6Q20 20.4 18.2 20.4H5.8Q4 20.4 4 18.6Z"
        {...paint(color, focused)}
      />
    </Svg>
  );
}

export function ChatIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 3.6A8.4 8.4 0 1 1 7.9 19.3L3.8 20.4 4.9 16.5A8.4 8.4 0 0 1 12 3.6Z"
        {...paint(color, focused)}
      />
    </Svg>
  );
}

export function CreateIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={8.8} {...line(color)} />
      <Path d="M12 8V16M8 12H16" {...line(color)} />
    </Svg>
  );
}

export function ConsoleIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4} y={3.8} width={16} height={16.4} rx={2.4} {...line(color)} />
      {focused ? (
        <Rect x={4} y={3.8} width={16} height={16.4} rx={2.4} fill={color} opacity={0.25} />
      ) : null}
      <Circle cx={8} cy={16} r={1.1} fill={color} />
      <Path d="M11 16H16" {...line(color)} />
    </Svg>
  );
}

export function ProfileIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} {...paint(color, focused)} />
      <Circle cx={12} cy={9.6} r={3.2} fill={focused ? '#0b0b0d' : color} />
      <Path
        d="M6.4 17.8Q8.4 14.4 12 14.4T17.6 17.8"
        {...line(focused ? '#0b0b0d' : color)}
        fill={focused ? '#0b0b0d' : 'none'}
      />
    </Svg>
  );
}
