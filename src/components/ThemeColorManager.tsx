'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function ThemeColorManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let color = '#fcfcfc'; // Default for About, Client, Daily

    if (pathname === '/' || pathname === '/work') {
      color = '#efefef';
    } else if (pathname === '/play') {
      // If card is open, use black to prevent white flash
      if (searchParams.get('card')) {
        color = '#000000';
      } else {
        // Play page background is a gradient/image, but base is black/dark
        color = '#000000';
      }
    }

    // Set body and html background color to ensure overscroll matches
    document.body.style.backgroundColor = color;
    document.documentElement.style.backgroundColor = color;

    // Also update theme-color meta tag dynamically for immediate effect
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', color);
    }
  }, [pathname, searchParams]);

  return null;
}
