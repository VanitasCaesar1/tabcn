// The home page board's data: which tab bars it shows, in what order, and the layout groups its
// dock jumps between. Server only: it checks public/bars while the static export renders.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Layout } from '../../../example/src/catalog';
import { asset } from './base-path';
import type { Design } from './designs';

export type GroupId = 'floating' | 'action' | 'docked' | 'rails';

/** The dock's tabs, left to right. The board walks the groups in this order too. */
export const GROUPS: { id: GroupId; label: string }[] = [
  { id: 'floating', label: 'Floating' },
  { id: 'action', label: 'Action' },
  { id: 'docked', label: 'Docked' },
  { id: 'rails', label: 'Rails' },
];

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

/** The bar the board opens on: strong contrast and an orange glow in both themes. */
export const BOARD_START = 'glow-glass';

export interface BoardItem {
  id: string;
  title: string;
  layoutLabel: string;
  /** Index into the board's groups. */
  group: number;
  /** basePath-aware URLs of the cropped bar loop (804 x 280) and its poster. */
  video: string;
  poster: string;
}

export interface BoardGroup {
  id: GroupId;
  label: string;
  count: number;
  /** Index of the group's first bar in the board order. */
  start: number;
}

// The bar loops cut from the simulator recordings by scripts/bar-loops.py.
const barsDir = join(process.cwd(), 'public', 'bars');

const hasLoop = (id: string) =>
  existsSync(join(barsDir, `${id}.mp4`)) && existsSync(join(barsDir, `${id}.jpg`));

/**
 * Every tab bar that has a loop, group by group in dock order, newest first inside each group.
 * A bar without a loop yet stays off the board until scripts/bar-loops.py cuts one; its own page
 * still lists it. Groups with no bars are left out, so every dock tab has somewhere to go.
 */
export function buildBoard(designs: Design[]) {
  const bars = designs.filter((d) => d.kind === 'bar' && hasLoop(d.id)).reverse();
  const items: BoardItem[] = [];
  const groups: BoardGroup[] = [];
  for (const g of GROUPS) {
    const members = bars.filter((d) => GROUP_OF[d.layout] === g.id);
    if (members.length === 0) continue;
    const group = groups.length;
    groups.push({ id: g.id, label: g.label, count: members.length, start: items.length });
    for (const d of members) {
      items.push({
        id: d.id,
        title: d.title,
        layoutLabel: d.layoutLabel,
        group,
        video: asset(`/bars/${d.id}.mp4`),
        poster: asset(`/bars/${d.id}.jpg`),
      });
    }
  }
  const startIndex = Math.max(
    0,
    items.findIndex((i) => i.id === BOARD_START),
  );
  return { items, groups, groupStart: groups.map((g) => g.start), startIndex };
}
