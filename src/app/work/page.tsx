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

  if (typeof projectId === 'string') {
    const project = await getProjectById(projectId);
    if (project) {
      let thumbnail = project.thumbnails?.[0] || project.bubble_thumbnail;

      // Fallback to banners if no thumbnail
      if (!thumbnail && project.banners?.length > 0) {
        thumbnail = project.banners[0];
      }

      // Fallback to first image in media_rows if still no thumbnail
      if (!thumbnail && project.media_rows?.length > 0) {
        for (const row of project.media_rows) {
          const firstImage = row.medias.find((m) => m.type === 'image');
          if (firstImage) {
            thumbnail = firstImage.url;
            break;
          }
        }
      }

      // Optimize thumbnail for social sharing (WhatsApp prefers < 300KB)
      // Replace w=1920 with w=1200 to reduce file size
      if (thumbnail && thumbnail.includes('w=1920')) {
        thumbnail = thumbnail.replace('w=1920', 'w=1200');
      }

      const defaultImage = '/logo.png';
      const images = thumbnail
        ? [
            {
              url: thumbnail,
              width: 1200,
              height: 630,
              alt: project.title,
            },
          ]
        : [defaultImage];

      return {
        title: `${project.title} | tinysotiny.co`,
        description: project.description,
        openGraph: {
          title: project.title,
          description: project.description,
          images: images,
          type: 'website',
        },
        twitter: {
          card: 'summary_large_image',
          title: project.title,
          description: project.description,
          images: thumbnail ? [thumbnail] : [defaultImage],
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
