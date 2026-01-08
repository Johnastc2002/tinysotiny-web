'use server';

import { getDailyEntries } from '@/lib/contentful';

export async function getDailyEntriesAction(page: number) {
  return await getDailyEntries(page, 10);
}

