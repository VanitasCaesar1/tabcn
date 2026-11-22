// The web build draws the demo's own sheet: TrueSheet's web build needs packages the example
// app doesn't install.
import type { TrueSheet as TrueSheetType } from '@lodev09/react-native-true-sheet';

export const TrueSheet: typeof TrueSheetType | null = null;
