import { Metadata, ResolvingMetadata, Viewport } from 'next';
import {
  getFeaturedProjects,
  getNonFeaturedProjects,
  getGridFilter,
  getProjectById,
  getProjectBySlug,
  getRecommendedProject,
  getSocialImageUrl,
} from '@/lib/contentful';
import GalleryPageClient from '@/components/GalleryPageClient';

export const revalidate = 60; // Revalidate every 60 seconds

export async function generateViewport({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Viewport> {
  const { slug } = await params;
  // If slug exists, we are on a detail page (White background).
  // Otherwise, we are on the grid page (Gray background).
  const themeColor = slug && slug[0] ? '#fcfcfc' : '#efefef';

  return {
    themeColor,
    viewportFit: 'cover',
  };
}

type Props = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug } = await params;
  const { project: projectId } = await searchParams;

  let project = null;
  if (slug && slug.length > 0) {
    const potentialSlugOrId = slug[slug.length - 1];
    project = await getProjectBySlug(potentialSlugOrId);
    if (!project) {
      project = await getProjectById(potentialSlugOrId);
    }
  } else if (typeof projectId === 'string') {
    project = await getProjectById(projectId);
  }

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

    const socialThumbnail = getSocialImageUrl(thumbnail);

    const defaultImage = '/logo-url.png';
    const images = socialThumbnail
      ? [
          {
            url: socialThumbnail,
            width: 800,
            height: 800,
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
        images: socialThumbnail ? [socialThumbnail] : [defaultImage],
      },
    };
  }

  return {
    title: 'Work | tinysotiny.co',
    description: 'Selected works.',
  };
}

export default async function Work({ params, searchParams }: Props) {
  const { slug } = await params;
  const { project: projectId } = await searchParams;

  const featuredProjects = await getFeaturedProjects('work');
  const nonFeaturedProjects = await getNonFeaturedProjects(1, 12, 'work');
  const gridFilter = await getGridFilter('work');

  let initialFullProject = null;
  let initialRecommendedProject = null;

  if (slug && slug.length > 0) {
    const potentialSlugOrId = slug[slug.length - 1];
    initialFullProject = await getProjectBySlug(potentialSlugOrId);
    if (!initialFullProject) {
      initialFullProject = await getProjectById(potentialSlugOrId);
    }
  } else if (typeof projectId === 'string') {
    initialFullProject = await getProjectById(projectId);
  }

  if (initialFullProject) {
    initialRecommendedProject = await getRecommendedProject(
      initialFullProject.id,
      'work',
    );
  }

  return (
    <main className="w-full min-h-screen">
      <GalleryPageClient
        initialFeaturedProjects={featuredProjects}
        initialNonFeaturedProjects={nonFeaturedProjects}
        gridFilter={gridFilter}
        projectType="work"
        enableExplosion={false}
        explosionDelay={0}
        initialFullProject={initialFullProject}
        initialRecommendedProject={initialRecommendedProject}
      />
    </main>
  );
}
