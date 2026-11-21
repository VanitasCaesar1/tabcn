import { npmVersion } from '@/lib/site';
import { Arrow } from './arrow';

const link =
  'inline-flex items-center gap-1.5 rounded-sm text-muted outline-hidden transition-[color] duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 motion-reduce:transition-none';

// One quiet line under the hero's install command saying whether tabcn is on npm yet, decided at
// build time (scripts/fetch-repo.ts). While it isn't, a hollow ring and a link to the Quick start;
// once it is, a solid dot and the version. The line keeps one height either way, so the board
// under it never moves, and the words always say the state: the dot is only decoration.
export function ReleaseStatus() {
  return (
    <div className="rise mt-2.5 flex h-5 items-center justify-center whitespace-nowrap text-[12px] [--rise-delay:180ms]">
      {npmVersion ? (
        <a
          href="https://www.npmjs.com/package/react-native-tabcn"
          target="_blank"
          rel="noreferrer"
          aria-label={`react-native-tabcn ${npmVersion} on npm`}
          className={link}
        >
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-foreground" />
          <span>
            <span className="font-mono">react-native-tabcn</span>{' '}
            <span className="font-mono text-foreground tabular-nums">v{npmVersion}</span> on npm
          </span>
          <Arrow direction="up-right" className="size-3" />
        </a>
      ) : (
        <a href="#quick-start" className={`group ${link}`}>
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_currentColor]"
          />
          <span className="underline decoration-border underline-offset-2 transition-[text-decoration-color] duration-150 ease-out group-hover:decoration-current motion-reduce:transition-none">
            react-native-tabcn isn't on npm yet
          </span>
        </a>
      )}
    </div>
  );
}
