import Link from 'next/link';
import { asset } from '@/lib/base-path';
import { cn } from '@/lib/cn';
import { siteGroups } from '@/lib/designs';
import { site } from '@/lib/site';
import { Arrow } from './arrow';
import { BackToTop } from './back-to-top';
import { GitHubIcon } from './github-icon';
import { GroupLink } from './group-link';
import { Logomark } from './logomark';
import { XIcon } from './x-icon';

const linkClass =
  'group/out inline-flex items-center gap-0.5 rounded-sm text-muted outline-hidden transition-[color] duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-foreground motion-reduce:transition-none';

const outArrow =
  'size-3 transition-[translate] duration-150 ease-out group-hover/out:translate-x-0.5 group-hover/out:-translate-y-0.5 motion-reduce:transition-none';

const iconLink =
  'grid size-8 place-items-center rounded-full text-muted shadow-[inset_0_0_0_1px_var(--border)] outline-hidden transition-[color,background-color] duration-150 ease-out hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 active:bg-foreground/10 active:duration-100 motion-reduce:transition-none';

const titleClass = 'font-medium text-[13px] text-foreground';

function Out({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={linkClass}>
      {children}
      <Arrow direction="up-right" className={outArrow} />
    </a>
  );
}

// The page ends on the same dotted stage it began on: the name and a line about it, the five
// groups with their counts, where to start, and the project's links. (Layout from ui lab, MIT.)
export function SiteFooter() {
  return (
    <footer className="relative isolate mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 border-border border-t py-12 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,auto)] sm:gap-x-16">
        <div className="col-span-2 sm:col-span-1">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-sm outline-hidden focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-4"
          >
            <Logomark />
            <span className="font-semibold text-[15px] tracking-tight">tabcn</span>
          </Link>
          <p className="mt-3 max-w-xs text-pretty text-muted text-sm">
            Animated tab bars for React Native. Copy one in, then make it yours.
          </p>
          <div className="mt-4 flex gap-2">
            <a
              href={site.repo}
              target="_blank"
              rel="noreferrer"
              aria-label="tabcn on GitHub"
              className={iconLink}
            >
              <GitHubIcon className="size-3.5" />
            </a>
            <a
              href={`https://x.com/${site.x}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`@${site.x} on X`}
              className={iconLink}
            >
              <XIcon className="size-3" />
            </a>
            <a href={asset('/r/registry.json')} className={iconLink}>
              <svg
                viewBox="0 0 16 16"
                aria-hidden
                className="size-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5.5 2.75H5a1.5 1.5 0 0 0-1.5 1.5v2.1c0 .6-.4 1.15-1 1.4l-.25.25.25.25c.6.25 1 .8 1 1.4v2.1a1.5 1.5 0 0 0 1.5 1.5h.5M10.5 2.75h.5a1.5 1.5 0 0 1 1.5 1.5v2.1c0 .6.4 1.15 1 1.4l.25.25-.25.25c-.6.25-1 .8-1 1.4v2.1a1.5 1.5 0 0 1-1.5 1.5h-.5" />
              </svg>
              <span className="sr-only">Registry JSON</span>
            </a>
          </div>
        </div>

        <nav aria-label="Designs">
          <p className={titleClass}>Designs</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {siteGroups.map((g) => (
              <li key={g.id}>
                <GroupLink
                  group={g.id}
                  className={cn(linkClass, 'flex w-full justify-between gap-6')}
                >
                  {g.label}
                  <span className="tabular-nums">{g.count}</span>
                </GroupLink>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Get started">
          <p className={titleClass}>Get started</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li>
              <Link href="/docs/#install" className={linkClass}>
                Quick start
              </Link>
            </li>
            <li>
              <Link href="/#how" className={linkClass}>
                How it works
              </Link>
            </li>
            <li>
              <Link href="/docs/" className={linkClass}>
                Docs
              </Link>
            </li>
            <li>
              <Link href="/docs/panelui/" className={linkClass}>
                Using with PanelUI
              </Link>
            </li>
            <li>
              <a href={asset('/r/registry.json')} className={linkClass}>
                Registry index
              </a>
            </li>
          </ul>
        </nav>

        <nav aria-label="Project" className="col-span-2 sm:col-span-1">
          <p className={titleClass}>Project</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li>
              <Out href={site.repo}>GitHub</Out>
            </li>
            <li>
              <Out href={`${site.repo}/blob/main/LICENSE`}>License (MIT)</Out>
            </li>
            <li>
              <Out href={`https://x.com/${site.x}`}>X @{site.x}</Out>
            </li>
          </ul>
        </nav>
      </div>
      <div className="flex flex-col gap-3 border-border border-t py-6 text-muted text-xs sm:flex-row sm:items-center sm:justify-between">
        <p>
          Made by{' '}
          <a
            href={`https://x.com/${site.x}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-sm underline decoration-border underline-offset-4 outline-hidden transition-[color,text-decoration-color] duration-150 ease-out hover:text-foreground hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid motion-reduce:transition-none"
          >
            @{site.x}
          </a>
          . MIT licensed.
        </p>
        <BackToTop />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-64 bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_11%,transparent)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_60%_100%_at_50%_100%,black,transparent)]"
      />
    </footer>
  );
}
