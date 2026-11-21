import { cn } from '@/lib/cn';

// The favicon's drawing (src/app/icon.svg) in the current text colour: a rounded screen with a
// floating pill at its foot, the first tab selected.
export function Logomark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden
      className={cn('size-5 shrink-0', className)}
      fill="currentColor"
    >
      <rect
        x="2.5"
        y="2.5"
        width="59"
        height="59"
        rx="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
      />
      <rect x="9" y="38" width="46" height="16" rx="8" fillOpacity="0.22" />
      <rect x="12" y="41" width="18" height="10" rx="5" />
      <circle cx="38" cy="46" r="2.5" fillOpacity="0.55" />
      <circle cx="47" cy="46" r="2.5" fillOpacity="0.55" />
    </svg>
  );
}
