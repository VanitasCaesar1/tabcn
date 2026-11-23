/**
 * The site's live previews (apps/site, "Live preview") embed this app's web build in an iframe
 * at /tabcn/preview/?embed=1&design=<id>&theme=<family>[&rtl=1]. In that mode the app opens
 * straight on the design, without the demo's own controls, and takes changes from the page around
 * it: the theme (`tabcn:theme`) and the Customize panel's settings (`tabcn:settings`, see
 * preview-settings.ts). Read once at startup, before the router drops the query.
 */
import { useSyncExternalStore } from 'react';
import { I18nManager, Platform } from 'react-native';

import { type PreviewSettings, SETTINGS_MESSAGE } from '@/preview-settings';

export interface Embed {
  design: string | null;
  theme: string | null;
  /** Lay the app out right to left (`&rtl=1`); the site reloads the iframe to change it. */
  rtl: boolean;
}

function read(): Embed | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const query = new URLSearchParams(window.location.search);
  if (query.get('embed') !== '1') return null;
  return { design: query.get('design'), theme: query.get('theme'), rtl: query.get('rtl') === '1' };
}

export const embed = read();

/**
 * Right to left on the web. react-native-web's I18nManager always says left to right and its
 * forceRTL does nothing, so the page's direction is set on <html> (flex rows and text follow it)
 * and I18nManager is told the same, for designs that read it. The web never swaps `left` and
 * `right` in styles, so it reports `doLeftAndRightSwapInRTL: false`, as a native app that turns
 * the swap off does; the designs already handle that case. Runs before any design module loads.
 */
if (embed?.rtl && typeof document !== 'undefined') {
  document.documentElement.dir = 'rtl';
  const constants = { isRTL: true, doLeftAndRightSwapInRTL: false, localeIdentifier: 'ar' };
  Object.assign(I18nManager, { isRTL: true, getConstants: () => constants });
}

/** Tells the page around the preview something happened (only same-origin pages listen). */
export function notifyParent(message: { type: 'tabcn:ready' }) {
  if (!embed || typeof window === 'undefined' || window.parent === window) return;
  window.parent.postMessage(message, window.location.origin);
}

// The latest settings from the site's Customize panel, kept for every screen to read.
let settings: PreviewSettings = {};
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSettings = () => settings;

if (embed && typeof window !== 'undefined') {
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data as { type?: string; settings?: unknown } | null;
    if (data?.type !== SETTINGS_MESSAGE || !data.settings || typeof data.settings !== 'object') {
      return;
    }
    settings = { ...(data.settings as PreviewSettings) };
    for (const listener of listeners) listener();
  });
}

/** The Customize panel's current settings; empty outside the site's live preview. */
export function usePreviewSettings(): PreviewSettings {
  return useSyncExternalStore(subscribe, getSettings, getSettings);
}
