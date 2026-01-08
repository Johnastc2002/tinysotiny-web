import BubbleScene from '@/components/BubbleScene';
import { getFeaturedProjects, getNonFeaturedProjects } from '@/lib/contentful';

export const revalidate = 3600; // Revalidate every hour

export default async function Work() {
  const featuredProjects = await getFeaturedProjects('work');
  const nonFeaturedProjects = await getNonFeaturedProjects(
    1,
    undefined,
    'work'
  );

  return (
    <main className="w-full h-screen overflow-hidden">
      <BubbleScene mode="gallery" projects={featuredProjects} />
    </main>
  );
}
