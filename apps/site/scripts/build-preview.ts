/**
 * Exports the example app's web build to public/preview/ for the live previews on design pages
 * (src/components/live-phone.tsx). It is a single-page app served from <basePath>/preview/,
 * which each design page opens at ?embed=1&design=<id> (apps/example/src/embed.ts).
 *
 * Without it the pages show the recordings, so a failed export warns instead of failing the
 * build. `--if-missing` (used by `dev`) keeps an existing export. TABCN_SKIP_PREVIEW=1 skips it.
 * Run: bun scripts/build-preview.ts   (part of `bun run build` and `bun run dev`)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_PATH } from '../src/lib/base-path';

const site = fileURLToPath(new URL('..', import.meta.url));
const example = join(site, '../example');
const out = join(site, 'public/preview');

if (process.env.TABCN_SKIP_PREVIEW === '1') {
  process.stdout.write('Preview: skipped (TABCN_SKIP_PREVIEW=1)\n');
  process.exit(0);
}
if (process.argv.includes('--if-missing') && existsSync(join(out, 'index.html'))) {
  process.stdout.write('Preview: keeping public/preview/ (delete it to rebuild)\n');
  process.exit(0);
}

rmSync(out, { recursive: true, force: true });
const result = spawnSync('bunx', ['expo', 'export', '--platform', 'web', '--output-dir', out], {
  cwd: example,
  stdio: 'inherit',
  env: { ...process.env, CI: '1', TABCN_PREVIEW_BASE_URL: `${BASE_PATH}/preview` },
});
if (result.status !== 0 || !existsSync(join(out, 'index.html'))) {
  rmSync(out, { recursive: true, force: true });
  process.stderr.write('Preview: export failed; design pages will show their recordings\n');
} else {
  process.stdout.write('Preview: wrote public/preview/\n');
}
