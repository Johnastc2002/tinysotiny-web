'use client';

import { ContentfulLivePreview } from '@contentful/live-preview';

let initialized = false;

function initLivePreview() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
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
}

// Initialize as soon as this module is evaluated on the client. This must
// happen before any component subscribes via useContentfulLiveUpdates —
// pages that hard-load with a project open subscribe on their very first
// render, which races (and previously crashed) against an init deferred to
// a dynamically imported component's effect.
initLivePreview();

export default function ContentfulPreviewInit() {
  initLivePreview();
  return null;
}
