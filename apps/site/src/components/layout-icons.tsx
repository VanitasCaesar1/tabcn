import type { SiteGroupId } from '@/lib/groups';

// Small pictures of each layout group for the docks and headings: the bottom of a
// phone screen with that kind of bar in it, plus a 2 x 2 grid for "All". 20 x 20, drawn in the
// current text colour.

export type IconGroup = SiteGroupId | 'all';

const SCREEN = 'M3.25 3v10.25a3.5 3.5 0 0 0 3.5 3.5h6.5a3.5 3.5 0 0 0 3.5-3.5V3';

const SHAPES: Record<SiteGroupId, React.ReactNode> = {
  // A pill floating above the bottom edge.
  floating: <rect x="6" y="10" width="8" height="3.5" rx="1.75" />,
  // A pill with a separate round button beside it.
  action: (
    <>
      <rect x="5.5" y="10" width="5.75" height="3.5" rx="1.75" />
      <circle cx="13.5" cy="11.75" r="1.75" />
    </>
  ),
  // A bar across the full width, resting on the bottom edge.
  docked: (
    <>
      <path d="M3.25 11.25h13.5" />
      <path d="M7 14h.01M10 14h.01M13 14h.01" />
    </>
  ),
  // Chips in a row that runs off the edge.
  rails: (
    <>
      <rect x="5.5" y="10.25" width="4" height="3" rx="1.5" />
      <path d="M16.75 10.25h-3.25a1.5 1.5 0 0 0 0 3h3.25" />
    </>
  ),
  // A card resting above a pill.
  panels: (
    <>
      <path d="M6.5 9.25v-2.5a1.25 1.25 0 0 1 1.25-1.25h4.5a1.25 1.25 0 0 1 1.25 1.25v2.5" />
      <rect x="5.5" y="10.75" width="9" height="3" rx="1.5" />
    </>
  ),
};

export function LayoutIcon({ group, className }: { group: IconGroup; className?: string }) {
  if (group === 'all') {
    return (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        aria-hidden
        className={className}
      >
        <rect x="3.5" y="3.5" width="5.25" height="5.25" rx="1.5" />
        <rect x="11.25" y="3.5" width="5.25" height="5.25" rx="1.5" />
        <rect x="3.5" y="11.25" width="5.25" height="5.25" rx="1.5" />
        <rect x="11.25" y="11.25" width="5.25" height="5.25" rx="1.5" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d={SCREEN} />
      {SHAPES[group]}
    </svg>
  );
}
