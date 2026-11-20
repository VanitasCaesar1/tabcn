/** Filled icons drawn for the Glass Expand design. */
import Svg, { Path } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

export function SneakerIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M2.4 18.2 3.6 14.4Q4.4 13 5.6 13.6L8.4 15 15.4 7.4Q16.6 6.2 18 6.8L21 8.2Q22 8.8 21.4 9.8L13.6 19.6Q12.6 20.8 11 20.6L3.6 19.8Q2.2 19.6 2.4 18.2Z"
        fill={color}
      />
      <Path
        d="M9.6 13.2 12 10.6M11.6 15 14 12.4"
        stroke="#c4bdff"
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function DropIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2.6Q19.4 10.2 19.4 14.6A7.4 7.4 0 0 1 4.6 14.6Q4.6 10.2 12 2.6Z" fill={color} />
      <Path
        d="M8.8 14.6Q9 17.6 11.8 18"
        stroke="#c4bdff"
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

export function SparkleIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M10 5Q10.8 12 18 13 10.8 14 10 21 9.2 14 2 13 9.2 12 10 5Z"
        fill={color}
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <Path
        d="M18.6 2Q19 4.6 21.6 5 19 5.4 18.6 8 18.2 5.4 15.6 5 18.2 4.6 18.6 2Z"
        fill={color}
        stroke={color}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
