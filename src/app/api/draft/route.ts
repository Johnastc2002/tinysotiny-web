import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import { getProjectBySlug } from '@/lib/contentful';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const slug = searchParams.get('slug');

  if (secret !== process.env.CONTENTFUL_PREVIEW_SECRET) {
    return new Response('Invalid token', { status: 401 });
  }

  const draft = await draftMode();
  draft.enable();

  // If slug is provided and looks like a project page, try to determine the correct type
  if (slug) {
    // Extract the actual slug from the path if it's a full path like /work/slug
    const slugParts = slug.split('/');
    const potentialProjectSlug = slugParts[slugParts.length - 1];

    if (potentialProjectSlug) {
      // Fetch the project to check its type
      // Note: This will use the preview client because we just enabled draft mode
      const project = await getProjectBySlug(potentialProjectSlug);

      if (project) {
        const correctPath = `/${project.projectType}/${project.slug}`;
        if (slug !== correctPath) {
          redirect(correctPath);
        }
      }
    }
  }

  redirect(slug || '/');
}
