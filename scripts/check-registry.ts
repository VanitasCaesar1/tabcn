/**
 * Checks that the registry, the example app's catalog and its demos agree, and that every
 * design imports only what its registry entry declares (AGENTS.md: "registry/: copyable
 * designs. They may import only from tabcn, React Native, and the dependencies listed in
 * their own registry entry").
 *
 * Run: bun scripts/check-registry.ts   (part of `bun run check`)
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

interface Item {
  name: string;
  title: string;
  dependencies?: string[];
  files: { path: string; target: string }[];
}
const registry = JSON.parse(read('registry/registry.json')) as { items: Item[] };

// Always available to a design: React, React Native, Reanimated (a tabcn peer) and tabcn itself.
const ALWAYS = new Set(['react', 'react-native', 'react-native-reanimated', 'tabcn']);

const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);

const catalog = read('apps/example/src/catalog.ts');
const catalogIds = [...catalog.matchAll(/id: '([a-z-]+)'/g)].map((m) => m[1]);
const demos = read('apps/example/src/demos.tsx');
const demoIds = [...demos.matchAll(/^ {2}'?([a-z-]+)'?: \{$/gm)].map((m) => m[1]);
const ids = registry.items.map((i) => i.name);

for (const [label, list] of [
  ['catalog', catalogIds],
  ['demos', demoIds],
] as const) {
  for (const id of ids) if (!list.includes(id)) fail(`${id}: in registry.json but not in ${label}`);
  for (const id of list) if (!ids.includes(id)) fail(`${id}: in ${label} but not in registry.json`);
}
if (new Set(ids).size !== ids.length) fail('registry.json has duplicate names');

for (const item of registry.items) {
  const allowed = new Set([...ALWAYS, ...(item.dependencies ?? [])]);
  const main = `registry/designs/${item.name}/${item.name}.tsx`;
  if (!item.files.some((f) => f.path === main)) fail(`${item.name}: files must include ${main}`);
  for (const file of item.files) {
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
      if (spec.startsWith('.')) {
        fail(
          `${item.name}: ${file.path} imports ${spec}; designs are copied alone, so no relative imports`,
        );
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
    const used = item.files.some(
      (f) => existsSync(join(root, f.path)) && read(f.path).includes(`'${dep}`),
    );
    if (!used) fail(`${item.name}: lists ${dep} but no file imports it`);
  }
}

if (errors.length) {
  process.stderr.write(`Registry check failed:\n- ${errors.join('\n- ')}\n`);
  process.exit(1);
}
process.stdout.write(
  `Registry check passed: ${ids.length} designs agree across registry, catalog and demos.\n`,
);
