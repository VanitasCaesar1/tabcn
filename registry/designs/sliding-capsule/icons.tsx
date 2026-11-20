/** Icons drawn for the Sliding Capsule design. */
import Svg, { Circle, Path } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

const line = (color: string) => ({
  stroke: color,
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

export function HomeIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 10.2 11 4.2Q12 3.4 13 4.2L20 10.2V18.8Q20 20.2 18.6 20.2H5.4Q4 20.2 4 18.8Z"
        {...line(color)}
      />
    </Svg>
  );
}

export function CardsIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5 5.4H19Q21 5.4 21 7.4V9.4Q19.4 9.4 19.4 11.4T21 13.4V16.6Q21 18.6 19 18.6H5Q3 18.6 3 16.6V7.4Q3 5.4 5 5.4Z"
        {...line(color)}
      />
      <Path d="M6.6 9.6H10" {...line(color)} />
    </Svg>
  );
}

export function RecipientsIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={9} cy={8.4} r={3.6} {...line(color)} />
      <Path d="M3 20Q3 13.8 9 13.8T15 20" {...line(color)} />
      <Path d="M13.6 4.9A3.6 3.6 0 1 1 15.6 11.6" {...line(color)} />
      <Path d="M17 13.9Q21 14.8 21 20" {...line(color)} />
    </Svg>
  );
}

export function PaymentsIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={4.6} r={2.1} {...line(color)} />
      <Circle cx={4.8} cy={16.4} r={2.1} {...line(color)} />
      <Circle cx={19.2} cy={16.4} r={2.1} {...line(color)} />
      <Path d="M14.6 5.6Q18.6 8 19.4 13.4" {...line(color)} />
      <Path d="M16.6 19.2Q12 21.6 7.2 19.4" {...line(color)} />
      <Path d="M4.2 13.6Q4.8 8.4 9.2 5.6" {...line(color)} />
    </Svg>
  );
}
