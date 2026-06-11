'use client';

// Static import (not next/dynamic with ssr:false): the init must run before
// any page renders and subscribes to live updates, otherwise hard-loading a
// URL with a project open throws "Live updates are not initialized".
import ContentfulPreviewInit from './ContentfulPreviewInit';

export default function ContentfulPreviewWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ContentfulPreviewInit />
      {children}
    </>
  );
}
