import { createClient } from 'contentful';
import { draftMode } from 'next/headers';
import { Project, GridFilter } from '@/types/project';
import { AppConfig } from '@/types/app-config';
import { AboutUsData, ContactData } from '@/types/about';
import { ClientData } from '@/types/client';
import { DailyData } from '@/types/daily';
import {
  mapProject,
  mapDaily,
  mapContact,
  mapAboutUs,
  mapClient,
  mapGridFilter,
  mapAppConfig,
} from './mappers';

const SPACE_ID = process.env.CONTENTFUL_SPACE_ID;
const ACCESS_TOKEN = process.env.CONTENTFUL_ACCESS_TOKEN;
const PREVIEW_ACCESS_TOKEN = process.env.CONTENTFUL_PREVIEW_ACCESS_TOKEN;
const ENVIRONMENT = process.env.CONTENTFUL_ENVIRONMENT || 'master';

if (!SPACE_ID || !ACCESS_TOKEN) {
  console.warn(
    'Contentful Space ID or Access Token is missing. Please check your environment variables.',
  );
}

export const client = createClient({
  space: SPACE_ID || '',
  accessToken: ACCESS_TOKEN || '',
  environment: ENVIRONMENT,
}).withoutUnresolvableLinks;

const previewClient = PREVIEW_ACCESS_TOKEN
  ? createClient({
      space: SPACE_ID || '',
      accessToken: PREVIEW_ACCESS_TOKEN,
      environment: ENVIRONMENT,
      host: 'preview.contentful.com',
    }).withoutUnresolvableLinks
  : null;

export const getEntries = async (
  content_type?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query?: Record<string, any>,
) => {
  if (!SPACE_ID || !ACCESS_TOKEN) {
    throw new Error('Contentful credentials are not set');
  }

  const { isEnabled } = await draftMode();
  if (isEnabled && !previewClient) {
    throw new Error(
      'Draft mode is enabled but CONTENTFUL_PREVIEW_ACCESS_TOKEN is not set',
    );
  }
  const currentClient = isEnabled ? previewClient! : client;

  const params = { ...query };
  if (content_type) {
    params.content_type = content_type;
  }

  try {
    const entries = await currentClient.getEntries(params);
    return entries;
  } catch (error) {
    console.error('Error fetching entries from Contentful:', error);
    throw error;
  }
};

export const getSocialImageUrl = (
  url: string | undefined,
): string | undefined => {
  if (!url) return undefined;

  // Helper to replace or append param
  const setParam = (u: string, key: string, value: string) => {
    const regex = new RegExp(`([?&])${key}=[^&]*`);
    if (regex.test(u)) {
      return u.replace(regex, `$1${key}=${value}`);
    }
    const separator = u.includes('?') ? '&' : '?';
    return `${u}${separator}${key}=${value}`;
  };

  let newUrl = url;
  newUrl = setParam(newUrl, 'w', '800');
  newUrl = setParam(newUrl, 'h', '800');
  newUrl = setParam(newUrl, 'fit', 'thumb'); // Smart thumbnail crop
  newUrl = setParam(newUrl, 'f', 'faces'); // Focus on faces if present
  newUrl = setParam(newUrl, 'q', '80');
  newUrl = setParam(newUrl, 'fm', 'jpg'); // Force JPEG for maximum compatibility

  return newUrl;
};

export type ProjectType = 'work' | 'play';

export async function getFeaturedProjects(type?: ProjectType) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {
    'metadata.tags.sys.id[in]': 'featured',
    order: '-fields.projectDate,sys.id',
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
  type?: ProjectType,
) {
  const skip = (page - 1) * limit;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {
    'metadata.tags.sys.id[nin]': 'featured',
    order: '-fields.projectDate,sys.id',
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

export async function getProjectsByTags(
  tags: string[],
  page: number = 1,
  limit: number = 9,
  type?: ProjectType,
) {
  // First, find the IDs of the tags that match the display names
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tagQuery: Record<string, any> = {
    content_type: 'searchTag',
    'fields.displayName[in]': tags.join(','),
    limit: 100, // Assuming we won't have more than 100 tags selected at once
  };

  const tagEntries = await getEntries('searchTag', tagQuery);
  const tagIds = tagEntries.items.map((entry) => entry.sys.id);

  // If no tags found, return empty result (or handle as "no projects found")
  if (tagIds.length === 0) {
    return [];
  }

  const skip = (page - 1) * limit;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {
    'fields.tags.sys.id[in]': tagIds.join(','),
    order: '-fields.projectDate,sys.id',
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

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  try {
    const entries = await getEntries('project', {
      'fields.slug': slug,
      include: 3,
      limit: 1,
    });

    if (entries.items.length > 0) {
      return mapProject(entries.items[0]);
    }

    return null;
  } catch (error) {
    console.error(`Error fetching project with slug ${slug}:`, error);
    return null;
  }
}

export async function getRecommendedProject(
  currentId: string,
  projectType: ProjectType,
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
    order: '-fields.projectDate,sys.id',
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
      order: 'fields.clientName,sys.id',
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
  limit: number = 10,
): Promise<DailyData[]> {
  const skip = (page - 1) * limit;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {
    order: '-sys.createdAt,sys.id',
    limit,
    skip,
    include: 3,
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
    const entries = await getEntries('daily', { 'sys.id': id, include: 3 });
    if (entries.items.length > 0) {
      return mapDaily(entries.items[0]);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching daily entry with id ${id}:`, error);
    return null;
  }
}

export async function getDailyEntryBySlug(slug: string): Promise<DailyData | null> {
  try {
    const entries = await getEntries('daily', {
      'fields.slug': slug,
      include: 3,
      limit: 1,
    });

    if (entries.items.length > 0) {
      return mapDaily(entries.items[0]);
    }

    return null;
  } catch (error) {
    console.error(`Error fetching daily entry with slug ${slug}:`, error);
    return null;
  }
}

export async function getGridFilter(
  type?: ProjectType,
): Promise<GridFilter | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = { limit: 1, include: 2 };
    if (type) {
      query['fields.type'] = type;
    }

    const entries = await getEntries('gridFilter', query);
    if (entries.items.length > 0) {
      return mapGridFilter(entries.items[0]);
    }
    return null;
  } catch (error) {
    console.error('Error fetching grid filter:', error);
    return null;
  }
}

export async function getAppConfig(): Promise<AppConfig | null> {
  try {
    const entries = await getEntries('appConfig', { limit: 1 });
    if (entries.items.length > 0) {
      return mapAppConfig(entries.items[0]);
    }
    return null;
  } catch (error) {
    console.error('Error fetching app config:', error);
    return null;
  }
}
