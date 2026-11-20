/// <reference types="next" />
/// <reference types="next/image-types/global" />

// Side-effect stylesheet imports (layout.tsx). Next's generated next-env.d.ts isn't committed,
// so `tsc --noEmit` on a fresh checkout needs this.
declare module '*.css';
