import { Metadata } from 'next';
import {
  getFeaturedProjects,
  getNonFeaturedProjects,
  getGridFilter,
  getAppConfig,
  getProjectById,
} from '@/lib/contentful';
import GalleryPageClient from '@/components/GalleryPageClient';

export const revalidate = 60; // Revalidate every 60 seconds

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const params = await searchParams;
  const projectId = params.project;

  if (typeof projectId === 'string') {
    const project = await getProjectById(projectId);
    if (project) {
      const thumbnail = project.thumbnails?.[0] || project.bubble_thumbnail;
      return {
        title: `${project.title} | tinysotiny.co`,
        description: project.description,
        openGraph: {
          title: project.title,
          description: project.description,
          images: thumbnail ? [thumbnail] : [],
        },
      };
    }
  }

  return {
    title: 'Play | tinysotiny.co',
    description: 'Playground.',
  };
}

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
        playPageBgMedia={appConfig?.play_page_bg_media}
      />
    </main>
  );
}
