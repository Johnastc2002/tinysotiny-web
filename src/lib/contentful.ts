import { createClient } from 'contentful';
import { Project } from '@/types/project';
import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import { Document } from '@contentful/rich-text-types';

const SPACE_ID = process.env.CONTENTFUL_SPACE_ID;
const ACCESS_TOKEN = process.env.CONTENTFUL_ACCESS_TOKEN;

if (!SPACE_ID || !ACCESS_TOKEN) {
  console.warn(
    'Contentful Space ID or Access Token is missing. Please check your environment variables.'
  );
}

export const client = createClient({
  space: SPACE_ID || '',
  accessToken: ACCESS_TOKEN || '',
});

export const getEntries = async (
  content_type?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query?: Record<string, any>
) => {
  if (!SPACE_ID || !ACCESS_TOKEN) {
    throw new Error('Contentful credentials are not set');
  }

  const params = { ...query };
  if (content_type) {
    params.content_type = content_type;
  }

  try {
    const entries = await client.getEntries(params);
    return entries;
  } catch (error) {
    console.error('Error fetching entries from Contentful:', error);
    throw error;
  }
};

// Helper to safely get image URL
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAssetUrl = (asset: any): string => {
  if (!asset || !asset.fields || !asset.fields.file || !asset.fields.file.url) {
    return '';
  }
  return `https:${asset.fields.file.url}`;
};

// Helper to parse Rich Text to simple string (or HTML if preferred)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseRichText = (document: any): string => {
  if (!document) return '';
  return documentToHtmlString(document as Document);
};

// Mapper function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapProject = (entry: any): Project => {
  const fields = entry.fields;

  // Map metadata tags to string array
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tags = entry.metadata?.tags?.map((tag: any) => tag.sys.id) || [];

  return {
    id: entry.sys.id,
    title: String(fields.title || ''),
    clientName: String(fields.clientName || ''),
    description: String(fields.description || ''),
    tags: tags,
    bubble_thumbnail: getAssetUrl(
      fields.bubbleThumbnail || fields.bubble_thumbnail
    ),
    bubble_thumbnail_hover:
      getAssetUrl(
        fields.bubbleThumbnailHover || fields.bubble_thumbnail_hover
      ) || undefined,
    thumbnails: (fields.thumbnails || [])
      .map(getAssetUrl)
      .filter((url: string) => url),
    banners: (fields.banners || [])
      .map(getAssetUrl)
      .filter((url: string) => url),
    cast: parseRichText(fields.cast),
    images: (fields.images || []).map(getAssetUrl).filter((url: string) => url),
  };
};

export type ProjectType = 'work' | 'play';

export async function getFeaturedProjects(type?: ProjectType) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {
    'metadata.tags.sys.id[in]': 'featured',
    order: '-fields.projectDate',
  };

  if (type) {
    query['fields.projectType'] = type;
  }

  const entries = await getEntries('project', query);
  return entries.items.map(mapProject);
}

export async function getNonFeaturedProjects(
  page: number = 1,
  limit: number = 9,
  type?: ProjectType
) {
  const skip = (page - 1) * limit;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {
    'metadata.tags.sys.id[nin]': 'featured',
    order: '-fields.projectDate',
    limit,
    skip,
  };

  if (type) {
    query['fields.projectType'] = type;
  }

  const entries = await getEntries('project', query);
  return entries.items.map(mapProject);
}

export async function getProjectById(id: string): Promise<Project | null> {
  try {
    const entry = await client.getEntry(id);
    return mapProject(entry);
  } catch (error) {
    console.error(`Error fetching project with id ${id}:`, error);
    return null;
  }
}

export async function getAllProjects(type?: ProjectType) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {
    order: '-fields.projectDate',
  };

  if (type) {
    query['fields.projectType'] = type;
  }

  // Fetch a large number or implement pagination if needed
  query.limit = 1000;

  const entries = await getEntries('project', query);
  return entries.items.map(mapProject);
}
