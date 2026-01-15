import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Check for touch capability
      const hasTouch = 
        typeof window !== 'undefined' &&
        (('ontouchstart' in window) ||
         (navigator.maxTouchPoints > 0) ||
         // @ts-ignore
         (navigator.msMaxTouchPoints > 0));

      // Also check width as a fallback/reinforcement for mobile/tablet sizing
      // iPad Pro 12.9 is 1024px wide in portrait, 1366px in landscape.
      // We want to target mobile and tablet.
      // const isNarrow = typeof window !== 'undefined' && window.innerWidth <= 1024;
      
      // User agent check for good measure (some tablets might fail touch check in some contexts?)
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

      setIsMobile(hasTouch || isMobileUA);
    };

    checkMobile();
    
    // Debounce resize handler could be better but simple is fine for now
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

