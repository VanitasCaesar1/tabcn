/**
 * Seek's display face: Instrument Serif (SIL Open Font License), for film titles, the hero line
 * and the wordmark. Everything else stays in the system face, so the serif reads as the film's
 * own voice and the interface stays plain.
 */
import { Typography } from 'panelui-native';
import type { ReactNode } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

export const DISPLAY = 'InstrumentSerif_400Regular';
export const DISPLAY_ITALIC = 'InstrumentSerif_400Regular_Italic';

export function Display({
  size,
  italic = false,
  align,
  className,
  style,
  numberOfLines,
  children,
}: {
  size: number;
  italic?: boolean;
  align?: 'center' | 'left';
  className?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  children: ReactNode;
}) {
  return (
    <Typography
      type="body"
      align={align}
      numberOfLines={numberOfLines}
      className={className}
      // A serif at display sizes wants a little less tracking and a tight line.
      style={[
        {
          fontFamily: italic ? DISPLAY_ITALIC : DISPLAY,
          fontSize: size,
          lineHeight: Math.round(size * 1.08),
          letterSpacing: -size * 0.012,
          fontWeight: 'normal',
        },
        style,
      ]}
    >
      {children}
    </Typography>
  );
}
