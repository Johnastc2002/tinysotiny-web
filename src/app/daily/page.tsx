import { Metadata, ResolvingMetadata } from 'next';
import React from 'react';
import { getDailyEntries, getDailyEntryById, getSocialImageUrl } from '@/lib/contentful';
import DailyList from '@/components/DailyList';

export const revalidate = 3600; // Revalidate every hour

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  { searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const params = await searchParams;
  const dailyId = params.daily;

  if (typeof dailyId === 'string') {
    const daily = await getDailyEntryById(dailyId);
    if (daily) {
      let thumbnailUrl = daily.thumbnail?.url;

      // Fallback to first image in medias if no thumbnail
      if (!thumbnailUrl && daily.medias?.length > 0) {
        const firstImage = daily.medias.find((m) => m.type === 'image');
        if (firstImage) {
          thumbnailUrl = firstImage.url;
        }
      }

      const socialThumbnail = getSocialImageUrl(thumbnailUrl);

      const defaultImage = '/logo.png';
      const images = socialThumbnail
        ? [
            {
              url: socialThumbnail,
              width: 1200,
              height: 630,
              alt: daily.title,
            },
          ]
        : [defaultImage];

      return {
        title: `${daily.title} | tinysotiny.co`,
        description: daily.description,
        openGraph: {
          title: daily.title,
          description: daily.description,
          images: images,
          type: 'website',
        },
        twitter: {
          card: 'summary_large_image',
          title: daily.title,
          description: daily.description,
          images: socialThumbnail ? [socialThumbnail] : [defaultImage],
        },
      };
    }
  }

  return {
    title: 'Daily | tinysotiny.co',
    description: 'Daily thoughts and inspirations.',
  };
}

export default async function Daily() {
  // Fetch initial daily entries.
  const initialItems = await getDailyEntries(1, 10);

  return (
    <div className="min-h-screen w-full bg-[#fcfcfc] px-8 py-8 md:px-16 md:py-12 flex flex-col">
      {/* Logo Spacer */}
      <div className="mb-12 md:mb-20"></div>

      <main className="w-full flex-1 flex flex-col items-center">
        {/* Client Side Daily List with Infinite Scroll */}
        <DailyList initialItems={initialItems} />
      </main>
    </div>
  );
}
