// The five groups the site sorts designs into: the board's four layout groups and the panels.
// Plain data with no file-system access, so client components can import it too (board.ts and
// designs.ts read the disk and stay on the server).
import type { Layout } from '../../../example/src/catalog';

export type GroupId = 'floating' | 'action' | 'docked' | 'rails';

/** A board group, or the panels, which the board leaves out but the rest of the site lists. */
export type SiteGroupId = GroupId | 'panels';

/** The board dock's tabs, left to right. The board walks the groups in this order too. */
export const GROUPS: { id: GroupId; label: string }[] = [
  { id: 'floating', label: 'Floating' },
  { id: 'action', label: 'Action' },
  { id: 'docked', label: 'Docked' },
  { id: 'rails', label: 'Rails' },
];

/** The catalogue, sidebar and footer: the board's groups, then the panels. */
export const SITE_GROUPS: { id: SiteGroupId; label: string }[] = [
  ...GROUPS,
  { id: 'panels', label: 'Panels' },
];

/** One line under each group's heading in the catalogue. */
export const GROUP_NOTES: Record<SiteGroupId, string> = {
  floating: 'Pills and buttons that hover above the bottom edge.',
  action: 'A bar plus a separate primary action.',
  docked: 'Full-width bars on the bottom edge, and the sheet.',
  rails: 'Chips that scroll, and a rail for wide screens.',
  panels: 'Sheets, trays and players drawn behind a bar.',
};

/** Every layout needs a group here (TypeScript says so when one is added). Panels sit out. */
export const GROUP_OF: Record<Layout, GroupId | null> = {
  'floating-pill': 'floating',
  'floating-buttons': 'floating',
  'pill-with-action': 'action',
  'center-action': 'action',
  'docked-bar': 'docked',
  'chip-rail': 'rails',
  'side-rail': 'rails',
  // A sheet resting across the bottom edge sits with the docked bars.
  sheet: 'docked',
  panel: null,
};

export function siteGroupOf(layout: Layout): SiteGroupId {
  return GROUP_OF[layout] ?? 'panels';
}

export function isSiteGroup(value: string): value is SiteGroupId {
  return SITE_GROUPS.some((g) => g.id === value);
}

/**
 * The group a `?c=` value means: a group id as is, or a layout id from the links made before the
 * groups (`?c=docked-bar`) mapped to its group. Anything else is null.
 */
export function legacyGroup(c: string | null): SiteGroupId | null {
  if (!c) return null;
  if (isSiteGroup(c)) return c;
  return c in GROUP_OF ? siteGroupOf(c as Layout) : null;
}
