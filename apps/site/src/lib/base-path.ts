// The site is served from https://vanitascaesar1.github.io/tabcn/. next/link and the router add
// this on their own; plain asset URLs (video, img) go through `asset()`.
export const BASE_PATH = '/tabcn';

export function asset(path: string) {
  return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}
