// Build-time data for every page: the catalog (ids, titles, layout groups) from the example app,
// descriptions from registry/registry.json, and facts read from each design's source. Server
// only: it reads the file system while the static export renders.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { catalog, type DesignKind, LAYOUT_LABELS, type Layout } from '../../../example/src/catalog';
import { DEMO_CONTROLS, type DemoControls } from '../../../example/src/demo-controls';
import { DESIGN_TAGS, type DesignStyle, STYLES } from '../../../example/src/design-tags';
import registry from '../../../../registry/registry.json';
import type { DesignProps } from '../../../../scripts/design-props';
import { asset } from './base-path';
import { GROUP_NOTES, GROUP_OF, SITE_GROUPS, type SiteGroupId, siteGroupOf } from './groups';
import { absoluteUrl } from './site';
import { PANEL_BARS, PANEL_USAGE, type UsageDesign, usageFor } from './usage';

export { legacyGroup } from './groups';

const root = join(process.cwd(), '../..');
const publicDir = join(process.cwd(), 'public');
// The example app's web build, for live previews; see scripts/build-preview.ts.
const hasPreview = existsSync(join(publicDir, 'preview', 'index.html'));
// Designs PanelUI Colors has a mapping for: the keys of `panelUIColorMaps`.
const panelUISource = readFileSync(join(root, 'registry/themes/panelui-colors.ts'), 'utf8');
const panelUIIds = new Set(
  [
    ...panelUISource
      .slice(panelUISource.indexOf('export const panelUIColorMaps'))
      .matchAll(/^ {2}'?([a-z-]+)'?: \{/gm),
  ].map((m) => m[1]),
);
// Designs the example app draws in the PanelUI theme picked: `themed('<id>', …)` in its demos.
const themedIds = new Set(
  ['demos.tsx', 'panel-demos.tsx'].flatMap((file) =>
    [
      ...readFileSync(join(root, 'apps/example/src', file), 'utf8').matchAll(/themed\('([a-z-]+)'/g),
    ].map((m) => m[1]),
  ),
);

export interface Design {
  id: string;
  /** Reference image number, or 0 for a design from outside the reference set. */
  ref: number;
  title: string;
  /** A tab bar (passed to `tabBar()`), or a panel drawn behind one (needs `TabBarProvider`). */
  kind: DesignKind;
  description: string;
  layout: Layout;
  layoutLabel: string;
  /** The layout group it's filtered by: Floating, Docked, With action, Rails, or the panels. */
  group: SiteGroupId;
  /** What it looks like at a glance (apps/example/src/design-tags.ts): the gallery's first filter. */
  style: DesignStyle;
  styleLabel: string;
  /** The light or dark palette of the app screen it's shown in. */
  scheme: 'light' | 'dark';
  /** The Customize panel's optional controls this design takes (apps/example/src/demo-controls.ts). */
  controls: DemoControls;
  /** The files the registry copies in, for the Code tab: the name it lands under and its text. */
  sources: { name: string; code: string }[];
  /** The demo screen's colour behind the bar (`#rrggbb`), from the example app's demos. */
  background: string;
  /** The exported component, e.g. `SlidingCapsule`. */
  component: string;
  /** The design takes a required `onActionPress` (it has a separate action button). */
  hasAction: boolean;
  /** Icon components exported from the design's icons file, if it ships one. */
  icons: string[];
  iconsFile: string | null;
  /** basePath-aware URLs, or null while the recording is missing. */
  video: string | null;
  poster: string | null;
  /**
   * basePath-aware URL of the live preview: the example app's web build opened on this design
   * (scripts/build-preview.ts). Null when the site was built without it.
   */
  preview: string | null;
  /** The preview's PanelUI theme switch recolours this design (see the example's `themed()`). */
  themed: boolean;
  /** PanelUI Colors maps this design's colours (registry/themes/panelui-colors.ts). */
  panelUI: boolean;
  /** Absolute URL of the link-preview image: its own, or the site's while it's missing. */
  ogImage: string;
  /** basePath-aware URLs of the tab bar stills, one per tab state, in order. */
  stills: string[];
  /** basePath-aware URLs of the cropped loop (public/bars) and its poster, or null. */
  loop: string | null;
  loopPoster: string | null;
  /** A small picture of the bar (138 x 48) for the sidebar, search and list rows. */
  thumb: string | null;
  /** For a panel without its own crop yet: a still to show in its place. */
  fallbackPoster: string | null;
  /** The newest design, as the hero's "New" link picks it. */
  isNew: boolean;
  /** A panel's bar in the example app (its title), or null. */
  pairedBar: string | null;
  /** How many tabs the example app's demo shows, or null if it can't be read. */
  tabs: number | null;
  /** The component's props, read from its source by scripts/design-props.ts. */
  props: DesignProps;
}

/** The part of a design the client components need. */
export interface DesignSummary {
  id: string;
  title: string;
  description: string;
  layout: Layout;
  layoutLabel: string;
  group: SiteGroupId;
  style: DesignStyle;
  styleLabel: string;
  thumb: string | null;
}

function ogImage(id: string) {
  return existsSync(join(publicDir, 'og', `${id}.jpg`))
    ? absoluteUrl(`/og/${id}.jpg`)
    : absoluteUrl('/og.jpg');
}

function media(file: string) {
  return existsSync(join(publicDir, 'videos', file)) ? asset(`/videos/${file}`) : null;
}

const stillFiles = existsSync(join(publicDir, 'stills'))
  ? readdirSync(join(publicDir, 'stills'))
  : [];

/** `public/stills/<id>-<n>.jpg`, sorted by n. */
function stills(id: string) {
  return stillFiles
    .map((file) => ({ file, n: Number(file.match(new RegExp(`^${id}-(\\d+)\\.jpg$`))?.[1]) }))
    .filter((s) => s.n > 0)
    .sort((a, b) => a.n - b.n)
    .map((s) => asset(`/stills/${s.file}`));
}

// The demos file imports React Native, so it's read as text: each design's block in `demos`
// lists its tabs as `{ label: ... }` lines inside `tabs: [ ... ]`.
const demosSource = readFileSync(join(root, 'apps/example/src/demos.tsx'), 'utf8');
const demosBody = demosSource.slice(demosSource.indexOf('export const demos'));

function tabCount(id: string) {
  const block = demoBlock(id);
  if (!block) return null;
  const list = block.match(/tabs: \[([\s\S]*?)\n {4}\]/)?.[1];
  const n = list?.match(/\{ label:/g)?.length ?? 0;
  return n > 0 ? n : null;
}

function demoBlock(id: string) {
  const start = demosBody.search(new RegExp(`^  '?${id}'?: \\{$`, 'm'));
  if (start < 0) return null;
  const rest = demosBody.slice(start + 1);
  const next = rest.search(/^ {2}'?[\w-]+'?: \{$/m);
  return next < 0 ? rest : rest.slice(0, next);
}

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * The demo screen's `background`: a hex literal, or a named constant declared at the top of
 * demos.tsx or exported by the registry file it imports from. Throws if neither is found, so a
 * new design can't ship without its tile colour.
 */
function demoBackground(id: string) {
  const value = demoBlock(id)?.match(/^ {4}background: (.+),$/m)?.[1]?.trim();
  if (!value) throw new Error(`${id}: no background in apps/example/src/demos.tsx`);
  const literal = value.match(/^'(#[0-9a-fA-F]{6})'$/)?.[1];
  if (literal) return literal.toLowerCase();
  if (!/^\w+$/.test(value)) throw new Error(`${id}: can't read background ${value}`);
  const constant = new RegExp(`^(?:export )?const ${value} = '(#[0-9a-fA-F]{6})'`, 'm');
  const local = demosSource.match(constant)?.[1];
  if (local) return local.toLowerCase();
  const from = demosSource
    .match(new RegExp(`^import \\{[^}]*\\b${value}\\b[^}]*\\} from '@registry/([\\w/-]+)';`, 'm'))
    ?.at(1);
  const file = from ? join(root, 'registry/designs', `${from}.tsx`) : null;
  const imported = file && existsSync(file) ? readFileSync(file, 'utf8').match(constant)?.[1] : null;
  if (imported && HEX.test(imported)) return imported.toLowerCase();
  throw new Error(`${id}: can't resolve background ${value} to a hex colour`);
}

// The bar loops and thumbnails cut by scripts/bar-loops.py.
const barsDir = join(publicDir, 'bars');
const bar = (file: string) => (existsSync(join(barsDir, file)) ? asset(`/bars/${file}`) : null);

// Written by scripts/build-props.ts before `next build` (it needs the TypeScript compiler,
// which the site doesn't bundle).
const propsFile = join(process.cwd(), 'generated/design-props.json');
if (!existsSync(propsFile)) {
  throw new Error('generated/design-props.json is missing: run `bun scripts/build-props.ts`');
}
const propsData = JSON.parse(readFileSync(propsFile, 'utf8')) as Record<string, DesignProps>;

function load(): Design[] {
  return catalog.map((entry, index) => {
    const item = registry.items.find((i) => i.name === entry.id);
    if (!item) throw new Error(`${entry.id} is in the catalog but not in registry/registry.json`);
    const main = item.files.find((f) => f.path.endsWith(`/${entry.id}.tsx`));
    if (!main) throw new Error(`${entry.id}: registry entry has no ${entry.id}.tsx`);
    const source = readFileSync(join(root, main.path), 'utf8');
    const component = source.match(/^export function (\w+)\(/m)?.[1];
    if (!component) throw new Error(`${entry.id}: no exported component in ${main.path}`);
    const props = propsData[entry.id];
    if (!props) throw new Error(`${entry.id}: no props in generated/design-props.json`);
    const iconsEntry = item.files.find((f) => f.path.endsWith('/icons.tsx'));
    const icons = iconsEntry
      ? [
          ...readFileSync(join(root, iconsEntry.path), 'utf8').matchAll(
            /^export function (\w+Icon)\(/gm,
          ),
        ].map((m) => m[1] as string)
      : [];
    const loop = bar(`${entry.id}.mp4`);
    const loopPoster = bar(`${entry.id}.jpg`);
    const hasLoop = loop !== null && loopPoster !== null;
    const stillList = stills(entry.id);
    const fallbackPoster =
      entry.kind === 'panel' && !hasLoop ? (stillList[1] ?? stillList[0] ?? null) : null;
    const pairedId = PANEL_USAGE[entry.id]?.barId ?? PANEL_BARS[entry.id];
    const tags = DESIGN_TAGS[entry.id];
    if (!tags) throw new Error(`${entry.id}: no entry in apps/example/src/design-tags.ts`);
    return {
      id: entry.id,
      ref: entry.ref,
      title: entry.title,
      kind: entry.kind,
      description: item.description,
      layout: entry.layout,
      layoutLabel: LAYOUT_LABELS[entry.layout],
      group: siteGroupOf(entry.layout),
      style: tags.style,
      styleLabel: STYLES.find((s) => s.id === tags.style)?.label ?? tags.style,
      scheme: tags.scheme,
      controls: DEMO_CONTROLS[entry.id] ?? {},
      sources: item.files.map((f) => ({
        name: basename(f.target),
        code: readFileSync(join(root, f.path), 'utf8'),
      })),
      background: demoBackground(entry.id),
      component,
      hasAction: /^\s+onActionPress: /m.test(source),
      icons,
      iconsFile: iconsEntry ? iconsEntry.target.replace(/\.tsx$/, '') : null,
      video: media(`${entry.id}.mp4`),
      preview: hasPreview ? asset(`/preview/?embed=1&design=${entry.id}`) : null,
      themed: themedIds.has(entry.id),
      panelUI: panelUIIds.has(entry.id),
      poster: media(`${entry.id}.jpg`),
      ogImage: ogImage(entry.id),
      stills: stillList,
      loop: hasLoop ? loop : null,
      loopPoster: hasLoop ? loopPoster : null,
      thumb: bar(`${entry.id}-thumb.jpg`) ?? (hasLoop ? loopPoster : fallbackPoster),
      fallbackPoster,
      isNew: index === catalog.length - 1,
      pairedBar: pairedId ? (catalog.find((c) => c.id === pairedId)?.title ?? null) : null,
      tabs: tabCount(entry.id),
      props,
    };
  });
}

export const designs = load();

const layoutOrder = Object.keys(LAYOUT_LABELS) as Layout[];

/**
 * The five site groups in SITE_GROUPS order. Inside a group, designs go layout by layout (in
 * LAYOUT_LABELS order, each a sub-head in the sidebar), then in catalog order.
 */
export const groups = SITE_GROUPS.map(({ id, label }) => {
  const layouts = layoutOrder
    .filter((layout) => (GROUP_OF[layout] ?? 'panels') === id)
    .map((layout) => ({
      layout,
      label: LAYOUT_LABELS[layout],
      items: designs.filter((d) => d.layout === layout),
    }))
    .filter((l) => l.items.length > 0);
  return { id, label, note: GROUP_NOTES[id], layouts, items: layouts.flatMap((l) => l.items) };
}).filter((g) => g.items.length > 0);

/** The layout groups with their counts, for the gallery's layout filter. */
export const siteGroups = groups.map(({ id, label, items }) => ({ id, label, count: items.length }));

/** A section of the sidebar and the gallery: the tab bars of one style, or all the panels. */
export type SectionId = DesignStyle | 'panels';

/**
 * The tab bars by style, in STYLES order (catalog order inside each), then the panels in their
 * own section: the sidebar, the gallery and the footer list them this way.
 */
export const sections = [
  ...STYLES.map(({ id, label, note }) => ({
    id: id as SectionId,
    label,
    note,
    items: designs.filter((d) => d.kind === 'bar' && d.style === id),
  })),
  {
    id: 'panels' as SectionId,
    label: 'Panels',
    note: GROUP_NOTES.panels,
    items: designs.filter((d) => d.kind === 'panel'),
  },
].filter((s) => s.items.length > 0);

/** The reading order: the sidebar's and the gallery's, which Previous / Next walk too. */
export const ordered = sections.flatMap((s) => s.items);

/** Every style with how many designs (bars and panels) have it, for the gallery's style filter. */
export const styleCounts = STYLES.map(({ id, label, note }) => ({
  id,
  label,
  note,
  count: designs.filter((d) => d.style === id).length,
}));

export function groupLabel(id: SiteGroupId) {
  return SITE_GROUPS.find((g) => g.id === id)?.label ?? id;
}

export function getDesign(id: string) {
  return designs.find((d) => d.id === id);
}

export function neighbours(id: string) {
  const i = ordered.findIndex((d) => d.id === id);
  return {
    previous: i > 0 ? ordered[i - 1] : undefined,
    next: i >= 0 && i < ordered.length - 1 ? ordered[i + 1] : undefined,
  };
}

export function summary({
  id,
  title,
  description,
  layout,
  layoutLabel,
  group,
  style,
  styleLabel,
  thumb,
}: Design): DesignSummary {
  return { id, title, description, layout, layoutLabel, group, style, styleLabel, thumb };
}

/** The part of a design the usage snippet and "Copy for AI" need, for a client component. */
export function usageDesign(d: Design): UsageDesign {
  return {
    id: d.id,
    title: d.title,
    kind: d.kind,
    description: d.description,
    component: d.component,
    hasAction: d.hasAction,
    icons: d.icons,
    iconsFile: d.iconsFile,
    panelUI: d.panelUI,
    tabs: d.tabs,
    controls: d.controls,
  };
}

/** The Expo Router layout a user writes to use this design, with no settings picked. */
export function usageSnippet(d: Design) {
  return usageFor(usageDesign(d));
}

/** The lines that give a design PanelUI's colours (docs/designs/panelui.md). */
export function panelUISnippet(d: Design) {
  return `${[
    `// npx shadcn@latest add ${absoluteUrl('/r/panelui-colors.json')}`,
    "import { usePanelUIColors } from '@/components/tabcn/panelui-colors';",
    '',
    '// Inside the component that renders it:',
    `const colors = usePanelUIColors('${d.id}');`,
    `<${d.component} colors={colors} />`,
  ].join('\n')}\n`;
}

