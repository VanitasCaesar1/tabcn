/**
 * The screen's size, as the navigator's safe-area provider measures it. Both adapters provide
 * it (both navigators come with react-native-safe-area-context), and `TabBarRoot` sizes
 * sheets from it. Without it (a design rendered with `TabBarStateProvider` alone, as in tests
 * and previews) `TabBarRoot` uses the window's size. Internal.
 */
import { createContext } from 'react';

export interface ScreenFrame {
  width: number;
  height: number;
}

export const ScreenFrameContext = createContext<ScreenFrame | null>(null);
