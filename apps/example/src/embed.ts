/**
 * The site's live previews (apps/site, "Live preview") embed this app's web build in an iframe
 * at /tabcn/preview/?embed=1&design=<id>&theme=<family>. In that mode the app opens straight on
 * the design, without the stack header or the demo's own controls, and takes theme changes from
 * the page around it. Read once at startup, before the router drops the query.
 */
import { Platform } from 'react-native';

export interface Embed {
  design: string | null;
  theme: string | null;
}

function read(): Embed | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const query = new URLSearchParams(window.location.search);
  if (query.get('embed') !== '1') return null;
  return { design: query.get('design'), theme: query.get('theme') };
}

export const embed = read();

/** Tells the page around the preview something happened (only same-origin pages listen). */
export function notifyParent(message: { type: 'tabcn:ready' }) {
  if (!embed || typeof window === 'undefined' || window.parent === window) return;
  window.parent.postMessage(message, window.location.origin);
}
