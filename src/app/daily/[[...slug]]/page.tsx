import { Metadata, ResolvingMetadata, Viewport } from 'next';
import React from 'react';
import {
  getDailyEntries,
  getDailyEntryById,
  getDailyEntryBySlug,
  getSocialImageUrl,
} from '@/lib/contentful';
import DailyList from '@/components/DailyList';

export const revalidate = 3600; // Revalidate every hour

export const viewport: Viewport = {
  themeColor: '#fcfcfc',
  viewportFit: 'cover',
};

type Props = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug } = await params;
  const { daily: dailyId } = await searchParams;

  let daily = null;
  if (slug && slug.length > 0) {
    const potentialSlugOrId = slug[slug.length - 1];
    daily = await getDailyEntryBySlug(potentialSlugOrId);
    // Fallback: try fetching by ID if slug lookup fails
    if (!daily) {
      daily = await getDailyEntryById(potentialSlugOrId);
    }
  } else if (typeof dailyId === 'string') {
    daily = await getDailyEntryById(dailyId);
  }

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

    const defaultImage = '/logo-url.png';
    const images = socialThumbnail
      ? [
          {
            url: socialThumbnail,
            width: 800,
            height: 800,
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

  return {
    title: 'Daily | tinysotiny.co',
    description: 'Daily thoughts and inspirations.',
  };
}

export default async function Daily({ params, searchParams }: Props) {
  const { slug } = await params;
  const { daily: dailyId } = await searchParams;

  // Fetch initial daily entries.
  const initialItems = await getDailyEntries(1, 10);

  let initialSelectedDaily = null;
  if (slug && slug.length > 0) {
    const potentialSlugOrId = slug[slug.length - 1];
    initialSelectedDaily = await getDailyEntryBySlug(potentialSlugOrId);
    if (!initialSelectedDaily) {
      initialSelectedDaily = await getDailyEntryById(potentialSlugOrId);
    }
  } else if (typeof dailyId === 'string') {
    initialSelectedDaily = await getDailyEntryById(dailyId);
  }

  return (
    <div className="relative w-full min-h-[100dvh] bg-[#fcfcfc] overflow-hidden">
      <div className="fixed inset-0 w-full h-[100dvh] overflow-y-auto z-30 bg-[#fcfcfc]">
        <main
          className="w-full min-h-full flex flex-col items-center px-8 md:px-16 pl-[calc(2rem+env(safe-area-inset-left))] pr-[calc(2rem+env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)]"
          style={{
            paddingTop: 'calc(6rem + env(safe-area-inset-top, 0px))',
          }}
        >
          {/* Client Side Daily List with Infinite Scroll */}
          <DailyList
            initialItems={initialItems}
            initialSelectedDaily={initialSelectedDaily}
          />
        </main>
      </div>
    </div>
  );
}
