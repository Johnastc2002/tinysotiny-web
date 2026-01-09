'use server';

import {
  getDailyEntries,
  getNonFeaturedProjects,
  getProjectsByTags,
  ProjectType,
} from '@/lib/contentful';

export async function getDailyEntriesAction(page: number) {
  return await getDailyEntries(page, 10);
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
