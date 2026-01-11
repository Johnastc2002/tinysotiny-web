import React, { Suspense } from 'react';
import Link from 'next/link';
import { getDailyEntries } from '@/lib/contentful';
import DailyList from '@/components/DailyList';

export const revalidate = 3600; // Revalidate every hour

export default async function Daily() {
  // Fetch initial daily entries.
  const initialItems = await getDailyEntries(1, 10);

  return (
    <div className="min-h-screen w-full bg-[#fcfcfc] px-8 py-8 md:px-16 md:py-12 flex flex-col">
      {/* Logo */}
      <div className="mb-12 md:mb-20">
        <Link
          href="/"
          className="text-4xl font-bold tracking-tighter text-[#0F2341] hover:text-gray-600 transition-colors"
        >
          t.
        </Link>
      </div>

      <main className="w-full flex-1 flex flex-col items-center">
        {/* Client Side Daily List with Infinite Scroll */}
        <Suspense fallback={<div>Loading...</div>}>
          <DailyList initialItems={initialItems} />
        </Suspense>
      </main>
    </div>
  );
}
