'use server';

import {
  getDailyEntries,
  getNonFeaturedProjects,
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
