import {
  getFeaturedProjects,
  getNonFeaturedProjects,
  getGridFilter,
} from '@/lib/contentful';
import GalleryPageClient from '@/components/GalleryPageClient';
import { Suspense } from 'react';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function Play() {
  const featuredProjects = await getFeaturedProjects('play');
  const nonFeaturedProjects = await getNonFeaturedProjects(1, 12, 'play');
  const gridFilter = await getGridFilter('play');

  return (
    <main className="w-full min-h-screen">
      <Suspense fallback={<div>Loading...</div>}>
        <GalleryPageClient
          initialFeaturedProjects={featuredProjects}
          initialNonFeaturedProjects={nonFeaturedProjects}
          gridFilter={gridFilter}
          projectType="play"
          enableExplosion={true}
          explosionDelay={0}
        />
      </Suspense>
    </main>
  );
}
