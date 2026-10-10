import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/providers';
import { Shell } from '@/components/shell';
import en from '../../messages/en.json';
import './globals.css';
import './fonts.css';
export const metadata: Metadata = {
  title: { default: 'PathMap Learn — Find your next chapter', template: '%s · PathMap Learn' },
  description:
    'Take the quiz, get a library built for you, stay on track, and see where your learning leads.',
  manifest: '/manifest.webmanifest',
  applicationName: 'PathMap Learn',
  appleWebApp: { capable: true, title: 'PathMap Learn', statusBarStyle: 'default' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#194c3a' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/manrope-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/dm-sans-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Providers initialMessages={en}>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
