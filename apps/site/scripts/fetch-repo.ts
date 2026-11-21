// Saves the facts the site reads from outside the repo, before every build, so the site stays
// fully static: the repo's star count (the browser then refreshes it live) and the tabcn version
// on npm (null while the package is unpublished). Whatever can't be reached keeps its saved
// value, and nothing time-dependent is written, so a rebuild with nothing new leaves no diff.
// (Star count from ui lab, https://lab.xevrion.dev, MIT.)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const repo = 'VanitasCaesar1/tabcn';
const pkg = 'tabcn';
const file = fileURLToPath(new URL('../src/lib/repo.json', import.meta.url));

type State = { repo: string; stars: number; npm: string | null };

const log = (line: string) => process.stdout.write(`${line}\n`);
const warn = (line: string) => process.stderr.write(`${line}\n`);

function readSafe(path: string) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

const prev: State = (() => {
  const base: State = { repo, stars: 0, npm: null };
  try {
    const saved = JSON.parse(readFileSync(file, 'utf8')) as Partial<State>;
    return {
      repo,
      stars: typeof saved.stars === 'number' ? saved.stars : base.stars,
      npm: typeof saved.npm === 'string' ? saved.npm : base.npm,
    };
  } catch {
    return base;
  }
})();

async function fetchStars() {
  const res = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  const { stargazers_count: stars } = (await res.json()) as { stargazers_count?: unknown };
  if (typeof stars !== 'number') throw new Error('no star count');
  return stars;
}

/** The latest published version, or null when the registry says the package doesn't exist. */
async function fetchNpm(): Promise<string | null> {
  const res = await fetch(`https://registry.npmjs.org/${pkg}`, {
    headers: { Accept: 'application/vnd.npm.install-v1+json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) {
    // Only the registry's own "not found" counts; a stray CDN 404 mustn't flip the site back
    // to pre-release.
    const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
    if (body?.error === 'Not found') return null;
    throw new Error('npm answered 404 without its not-found body');
  }
  if (!res.ok) throw new Error(`npm answered ${res.status}`);
  const body = (await res.json()) as { 'dist-tags'?: { latest?: unknown } };
  const latest = body['dist-tags']?.latest;
  // An unpublished package leaves a tombstone with no latest tag.
  return typeof latest === 'string' ? latest : null;
}

const [gh, npm] = await Promise.allSettled([fetchStars(), fetchNpm()]);
const next: State = {
  repo,
  stars: gh.status === 'fulfilled' ? gh.value : prev.stars,
  npm: npm.status === 'fulfilled' ? npm.value : prev.npm,
};

const reason = (r: PromiseRejectedResult) =>
  r.reason instanceof Error ? r.reason.message : String(r.reason);
if (gh.status === 'rejected') warn(`repo: kept the saved count (${reason(gh)})`);
else log(`repo: ${next.stars} stars on ${repo}`);
if (npm.status === 'rejected') warn(`npm: kept the saved state (${reason(npm)})`);

const out = `${JSON.stringify(next)}\n`;
if (out !== readSafe(file)) writeFileSync(file, out);
log(next.npm ? `npm: ${pkg}@${next.npm} is published` : `npm: ${pkg} is not published`);
