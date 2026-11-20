import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
        <p className="font-mono text-muted text-sm">404</p>
        <h1 className="mt-3 font-semibold text-2xl tracking-tight">No tab bar here</h1>
        <p className="mt-2 max-w-sm text-pretty text-muted text-sm">
          The page you followed doesn&rsquo;t exist. Every design is listed on the home page.
        </p>
        <Link
          href="/"
          className="mt-6 flex h-10 items-center rounded-full bg-foreground px-5 font-medium text-background text-sm outline-hidden transition-[scale,opacity] duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 active:scale-[0.96]"
        >
          See all designs
        </Link>
      </main>
    </>
  );
}
