'use client';

import { ContentfulLivePreview } from '@contentful/live-preview';
import { useEffect } from 'react';

export default function ContentfulPreviewInit() {
  useEffect(() => {
    try {
      ContentfulLivePreview.init({
        locale: 'en-US',
        enableInspectorMode: true,
        enableLiveUpdates: true,
        targetOrigin: [
          'https://app.contentful.com',
          'https://app.eu.contentful.com',
        ],
      });
    } catch {
      // SDK init failed silently
    }
  }, []);

  return null;
}
