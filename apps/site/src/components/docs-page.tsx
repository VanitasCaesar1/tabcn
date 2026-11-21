import Link from 'next/link';
import { docNeighbours, docs } from '@/lib/docs';
import { Pager } from './pager';
import { SiteHeader } from './site-header';

export interface DocSection {
  id: string;
  title: string;
}

// A docs page: title and lead, the prose, and its sections listed beside it on wide screens.
// Pages pass their sections so the list and the headings share ids.
export function DocsPage({
  href,
  sections,
  children,
}: {
  href: string;
  sections: readonly DocSection[];
  children: React.ReactNode;
}) {
  const page = docs.find((entry) => entry.href === href);
  if (!page) throw new Error(`${href} is not in lib/docs.ts`);
  const { previous, next } = docNeighbours(href);
  return (
    <>
      <SiteHeader />
      <main
        id="content"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-6xl flex-1 gap-12 px-4 pt-10 pb-8 outline-hidden sm:px-6"
      >
        <article className="min-w-0 max-w-[680px] flex-1">
          <h1 className="text-balance font-semibold text-3xl tracking-tight">{page.title}</h1>
          <p className="mt-3 text-pretty text-[15px] text-muted">{page.description}</p>
          <div className="mt-10 flex flex-col gap-12">{children}</div>
          <div className="mt-16">
            <Pager label="More docs" previous={previous} next={next} />
          </div>
        </article>
        {sections.length > 1 ? (
          <nav
            aria-label="On this page"
            className="sticky top-24 hidden w-48 shrink-0 self-start xl:block"
          >
            <p className="font-medium text-xs">On this page</p>
            <ul className="mt-3 flex flex-col gap-2 text-[13px]">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="rounded-sm text-muted outline-hidden transition-[color] duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 motion-reduce:transition-none"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </main>
    </>
  );
}

/** A section of a docs page, with a heading that can be linked to. */
export function DocSection({
  section,
  children,
}: {
  section: DocSection;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={section.id} className="scroll-mt-20">
      <h2 id={section.id} className="font-semibold text-lg tracking-tight">
        <a href={`#${section.id}`} className="outline-hidden focus-visible:underline">
          {section.title}
        </a>
      </h2>
      <div className="mt-3 flex flex-col gap-4 text-pretty text-[15px] leading-relaxed text-muted [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

/** Inline code in docs prose. */
export function Code({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-[13px] text-foreground">{children}</code>;
}

/** A link inside docs prose. */
export function ProseLink({ href, children }: { href: string; children: React.ReactNode }) {
  const className =
    'rounded-sm text-foreground underline decoration-border underline-offset-4 outline-hidden transition-[text-decoration-color] duration-150 ease-out hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2';
  // Site pages go through next/link, which adds the base path.
  if (!href.startsWith('http')) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}
