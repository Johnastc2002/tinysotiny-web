'use client';

import dynamic from 'next/dynamic';

const ContentfulPreviewInit = dynamic(
  () => import('./ContentfulPreviewInit'),
  { ssr: false }
);

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
