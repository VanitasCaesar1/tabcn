import Link from 'next/link';
import { designs, summary } from '@/lib/designs';
import type { SiteGroupId } from '@/lib/groups';
import repo from '@/lib/repo.json';
import { site } from '@/lib/site';
import { GitHubIcon } from './github-icon';
import { GitHubLink } from './github-stars';
import { GroupLink } from './group-link';
import { HeaderSearch } from './header-search';
import { Logomark } from './logomark';
import { MobileNav } from './mobile-nav';
import { Brand, sidebarGroups } from './sidebar';
import { SidebarGroups } from './sidebar-groups';
import { SpyNav } from './spy-marker';
import { ThemeToggle } from './theme-toggle';
import { XIcon } from './x-icon';

/** The design a page is about, for the breadcrumb. */
export interface HeaderCrumb {
  title: string;
  group: SiteGroupId;
  groupLabel: string;
  thumb: string | null;
  background: string;
}

const crumbLink =
  'shrink-0 rounded-sm text-muted outline-hidden transition-[color] duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 motion-reduce:transition-none';

const roundLink =
  'grid size-9 shrink-0 place-items-center rounded-full text-muted outline-hidden transition-[color,background-color] duration-150 ease-out hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 active:bg-foreground/10 active:duration-100 motion-reduce:transition-none';

function Slash() {
  return (
    <span aria-hidden className="shrink-0 text-border">
      /
    </span>
  );
}

// Sticks to the top of the page column, the page faintly showing through a blur, with a hairline
// under it level with the sidebar's brand row, so the two read as one frame. Wide screens: the
// home page's section links with a scroll-spy marker, or a design's breadcrumb. Phones: the menu,
// the name and the design. On the right: search, GitHub and the theme. (From ui lab,
// https://lab.xevrion.dev, MIT.)
export function SiteHeader({ crumb }: { crumb?: HeaderCrumb }) {
  const items = designs.map(summary);
  return (
    <header className="site-header sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-border border-b px-4 sm:px-6">
      {/* Phones and tablets: the menu, then the name (and the design). */}
      <div className="flex min-w-0 items-center gap-2 text-sm lg:hidden">
        <MobileNav
          brand={<Brand />}
          footer={
            <>
              <a
                href={site.repo}
                target="_blank"
                rel="noreferrer"
                aria-label="tabcn on GitHub"
                className={roundLink}
              >
                <GitHubIcon />
              </a>
              <a
                href={`https://x.com/${site.x}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`@${site.x} on X`}
                className={roundLink}
              >
                <XIcon />
              </a>
              <span className="ml-auto" />
              <ThemeToggle />
            </>
          }
        >
          <div className="shrink-0 px-3 pt-4">
            <HeaderSearch items={items} variant="row" />
          </div>
          <nav aria-label="Docs and designs" className="flex min-h-0 flex-1 flex-col">
            <SidebarGroups groups={sidebarGroups} />
          </nav>
        </MobileNav>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            aria-current={crumb ? undefined : 'page'}
            className="flex shrink-0 items-center gap-2 rounded-sm outline-hidden focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2"
          >
            <Logomark />
            <span className="font-semibold text-[15px] tracking-tight">tabcn</span>
          </Link>
          {crumb && (
            <>
              <Slash />
              <span aria-current="page" className="truncate font-medium">
                {crumb.title}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Wide screens: the sidebar carries the name, so this is the page's own navigation. */}
      <div className="hidden min-w-0 self-stretch lg:flex">
        {crumb ? (
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
            <Link href="/#designs" className={crumbLink}>
              Designs
            </Link>
            <Slash />
            <GroupLink group={crumb.group} className={crumbLink}>
              {crumb.groupLabel}
            </GroupLink>
            <Slash />
            <span aria-current="page" className="flex min-w-0 items-center gap-2 font-medium">
              <span
                aria-hidden
                className="relative h-3.5 w-10 shrink-0 overflow-hidden rounded-[4px] shadow-[0_0_0_1px_var(--tile-ring)]"
                style={{ backgroundColor: crumb.background }}
              >
                {crumb.thumb && (
                  // biome-ignore lint/performance/noImgElement: a static export of tiny, pre-sized JPGs.
                  <img
                    src={crumb.thumb}
                    alt=""
                    width={138}
                    height={48}
                    decoding="async"
                    className="size-full object-cover"
                  />
                )}
              </span>
              <span className="truncate">{crumb.title}</span>
            </span>
          </nav>
        ) : (
          <SpyNav />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <HeaderSearch items={items} />
        <GitHubLink repo={repo.repo} saved={repo.stars} href={site.repo} />
        <ThemeToggle />
      </div>
    </header>
  );
}
