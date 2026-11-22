/**
 * Writes the props table data for every design page, read from each design's source by
 * scripts/design-props.ts (docs/designs/website.md, "Props tables on each design's page"):
 *   generated/design-props.json   { [id]: DesignProps }
 *
 * The reader uses the TypeScript compiler API, so it runs here, before `next build`, and the
 * site only reads the JSON (src/lib/designs.ts); `typescript` never ends up in the bundle.
 * Run: bun scripts/build-props.ts   (part of `bun run build` and `bun run dev`)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type DesignProps, readDesignProps } from '../../../scripts/design-props';

const site = fileURLToPath(new URL('..', import.meta.url));
const root = join(site, '../..');
const out = join(site, 'generated');

interface RegistryItem {
  name: string;
  categories?: string[];
  files: { path: string }[];
}

const registry = JSON.parse(readFileSync(join(root, 'registry/registry.json'), 'utf8')) as {
  items: RegistryItem[];
};

// Theme items (PanelUI Colors) colour designs; they have no props table.
const designs = registry.items.filter((item) => !item.categories?.includes('theme'));

const data: Record<string, DesignProps> = {};
for (const item of designs) {
  const main = item.files.find((f) => f.path.endsWith(`/${item.name}.tsx`));
  if (!main) throw new Error(`${item.name}: registry entry has no ${item.name}.tsx`);
  const props = readDesignProps(readFileSync(join(root, main.path), 'utf8'), main.path);
  if (!props) throw new Error(`${item.name}: no exported component with props in ${main.path}`);
  data[item.name] = props;
}

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'design-props.json'), `${JSON.stringify(data, null, 2)}\n`);
process.stdout.write(`Wrote props for ${designs.length} designs to generated/design-props.json\n`);
