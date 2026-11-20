/** Icons drawn for the Glow Glass design: line icons that fill when focused. */
import Svg, { Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

const line = (color: string) => ({
  stroke: color,
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

export function HomeIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 10 11 4.2Q12 3.4 13 4.2L20 10V19Q20 20.4 18.6 20.4H14.6V15.4H9.4V20.4H5.4Q4 20.4 4 19Z"
        {...line(color)}
        fill={focused ? color : 'none'}
      />
    </Svg>
  );
}

export function MarketsIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3.4 3.4V20.6H20.6" {...line(color)} />
      <Path d="M6.4 15.6 10.4 9.8 13.6 13 19.6 6.4" {...line(color)} />
    </Svg>
  );
}

export function TradeIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4.4 11V9.4Q4.4 7 6.8 7H19.6M16.4 3.8 19.6 7 16.4 10.2" {...line(color)} />
      <Path d="M19.6 13V14.6Q19.6 17 17.2 17H4.4M7.6 20.2 4.4 17 7.6 13.8" {...line(color)} />
    </Svg>
  );
}

export function PortfolioIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 7.4 15.6 4Q17.4 3.6 17.4 5.4V7.4" {...line(color)} />
      <Rect x={3.4} y={7.4} width={17.2} height={13} rx={2.2} {...line(color)} />
      <Path d="M16.4 13.8H16.6" {...line(color)} strokeWidth={2.4} />
    </Svg>
  );
}

export function SpendIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={2.8} y={5} width={18.4} height={14} rx={2.4} {...line(color)} />
      <Path d="M2.8 10H21.2M14 15H17.6" {...line(color)} />
    </Svg>
  );
}
