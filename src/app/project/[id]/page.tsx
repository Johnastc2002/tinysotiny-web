import React from 'react';
import { notFound } from 'next/navigation';
import { getProjectById, getRecommendedProject } from '@/lib/contentful';
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

  const recommendedProject = await getRecommendedProject(
    id,
    project.projectType
  );

  return (
    <ProjectPageClient
      project={project}
      recommendedProject={recommendedProject}
    />
  );
}
