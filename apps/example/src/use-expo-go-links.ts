import { router } from 'expo-router';
import { useEffect } from 'react';
import { Linking } from 'react-native';

let handledInitial = false;

function routeOf(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = url.indexOf('/--/');
  if (marker < 0) return null;
  const path = url.slice(marker + 3).split('?')[0] ?? '';
  return path && path !== '/' ? path : null;
}

/**
 * Expo Go opens a published update with a URL like
 * exp://u.expo.dev/<project>/group/<group>/--/designs/orbs/t2 but doesn't route on the part
 * after `/--/`, so the app lands on the gallery. Route on it once the navigator is ready
 * (call this from the first screen), and for links opened while the app runs.
 */
export function useExpoGoLinks() {
  useEffect(() => {
    if (!handledInitial) {
      handledInitial = true;
      Linking.getInitialURL().then((url) => {
        const path = routeOf(url);
        if (path) router.push(path as never);
      });
    }
    const sub = Linking.addEventListener('url', ({ url }) => {
      const path = routeOf(url);
      if (path) router.push(path as never);
    });
    return () => sub.remove();
  }, []);
}
