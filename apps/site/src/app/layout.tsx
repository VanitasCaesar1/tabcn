import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import { Sidebar } from '@/components/sidebar';
import { SiteFooter } from '@/components/site-footer';
import { themeScript } from '@/components/theme-toggle';
import { absoluteUrl, site } from '@/lib/site';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

const shareAlt = 'tabcn: nine of its animated tab bars for React Native and Expo';

export const metadata: Metadata = {
  metadataBase: new URL(`${site.url}/`),
  title: {
    default: `${site.name}: ${site.tagline.toLowerCase()}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    'react native',
    'expo',
    'expo router',
    'react navigation',
    'tab bar',
    'bottom tabs',
    'reanimated',
    'shadcn',
  ],
  // Link previews: scripts/og-images.py makes these from the simulator recordings.
  openGraph: {
    type: 'website',
    siteName: site.name,
    locale: site.locale,
    url: './',
    images: [{ url: absoluteUrl('/og.jpg'), width: 1200, height: 630, alt: shareAlt }],
  },
  twitter: {
    card: 'summary_large_image',
    creator: `@${site.x}`,
    images: [{ url: absoluteUrl('/og.jpg'), alt: shareAlt }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      // Dark first; the theme script switches to a saved "light" before first paint.
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script id="theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </head>
      <body className="min-h-full font-sans">
        <a
          href="#content"
          className="sr-only rounded-full bg-foreground px-4 py-2 font-medium text-background text-sm outline-hidden focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2"
        >
          Skip to content
        </a>
        {/* Sidebar and page side by side on wide screens; the page column carries its own
            header, content and footer. (Shell from ui lab, MIT.) */}
        <div className="flex min-h-dvh">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            {children}
            <SiteFooter />
          </div>
        </div>
      </body>
    </html>
  );
}
