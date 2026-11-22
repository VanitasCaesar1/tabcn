/**
 * Checks that the registry, the example app's catalog and its demos agree, and that every
 * design imports only what its registry entry declares (AGENTS.md: "registry/: copyable
 * designs. They may import only from tabcn, React Native, and the dependencies listed in
 * their own registry entry").
 *
 * Tab bars and panels (docs/designs/panels.md) are both registry items. The catalog marks
 * each with `kind`; a panel's layout is always 'panel', and its demo names the bar it pairs
 * with and adds the panel or its controls (`panel:` or `extra:`). `react-native-tabcn/gestures` needs
 * react-native-gesture-handler, so a design that imports it must list that dependency.
 *
 * Every design's props are read from its source for the props table on its page of the site
 * (scripts/design-props.ts, docs/designs/website.md), so each member needs a doc comment.
 *
 * Run: bun scripts/check-registry.ts   (part of `bun run check`)
 */
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { readDesignProps } from './design-props';

const root = join(import.meta.dir, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

interface Item {
  name: string;
  type: string;
  title: string;
  categories?: string[];
  dependencies?: string[];
  files: { path: string; type: string; target: string }[];
}
const registry = JSON.parse(read('registry/registry.json')) as { items: Item[] };
// Theme items (categories: ["theme"]) colour designs rather than being one: PanelUI Colors
// (docs/designs/panelui.md). They skip the catalog, demos and props checks below.
const isTheme = (item: Item) => item.categories?.includes('theme') ?? false;
const designItems = registry.items.filter((item) => !isTheme(item));

// Always available to a design: React, React Native, Reanimated (a tabcn peer) and tabcn itself.
const ALWAYS = new Set(['react', 'react-native', 'react-native-reanimated', 'react-native-tabcn']);

const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);

