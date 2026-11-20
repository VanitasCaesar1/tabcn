import Link from 'next/link';
import { designs, summary } from '@/lib/designs';
import repo from '@/lib/repo.json';
import { site } from '@/lib/site';
import { GitHubIcon } from './github-icon';
import { StarCount } from './github-stars';
import { HeaderSearch } from './header-search';
import { MobileNav } from './mobile-nav';
import { SidebarNav } from './sidebar';
import { ThemeToggle } from './theme-toggle';

// Sticks to the top of the page column, with a hairline under it matching the sidebar's brand
// row, so the two read as one frame. (From ui lab, https://lab.xevrion.dev, MIT.)
export function SiteHeader({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-border border-b bg-background px-4 sm:px-6">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
        <MobileNav>
          <SidebarNav />
        </MobileNav>
        <Link
          href="/"
          className={
            title
              ? 'shrink-0 text-muted transition-[color] duration-150 ease-out hover:text-foreground'
              : 'font-medium'
          }
        >
          {/* On wide screens the sidebar already carries the name. */}
          <span className="lg:hidden">tabcn</span>
          <span className="hidden lg:inline">Designs</span>
        </Link>
        {title && (
          <>
            <span aria-hidden className="text-border">
              /
            </span>
            <span className="truncate font-medium">{title}</span>
          </>
        )}
      </nav>
      <div className="flex shrink-0 items-center gap-1.5">
        <HeaderSearch items={designs.map(summary)} />
        <a
          href={site.repo}
          target="_blank"
          rel="noreferrer"
          aria-label="Star tabcn on GitHub"
          className="group/gh flex h-9 items-center gap-2 rounded-full border border-border px-3 font-medium text-[13px] text-foreground outline-hidden transition-[scale,background-color] duration-150 ease-out hover:bg-surface focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 active:scale-[0.96]"
        >
          <GitHubIcon />
          <span className="hidden sm:inline">Star</span>
          <span className="flex items-center gap-1 text-muted tabular-nums transition-[color] duration-150 ease-out group-hover/gh:text-foreground">
            <svg viewBox="0 0 16 16" aria-hidden className="size-3.5" fill="currentColor">
              <path d="M8 1.6l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.4l-3.8 2 .7-4.3-3.1-3 4.3-.6L8 1.6Z" />
            </svg>
            {/* Starts at the count saved at deploy, then updates live. */}
            <StarCount repo={repo.repo} saved={repo.stars} />
          </span>
        </a>
        <span aria-hidden className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <ThemeToggle />
      </div>
    </header>
  );
}
