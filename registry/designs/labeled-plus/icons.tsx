/** Icons drawn for the Labeled + Plus design. */
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

export function HomeIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M3.6 10.4 10.4 4.4Q12 3 13.6 4.4L20.4 10.4V18.4Q20.4 21 17.8 21H6.2Q3.6 21 3.6 18.4Z"
        fill={color}
      />
      <Path d="M8.6 16.2H15.4" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function CreatorIcon({ color, size }: TabIconProps) {
  const rays = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {rays.map((a) => (
        <Path
          key={a}
          d={`M${12 + Math.cos(a) * 4.2} ${12 + Math.sin(a) * 4.2}L${12 + Math.cos(a) * 8.6} ${12 + Math.sin(a) * 8.6}`}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}

export function ExploreIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3.2 7Q3.2 3.2 7 3.2H11V11H3.2Z" fill={color} />
      <Rect x={13} y={3.2} width={7.8} height={11} rx={1.4} fill={color} />
      <Rect x={3.2} y={13} width={7.8} height={7.8} rx={1.4} fill={color} />
      <Path d="M13 16.6H20.8V17Q20.8 20.8 17 20.8H13Z" fill={color} />
    </Svg>
  );
}

export function TemplatesIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle
        cx={12}
        cy={12}
        r={8.6}
        stroke={color}
        strokeWidth={2}
        strokeDasharray="4.2 2.6"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M12 7.6Q12.4 11.6 16.4 12 12.4 12.4 12 16.4 11.6 12.4 7.6 12 11.6 11.6 12 7.6Z"
        fill={color}
      />
    </Svg>
  );
}
