import React from 'react';
import { notFound } from 'next/navigation';
import { getProjectById } from '@/lib/contentful';
import ProjectPageClient from '@/components/ProjectPageClient';

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  return <ProjectPageClient project={project} />;
}
