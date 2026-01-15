import {
  getFeaturedProjects,
  getNonFeaturedProjects,
  getGridFilter,
  getAppConfig,
} from '@/lib/contentful';
import GalleryPageClient from '@/components/GalleryPageClient';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function Play() {
  const featuredProjects = await getFeaturedProjects('play');
  const nonFeaturedProjects = await getNonFeaturedProjects(1, 12, 'play');
  const gridFilter = await getGridFilter('play');
  const appConfig = await getAppConfig();

  return (
    <main className="w-full min-h-screen">
      <GalleryPageClient
        initialFeaturedProjects={featuredProjects}
        initialNonFeaturedProjects={nonFeaturedProjects}
        gridFilter={gridFilter}
        projectType="play"
        enableExplosion={true}
        explosionDelay={0}
        showPlayGrid={appConfig?.show_play_grid}
      />
    </main>
  );
}
