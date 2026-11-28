import type { RenderMenuProps } from './types';

// The system renderer is iOS-only (system.ios.tsx). Everywhere else it is never available.

export function systemAvailable(): boolean {
  return false;
}

export function SystemMenu(_props: RenderMenuProps) {
  return null;
}

export function SystemContextMenu(_props: RenderMenuProps) {
  return null;
}
