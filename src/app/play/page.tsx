import BubbleScene from '@/components/BubbleScene';
import { getFeaturedProjects, getNonFeaturedProjects } from '@/lib/contentful';

export const revalidate = 3600; // Revalidate every hour

export default async function Play() {
  const featuredProjects = await getFeaturedProjects('play');
  // While we fetch non-featured projects, the current instruction implies showing featured bubbles (similar to work page which passes featuredProjects)
  // If the intent is to combine them or use them differently, we can adjust.
  // Based on "similar to work page... showing featured bubbles", I will pass featuredProjects.
  const nonFeaturedProjects = await getNonFeaturedProjects(
    1,
    undefined,
    'play'
  );

  return (
    <main className="w-full h-screen overflow-hidden">
      <BubbleScene
        mode="gallery"
        projects={[...featuredProjects, ...nonFeaturedProjects]}
      />
    </main>
  );
}
