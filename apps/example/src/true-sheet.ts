// TrueSheet (the native iOS 26 inset sheet) for the Composer Dock demo, when the app's native
// build links it. Expo Go doesn't include it, and the package throws on import when it isn't
// linked, so it's required only after checking. The web build uses true-sheet.web.ts instead.
import type { TrueSheet as TrueSheetType } from '@lodev09/react-native-true-sheet';
import { TurboModuleRegistry } from 'react-native';

export const TrueSheet: typeof TrueSheetType | null =
  TurboModuleRegistry.get('TrueSheetModule') != null
    ? require('@lodev09/react-native-true-sheet').TrueSheet
    : null;
