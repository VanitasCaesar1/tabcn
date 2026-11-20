// Saves the repo's star count for the header's star button. Runs before every build so the
// site stays fully static; the browser then refreshes the count live. If GitHub can't be
// reached, the last saved count is kept. (From ui lab, https://lab.xevrion.dev, MIT.)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const repo = 'VanitasCaesar1/tabcn';
const file = fileURLToPath(new URL('../src/lib/repo.json', import.meta.url));

try {
  const res = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  const { stargazers_count: stars } = (await res.json()) as { stargazers_count?: number };
  if (typeof stars !== 'number') throw new Error('no star count');
  writeFileSync(file, `${JSON.stringify({ repo, stars })}\n`);
  process.stdout.write(`repo: ${stars} stars on ${repo}\n`);
} catch (error) {
  process.stderr.write(`repo: kept the saved count (${(error as Error).message})\n`);
}
