/** Icons drawn for the Frosted Media design. */
import Svg, { Circle, Path } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

export function BlobIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M11.4 3.2Q16.4 2.6 19.4 6.4 22 10.2 20.2 15 18 20.4 12 20.8 6 21 3.8 16.2 2 11.6 5 7.2 7.6 3.8 11.4 3.2Z"
        stroke={color}
        strokeWidth={2.6}
        fill="none"
      />
    </Svg>
  );
}

export function DotsIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={7.2} cy={7.2} r={4.2} fill={color} />
      <Circle cx={16.8} cy={7.2} r={4.2} fill={color} />
      <Circle cx={7.2} cy={16.8} r={4.2} fill={color} />
      <Circle cx={16.8} cy={16.8} r={4.2} fill={color} />
    </Svg>
  );
}

export function PlayIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 3.6Q6 2.4 7.1 3L20.2 11Q21.2 11.6 20.2 12.6L7.1 20.6Q6 21.2 6 20Z" fill={color} />
    </Svg>
  );
}
