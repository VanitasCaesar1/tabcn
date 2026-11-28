import type { RenderMenuProps } from './types';

// The glass renderer is Android-only (glass.android.tsx). Everywhere else it is never available.

export function glassAvailable(): boolean {
  return false;
}

export function GlassMenu(_props: RenderMenuProps) {
  return null;
}
