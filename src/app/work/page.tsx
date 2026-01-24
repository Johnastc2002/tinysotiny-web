import { Metadata, ResolvingMetadata } from 'next';
import {
  getFeaturedProjects,
  getNonFeaturedProjects,
  getGridFilter,
  getProjectById,
} from '@/lib/contentful';
import GalleryPageClient from '@/components/GalleryPageClient';

export const revalidate = 60; // Revalidate every 60 seconds

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  { searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const params = await searchParams;
  const projectId = params.project;

  const previousImages = (await parent).openGraph?.images || [];

  if (typeof projectId === 'string') {
    const project = await getProjectById(projectId);
    if (project) {
      const thumbnail = project.thumbnails?.[0] || project.bubble_thumbnail;
      const images = thumbnail
        ? [
            {
              url: thumbnail,
              width: 1200,
              height: 630,
              alt: project.title,
            },
          ]
        : previousImages;

      return {
        title: `${project.title} | tinysotiny.co`,
        description: project.description,
        openGraph: {
          title: project.title,
          description: project.description,
          images: images,
        },
        twitter: {
          card: 'summary_large_image',
          title: project.title,
          description: project.description,
          images: thumbnail ? [thumbnail] : [],
        },
      };
    }
  }

  return {
    title: 'Work | tinysotiny.co',
    description: 'Selected works.',
  };
}

export default async function Work() {
  const featuredProjects = await getFeaturedProjects('work');
  const nonFeaturedProjects = await getNonFeaturedProjects(1, 12, 'work');
  const gridFilter = await getGridFilter('work');

  return (
    <main className="w-full min-h-screen">
      <GalleryPageClient
        initialFeaturedProjects={featuredProjects}
        initialNonFeaturedProjects={nonFeaturedProjects}
        gridFilter={gridFilter}
        projectType="work"
        enableExplosion={false}
        explosionDelay={0}
      />
    </main>
  );
}
