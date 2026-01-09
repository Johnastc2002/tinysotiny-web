import {
  getFeaturedProjects,
  getNonFeaturedProjects,
  getGridFilter,
} from '@/lib/contentful';
import WorkPageClient from '@/components/WorkPageClient';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function Work() {
  const featuredProjects = await getFeaturedProjects('work');
  const nonFeaturedProjects = await getNonFeaturedProjects(1, 12, 'work');
  const gridFilter = await getGridFilter('work');

  return (
    <main className="w-full min-h-screen">
      <WorkPageClient
        initialFeaturedProjects={featuredProjects}
        initialNonFeaturedProjects={nonFeaturedProjects}
        gridFilter={gridFilter}
      />
    </main>
  );
}
