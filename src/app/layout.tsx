import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import ComingSoon from '@/components/ComingSoon';
// import { Suspense } from 'react';
// import Navigation from '@/components/Navigation';
// import { getContact } from '@/lib/contentful';
// import { VideoProvider } from '@/context/VideoContext';
// import { CursorProvider } from '@/context/CursorContext';
// import GlobalCursor from '@/components/GlobalCursor';
// import ThemeColorManager from '@/components/ThemeColorManager';
// import ContentfulPreviewWrapper from '@/components/ContentfulPreviewProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#efefef',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://tinysotiny-web.vercel.app'),
  title: 'tinysotiny.co',
  description: 'tiny details matter.',
  openGraph: {
    title: 'tinysotiny.co',
    description: 'tiny details matter.',
    url: 'https://tinysotiny-web.vercel.app',
    siteName: 'tinysotiny.co',
    images: [
      {
        url: 'https://tinysotiny-web.vercel.app/logo-url.png',
        width: 800,
        height: 600,
        alt: 'tinysotiny.co logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'tinysotiny.co',
    description: 'tiny details matter.',
    images: ['https://tinysotiny-web.vercel.app/logo-url.png'],
  },
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo-app.png',
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: '/logo-app.png',
    },
  },
  appleWebApp: {
    title: 'tinysotiny',
    statusBarStyle: 'black-translucent',
    capable: true,
    startupImage: ['/logo-app.png'],
  },
  manifest: '/manifest.json',
};

export const revalidate = 3600;

export default function RootLayout({
  children: _children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        <ComingSoon />
        {/* Temporarily replaced — restore the block below to bring the site back:
        <ContentfulPreviewWrapper>
          <CursorProvider>
            <VideoProvider>
              <Suspense fallback={null}>
                <ThemeColorManager />
              </Suspense>
              <GlobalCursor />
              <Suspense fallback={null}>
                <Navigation contact={contact} />
              </Suspense>
              {children}
            </VideoProvider>
          </CursorProvider>
        </ContentfulPreviewWrapper>
        */}
      </body>
    </html>
  );
}
