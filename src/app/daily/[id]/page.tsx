import React from 'react';
import { notFound } from 'next/navigation';
import { getDailyEntryById } from '@/lib/contentful';
import HorizontalScroll from '@/components/HorizontalScroll';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export const revalidate = 3600; // Revalidate every hour

export default async function DailyDetail({ params }: PageProps) {
  const { id } = await params;
  const daily = await getDailyEntryById(id);

  if (!daily) {
    notFound();
  }

  return (
    <div className="w-full bg-[#fcfcfc]">
      <HorizontalScroll daily={daily} />
    </div>
  );
}



