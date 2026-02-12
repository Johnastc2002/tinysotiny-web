'use server';

import {
  getDailyEntries,
  getDailyEntryById,
  getDailyEntryBySlug,
  getNonFeaturedProjects,
  getProjectsByTags,
  getProjectById,
  getProjectBySlug,
  getRecommendedProject,
  ProjectType,
} from '@/lib/contentful';

export async function getDailyEntriesAction(page: number) {
  return await getDailyEntries(page, 10);
}

export async function getDailyEntryByIdAction(id: string) {
  return await getDailyEntryById(id);
}

export async function getDailyEntryBySlugAction(slug: string) {
  return await getDailyEntryBySlug(slug);
}

export async function getMoreNonFeaturedProjects(
  page: number,
  type: ProjectType
) {
  return await getNonFeaturedProjects(page, 12, type);
}

export async function getFilteredProjectsAction(
  tags: string[],
  page: number,
  type: ProjectType
) {
  return await getProjectsByTags(tags, page, 12, type);
}

export async function getProjectByIdAction(id: string) {
  return await getProjectById(id);
}

export async function getProjectBySlugAction(slug: string) {
  return await getProjectBySlug(slug);
}

export async function getRecommendedProjectAction(
  currentId: string,
  type: ProjectType
) {
  return await getRecommendedProject(currentId, type);
}
