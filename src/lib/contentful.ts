import { createClient } from 'contentful';
import { Project, MediaRow } from '@/types/project';
import { AboutUsData, ContactData } from '@/types/about';
import { ClientData } from '@/types/client';
import { DailyData } from '@/types/daily';
import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import { Document } from '@contentful/rich-text-types';

const SPACE_ID = process.env.CONTENTFUL_SPACE_ID;
const ACCESS_TOKEN = process.env.CONTENTFUL_ACCESS_TOKEN;
const ENVIRONMENT = process.env.CONTENTFUL_ENVIRONMENT || 'master';

if (!SPACE_ID || !ACCESS_TOKEN) {
  console.warn(
    'Contentful Space ID or Access Token is missing. Please check your environment variables.'
  );
}

export const client = createClient({
  space: SPACE_ID || '',
  accessToken: ACCESS_TOKEN || '',
  environment: ENVIRONMENT,
}).withoutUnresolvableLinks; // Automatically remove links that cannot be resolved (e.g. archived/deleted)

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

// Helper to determine media type
const getMediaType = (contentType: string): 'image' | 'video' => {
  return contentType.startsWith('video/') ? 'video' : 'image';
};

// Helper to safely get image URL
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAssetUrl = (asset: any): string => {
  if (!asset || !asset.fields || !asset.fields.file || !asset.fields.file.url) {
    return '';
  }
  return `https:${asset.fields.file.url}`;
};

