import Link from 'next/link';
import { asset } from '@/lib/base-path';
import { site } from '@/lib/site';
import { Arrow } from './arrow';

const COLUMNS = [
  {
    title: 'tabcn',
    links: [
      { label: 'All designs', href: '/#designs' },
      { label: 'Quick start', href: '/#quick-start' },
      { label: 'Registry index', href: asset('/r/registry.json'), raw: true },
    ],
  },
  {
    title: 'Source',
    links: [
      { label: 'GitHub', href: site.repo, out: true },
      { label: 'Design docs', href: `${site.repo}/tree/main/docs/designs`, out: true },
      { label: 'License (MIT)', href: `${site.repo}/blob/main/LICENSE`, out: true },
    ],
  },
  {
    title: 'Elsewhere',
    links: [{ label: `X @${site.x}`, href: `https://x.com/${site.x}`, out: true }],
  },
];

const linkClass =
  'group/out inline-flex items-center gap-0.5 rounded-sm text-muted outline-hidden transition-[color] duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-foreground';

const outArrow =
  'size-3 transition-[translate] duration-150 ease-out group-hover/out:translate-x-0.5 group-hover/out:-translate-y-0.5 motion-reduce:transition-none';

// The page ends on the same dotted stage it began on. (Layout from ui lab, MIT.)
export function SiteFooter() {
  return (
    <footer className="relative isolate mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 border-border border-t pt-12 pb-12 sm:grid-cols-[1fr_auto_auto_auto] sm:gap-16">
        <div className="col-span-2 sm:col-span-1">
          <Link
            href="/"
            className="inline-flex items-baseline gap-2 rounded-sm outline-hidden focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-4"
          >
            <span className="font-semibold text-[15px] tracking-tight">tabcn</span>
            <span className="text-[13px] text-muted">tab bars for Expo</span>
          </Link>
          <p className="mt-3 max-w-xs text-pretty text-muted text-sm">
            Animated tab bars for React Native. Copy one in, then make it yours.
          </p>
        </div>
        {COLUMNS.map(({ title, links }) => (
          <nav key={title} aria-label={title}>
            <p className="font-medium text-[13px] text-foreground">{title}</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {links.map((link) => (
                <li key={link.label}>
                  {'out' in link ? (
                    <a href={link.href} target="_blank" rel="noreferrer" className={linkClass}>
                      {link.label}
                      <Arrow direction="up-right" className={outArrow} />
                    </a>
                  ) : 'raw' in link ? (
                    <a href={link.href} className={linkClass}>
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="flex flex-col gap-1 border-border border-t py-6 text-muted text-xs sm:flex-row sm:justify-between">
        <p>
          Made by{' '}
          <a
            href={`https://x.com/${site.x}`}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-border underline-offset-4 transition-[color,text-decoration-color] duration-150 ease-out hover:text-foreground hover:decoration-foreground"
          >
            @{site.x}
          </a>
          . MIT licensed. Made with Next.js, Motion and Tailwind CSS.
        </p>
        <p>
          Design based on{' '}
          <a
            href="https://lab.xevrion.dev"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-border underline-offset-4 transition-[color,text-decoration-color] duration-150 ease-out hover:text-foreground hover:decoration-foreground"
          >
            ui lab by xevrion
          </a>
        </p>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-64 bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_11%,transparent)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_60%_100%_at_50%_100%,black,transparent)]"
      />
    </footer>
  );
}
