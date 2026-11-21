import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsPage } from '@/components/docs-page';
import { docs } from '@/lib/docs';
import { guides } from '@/lib/guides';
import { absoluteUrl } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

const href = (slug: string) => `/docs/${slug}/`;

export function generateStaticParams() {
  return Object.keys(guides).map((slug) => ({ slug }));
}

// Every guide is known at build; any other is a plain 404.
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = docs.find((d) => d.href === href(slug));
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: absoluteUrl(page.href) },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = guides[slug];
  if (!guide || !docs.some((d) => d.href === href(slug))) notFound();
  return (
    <DocsPage href={href(slug)} sections={guide.sections}>
      {guide.render()}
    </DocsPage>
  );
}