const catalog = read('apps/example/src/catalog.ts');
const catalogIds = [...catalog.matchAll(/id: '([a-z-]+)'/g)].map((m) => m[1]);
const demos = read('apps/example/src/demos.tsx');
const demosBody = demos.slice(demos.indexOf('export const demos'));
const demoIds = [...demosBody.matchAll(/^ {2}'?([a-z-]+)'?: \{$/gm)].map((m) => m[1]);
const ids = designItems.map((i) => i.name);

/** A catalog entry's `{ ... }` block, from its id to the next entry. */
function catalogBlock(id: string) {
  const start = catalog.indexOf(`id: '${id}'`);
  if (start < 0) return '';
  const next = catalog.indexOf('id: ', start + 4);
  return catalog.slice(start, next < 0 ? undefined : next);
}

/** A demo's block in `demos`, from its key to the next one. */
function demoBlock(id: string) {
  const start = demosBody.search(new RegExp(`^ {2}'?${id}'?: \\{$`, 'm'));
  if (start < 0) return '';
  const rest = demosBody.slice(start + 1);
  const next = rest.search(/^ {2}'?[a-z-]+'?: \{$/m);
  return next < 0 ? rest : rest.slice(0, next);
}

for (const id of catalogIds) {
  if (!id) continue;
  const block = catalogBlock(id);
  const kind = block.match(/kind: '([a-z]+)'/)?.[1];
  const layout = block.match(/layout: '([a-z-]+)'/)?.[1];
  if (kind !== 'bar' && kind !== 'panel') fail(`${id}: catalog entry needs kind 'bar' or 'panel'`);
  if ((kind === 'panel') !== (layout === 'panel')) {
    fail(
      `${id}: catalog kind '${kind}' and layout '${layout}' disagree (panels use layout 'panel')`,
    );
  }
  if (kind === 'panel' && !/^ {4}(panel|extra): /m.test(demoBlock(id))) {
    fail(`${id}: a panel's demo needs \`panel\` or \`extra\` to show it`);
  }
}

for (const [label, list] of [
  ['catalog', catalogIds],
  ['demos', demoIds],
] as const) {
  for (const id of ids) if (!list.includes(id)) fail(`${id}: in registry.json but not in ${label}`);
  for (const id of list) if (!ids.includes(id)) fail(`${id}: in ${label} but not in registry.json`);
}
const allNames = registry.items.map((i) => i.name);
if (new Set(allNames).size !== allNames.length) fail('registry.json has duplicate names');

for (const item of registry.items) {
  const allowed = new Set([...ALWAYS, ...(item.dependencies ?? [])]);
  const main = `registry/designs/${item.name}/${item.name}.tsx`;
  if (!isTheme(item) && !item.files.some((f) => f.path === main)) {
    fail(`${item.name}: files must include ${main}`);
  }
  if (!isTheme(item) && existsSync(join(root, main))) {
    const props = readDesignProps(read(main), main);
    if (!props) {
      fail(`${item.name}: ${main} needs an exported component with a \`<Component>Props\` type`);
    } else {
      for (const prop of props.props) {
        if (!prop.description) {
          fail(
            `${item.name}: ${props.typeName ?? 'props'}.${prop.name} needs a doc comment (it's the description in the props table on the site)`,
          );
        }
      }
    }
  }
  // shadcn runs its web transforms (Tailwind classes, CSS variables, icons) over
  // `registry:component` files. Those rewrite plain strings: `rgba(255, 255, 255, 0.1)` loses a
  // `255,` and `viewBox="0 0 24 24"` becomes `"0 24"`, which crashes react-native-svg. It also
  // needs a components.json first. `registry:item` with `registry:file` files is copied
  // byte for byte to its target, with no components.json.
  if (item.type !== 'registry:item') {
    fail(`${item.name}: type should be registry:item (shadcn rewrites registry:component files)`);
  }
  for (const file of item.files) {
    if (file.type !== 'registry:file') {
      fail(
        `${item.name}: ${file.path} should be type registry:file, so shadcn copies it unchanged`,
      );
    }
    if (!existsSync(join(root, file.path))) {
      fail(`${item.name}: ${file.path} does not exist`);
      continue;
    }
    if (!file.target.startsWith('components/tabcn/')) {
      fail(`${item.name}: target ${file.target} should be under components/tabcn/`);
    }
    const source = read(file.path);
    for (const m of source.matchAll(/^import[^'"]*['"]([^'"]+)['"]/gm)) {
      const spec = m[1];
      if (spec === 'react-native-tabcn/gestures' && !allowed.has('react-native-gesture-handler')) {
        fail(
          `${item.name}: ${file.path} imports tabcn/gestures, which needs react-native-gesture-handler in its registry dependencies`,
        );
      }
      if (spec.startsWith('.')) {
        // A design may be split into several files of the same registry item. One may import
        // another as './<name>' only when <name>.tsx is a file of this item whose installed name
        // is the same, so the import resolves both here and in components/tabcn/ in an app.
        // Imports between different items stay out: each item is copied on its own.
        const name = spec.startsWith('./') && !spec.slice(2).includes('/') ? spec.slice(2) : null;
        const sibling = name
          ? item.files.find(
              (f) =>
                basename(f.path) === `${name}.tsx` &&
                basename(f.target) === `${name}.tsx` &&
                dirname(f.path) === dirname(file.path),
            )
          : undefined;
        if (!sibling) {
          fail(
            `${item.name}: ${file.path} imports ${spec}; a relative import must name a file of the same item that keeps its name when installed`,
          );
        }
        continue;
      }
      const pkg = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      if (!allowed.has(pkg)) {
        fail(
          `${item.name}: ${file.path} imports ${pkg}, which is not in its registry dependencies`,
        );
      }
    }
  }
  for (const dep of item.dependencies ?? []) {
    const used = item.files.some((f) => {
      if (!existsSync(join(root, f.path))) return false;
      const source = read(f.path);
      // tabcn/gestures is how a design uses gesture handler.
      if (
        dep === 'react-native-gesture-handler' &&
        source.includes(`'react-native-tabcn/gestures'`)
      ) {
        return true;
      }
      return source.includes(`'${dep}`);
    });
    if (!used) fail(`${item.name}: lists ${dep} but no file imports it`);
  }
}

checkPanelUIColors();

/**
 * PanelUI Colors maps each design's colour slots to PanelUI tokens. A slot that a design
 * doesn't have would be passed to it and ignored, and a token PanelUI no longer defines would
 * leave the slot on the design's own colour, so check both: slots against each design's
 * `defaultColors`, tokens against the theme.css of the panelui-native the example app installs.
 */
function checkPanelUIColors() {
  const path = 'registry/themes/panelui-colors.ts';
  if (!existsSync(join(root, path))) return;
  const source = read(path);
  const start = source.indexOf('export const panelUIColorMaps = {');
  const end = source.indexOf('} as const satisfies', start);
  if (start < 0 || end < 0) return fail(`${path}: can't find panelUIColorMaps`);
  const body = source.slice(start, end);
  const shared = source.match(/^const badge = \{([^}]*)\}/m)?.[1] ?? '';
  const sharedSlots = [...shared.matchAll(/(\w+):/g)].map((m) => m[1]);
  const blocks = [...body.matchAll(/^ {2}'?([a-z-]+)'?: \{([^}]*)\}/gm)];
  for (const [, id, block] of blocks) {
    if (!id || block === undefined) continue;
    const item = designItems.find((i) => i.name === id);
    if (!item) {
      fail(`${path}: maps '${id}', which is not a design in registry.json`);
      continue;
    }
    const withColors = item.files.find((f) =>
      /^(export )?const defaultColors = \{/m.test(read(f.path)),
    );
    if (!withColors) {
      fail(`${path}: ${id} has no \`defaultColors\` to map`);
      continue;
    }
    const colorsSource = read(withColors.path);
    const colorsStart = colorsSource.search(/^(export )?const defaultColors = \{/m);
    const colorsBody = colorsSource.slice(colorsStart, colorsSource.indexOf('\n};', colorsStart));
    const designSlots = new Set([...colorsBody.matchAll(/^ {2}(\w+):/gm)].map((m) => m[1]));
    const slots = [...block.matchAll(/(\w+): ['[]/g)].map((m) => m[1] as string);
    if (block.includes('...badge')) slots.push(...(sharedSlots as string[]));
    for (const slot of slots) {
      if (!designSlots.has(slot)) fail(`${path}: ${id}.${slot} is not one of ${id}'s colours`);
    }
  }
  const css = join(root, 'node_modules/panelui-native/theme.css');
  if (!existsSync(css)) return;
  const defined = new Set(
    [...readFileSync(css, 'utf8').matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1]),
  );
  const union = source.slice(
    source.indexOf('export type PanelUIToken'),
    source.indexOf(';', source.indexOf('export type PanelUIToken')),
  );
  for (const [, token] of union.matchAll(/'([a-z0-9-]+)'/g)) {
    if (token && !defined.has(token)) {
      fail(`${path}: PanelUI's theme.css no longer defines --color-${token}`);
    }
  }
}

if (errors.length) {
  process.stderr.write(`Registry check failed:\n- ${errors.join('\n- ')}\n`);
  process.exit(1);
}
const panels = catalogIds.filter((id) => id && /kind: 'panel'/.test(catalogBlock(id))).length;
process.stdout.write(
  `Registry check passed: ${ids.length} designs (${ids.length - panels} tab bars, ${panels} panels) agree across registry, catalog and demos; ${registry.items.length - ids.length} theme item checked.\n`,
);
