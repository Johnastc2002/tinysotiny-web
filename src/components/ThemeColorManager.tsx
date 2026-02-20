'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function ThemeColorManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let color = '#fcfcfc'; // Default for About, Client, Daily, and Detail pages

    const isWork = pathname === '/work' || pathname?.startsWith('/work/');
    const isPlay = pathname === '/play' || pathname?.startsWith('/play/');
    
    // Check if we are on a detail page (slug exists in path or project param exists)
    // Note: pathname includes slug (e.g. /work/project-slug), so we check if it's EXACTLY /work or /play
    const isWorkRoot = pathname === '/work';
    const isPlayRoot = pathname === '/play';
    const hasProjectParam = searchParams.has('project');
    const hasCardParam = searchParams.has('card');

    if (isWork) {
      if (isWorkRoot && !hasProjectParam && !hasCardParam) {
        color = '#efefef'; // Work Grid
      } else {
        color = '#fcfcfc'; // Work Detail (Slug or Param)
      }
    } else if (isPlay) {
      if (isPlayRoot && !hasProjectParam && !hasCardParam) {
        color = '#000000'; // Play Grid
      } else {
        // Play Detail (Slug or Param)
        // If card param is present (preview), we might want black or white. 
        // Previous logic used black for card open to prevent white flash.
        // But full detail page should be white.
        // Let's stick to white for full detail (slug/project param) and black for grid.
        // If card is open on grid, it's still technically grid context but with overlay.
        // However, user wants "status bar color matches content".
        // If detail page is white, status bar should be white.
        color = '#fcfcfc'; 
        
        // Exception: If it's just the card preview on the play grid, maybe keep it black?
        // But if the card is full screen or close to it, white might be better if card is white.
        // Let's follow the plan: "If path is /play AND slug exists (or project param exists): Set color to #fcfcfc"
        // "If path is /play (no slug/param): Set color to #000000"
        
        // Refined logic based on plan:
        if (isPlayRoot && !hasProjectParam && !hasCardParam) {
             color = '#000000';
        } else if (isPlayRoot && hasCardParam && !hasProjectParam) {
             // Card preview on grid. 
             // Previous code: if (searchParams.get('card')) color = '#000000';
             // Let's keep it black for preview to avoid flashing if it's just a popover?
             // But if the user says "nothing changed" when navigating to detail...
             // Let's assume they mean full navigation.
             // If they navigate to /play/slug, isPlayRoot is false.
             color = '#000000'; 
        }
      }
    } else if (pathname === '/') {
        color = '#efefef';
    }

    // Override for explicit detail pages (slugs)
    // If pathname is /work/something or /play/something, it is NOT root, so it falls to default #fcfcfc, which is correct.

    // Set body and html background color to ensure overscroll matches
    document.body.style.backgroundColor = color;
    document.documentElement.style.backgroundColor = color;

    // Force update theme-color meta tag
    let metaThemeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = color;
    
  }, [pathname, searchParams]);

  return null;
}