// Helper to safely get asset metadata
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAssetMetadata = (asset: any) => {
  if (!asset || !asset.fields || !asset.fields.file) {
    return { url: '', width: 0, height: 0, type: 'image' as const };
  }
  const file = asset.fields.file;
  return {
    url: `https:${file.url}`,
    width: file.details?.image?.width || 0,
    height: file.details?.image?.height || 0,
    type: getMediaType(file.contentType || ''),
  };
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
    // Prioritize camelCase 'mediaRows' as seen in the API response, fallback to snake_case
    media_rows: (fields.mediaRows || fields.media_rows || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((row: any) => {
        // If row is a Link (not resolved), row.fields will be undefined.
        // The SDK should resolve it if include > 0 and it's published.
        if (!row || !row.fields) return null;

        return {
          row_layout: (row.fields.rowLayout ||
            row.fields.row_layout ||
            'V-1') as MediaRow['row_layout'],
          medias: (row.fields.medias || [])
            .map(getAssetUrl)
            .filter((url: string) => url),
        };
      })
      // Filter out any nulls from unresolved links
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((row: any) => row !== null),
    description_2: String(fields.description_2 || fields.description2 || ''),
    projectType: (fields.projectType as ProjectType) || 'work',
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapContact = (entry: any): ContactData => {
  const fields = entry.fields;
  return {
    instagram: String(fields.instagram || ''),
    email: String(fields.email || ''),
    phone: String(fields.phone || ''),
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapAboutUs = (entry: any): AboutUsData => {
  const fields = entry.fields;
  return {
    slogan: String(fields.slogan || ''),
    firstParagraph: String(
      fields.first_paragraph || fields.firstParagraph || ''
    ),
    header: String(fields.header || ''),
    description2: String(fields.description_2 || fields.description2 || ''),
    categories: (fields.categories || []).map(String),
    founderImage: getAssetUrl(fields.founder_image || fields.founderImage),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    founders: (fields.founders || []).map((founder: any) => ({
      name: String(founder.fields?.name || ''),
      role: String(founder.fields?.role || ''),
    })),
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapClient = (entry: any): ClientData => {
  const fields = entry.fields;
  return {
    id: entry.sys.id,
    clientName: String(fields.client_name || fields.clientName || ''),
    thumbnails: (fields.thumbnails || [])
      .map(getAssetUrl)
      .filter((url: string) => url),
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapDaily = (entry: any): DailyData => {
  const fields = entry.fields;

  // Safely map medias, ensuring each item has width and height if available in the asset
  const mappedMedias = (fields.medias || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((asset: any) => {
      const metadata = getAssetMetadata(asset);
      return {
        url: metadata.url,
        width: metadata.width,
        height: metadata.height,
        type: metadata.type,
      };
    })
    .filter((media: { url: string }) => media.url);

  // Map thumbnail with dimensions
  const thumbAsset = fields.thumbnail;
  const thumbMeta = getAssetMetadata(thumbAsset);
  const thumbnail = {
    url: thumbMeta.url,
    width: thumbMeta.width,
    height: thumbMeta.height,
    type: thumbMeta.type,
  };

  // Map bgMedia with metadata to support video
  const bgAsset = fields.bg_media || fields.bgMedia;
  const bgMeta = getAssetMetadata(bgAsset);
  const bgMedia = bgMeta.url
    ? {
        url: bgMeta.url,
        width: bgMeta.width,
        height: bgMeta.height,
        type: bgMeta.type,
      }
    : undefined;

  return {
    id: entry.sys.id,
    title: String(fields.title || ''),
    thumbnail: thumbnail,
    description: String(fields.description || ''),
    medias: mappedMedias,
    bgMedia: bgMedia,
    description2: String(fields.description_2 || fields.description2 || ''),
    createdAt: entry.sys.createdAt,
  };
};

export type ProjectType = 'work' | 'play';

export async function getFeaturedProjects(type?: ProjectType) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {
    'metadata.tags.sys.id[in]': 'featured',
    order: '-fields.projectDate',
    include: 3,
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
    include: 3,
  };

  if (type) {
    query['fields.projectType'] = type;
  }

  const entries = await getEntries('project', query);
  return entries.items.map(mapProject);
}

export async function getProjectById(id: string): Promise<Project | null> {
  try {
    const entries = await getEntries('project', { 'sys.id': id, include: 3 });
    if (entries.items.length > 0) {
      return mapProject(entries.items[0]);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching project with id ${id}:`, error);
    return null;
  }
}

export async function getRecommendedProject(
  currentId: string,
  projectType: ProjectType
): Promise<Project | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {
      'sys.id[ne]': currentId,
      'fields.projectType': projectType,
      limit: 10,
      include: 3,
    };
    const entries = await getEntries('project', query);

    if (entries.items.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * entries.items.length);
    return mapProject(entries.items[randomIndex]);
  } catch (error) {
    console.error('Error fetching recommended project:', error);
    return null;
  }
}

export async function getAllProjects(type?: ProjectType) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {
    order: '-fields.projectDate',
    include: 3,
  };

  if (type) {
    query['fields.projectType'] = type;
  }

  // Fetch a large number or implement pagination if needed
  query.limit = 1000;

  const entries = await getEntries('project', query);
  return entries.items.map(mapProject);
}

export async function getContact(): Promise<ContactData | null> {
  try {
    const entries = await getEntries('contact', { limit: 1 });
    if (entries.items.length > 0) {
      return mapContact(entries.items[0]);
    }
    return null;
  } catch (error) {
    console.error('Error fetching contact:', error);
    return null;
  }
}

export async function getAboutUs(): Promise<AboutUsData | null> {
  try {
    const entries = await getEntries('aboutUs', { limit: 1 });
    if (entries.items.length > 0) {
      return mapAboutUs(entries.items[0]);
    }
    return null;
  } catch (error) {
    console.error('Error fetching aboutUs:', error);
    return null;
  }
}

export async function getAllClients(): Promise<ClientData[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {
      order: 'fields.clientName',
    };
    const entries = await getEntries('client', query);
    return entries.items.map(mapClient);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return [];
  }
}

export async function getDailyEntries(
  page: number = 1,
  limit: number = 10
): Promise<DailyData[]> {
  const skip = (page - 1) * limit;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {
    order: '-sys.createdAt',
    limit,
    skip,
  };

  try {
    const entries = await getEntries('daily', query);
    return entries.items.map(mapDaily);
  } catch (error) {
    console.error('Error fetching daily entries:', error);
    return [];
  }
}

export async function getDailyEntryById(id: string): Promise<DailyData | null> {
  try {
    const entry = await client.getEntry(id);
    return mapDaily(entry);
  } catch (error) {
    console.error(`Error fetching daily entry with id ${id}:`, error);
    return null;
  }
}
