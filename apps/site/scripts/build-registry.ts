/**
 * Writes the shadcn registry the site serves, from registry/registry.json and the design files:
 *   public/r/registry.json   the index
 *   public/r/<id>.json       one registry item per design, file contents inlined
 *
 * `npx shadcn@latest add https://vanitascaesar1.github.io/tabcn/r/<id>.json` reads these.
 * Run: bun scripts/build-registry.ts   (part of `bun run build` and `bun run dev`)
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = fileURLToPath(new URL('..', import.meta.url));
const root = join(site, '../..');
const out = join(site, 'public/r');

interface RegistryFile {
  path: string;
  type: string;
  target: string;
}

interface RegistryItem {
  name: string;
  type: string;
  title: string;
  description: string;
  categories?: string[];
  dependencies?: string[];
  registryDependencies?: string[];
  files: RegistryFile[];
}

interface Registry {
  $schema: string;
  name: string;
  homepage: string;
  items: RegistryItem[];
}

const registry = JSON.parse(readFileSync(join(root, 'registry/registry.json'), 'utf8')) as Registry;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const write = (name: string, data: unknown) =>
  writeFileSync(join(out, name), `${JSON.stringify(data, null, 2)}\n`);

write('registry.json', registry);

for (const item of registry.items) {
  write(`${item.name}.json`, {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: item.name,
    type: item.type,
    title: item.title,
    description: item.description,
    ...(item.categories && { categories: item.categories }),
    dependencies: item.dependencies ?? [],
    ...(item.registryDependencies && { registryDependencies: item.registryDependencies }),
    files: item.files.map((file) => ({
      path: file.path,
      type: file.type,
      target: file.target,
      content: readFileSync(join(root, file.path), 'utf8'),
    })),
  });
}

process.stdout.write(`Registry: wrote ${registry.items.length} items to public/r/\n`);
