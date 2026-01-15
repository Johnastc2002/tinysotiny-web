import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import { getContact } from '@/lib/contentful';
import { VideoProvider } from '@/context/VideoContext';
import { CursorProvider } from '@/context/CursorContext';
import GlobalCursor from '@/components/GlobalCursor';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'tinysotiny.co',
  description: 'tiny details matter.',
};

export const revalidate = 3600; // Revalidate every hour

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const contact = await getContact();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        <CursorProvider>
          <VideoProvider>
            <GlobalCursor />
            <Suspense fallback={null}>
              <Navigation contact={contact} />
            </Suspense>
            {children}
          </VideoProvider>
        </CursorProvider>
      </body>
    </html>
  );
}
