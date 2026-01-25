'use client';

import React, { useRef } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import animationData from '@/assets/animations/tinysotiny_symbol_blue.json';

interface AnimatedLogoProps {
  shouldBeDark: boolean;
  isMobile: boolean;
}

const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ shouldBeDark, isMobile }) => {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  
  // Original aspect ratio from Lottie file (321/302)
  const originalRatio = 321 / 302; // ~1.06
  
  // Visual aspect ratio (cropped) - tighter fit to remove horizontal padding
  // Increased slightly from 0.45 to 0.6 to prevent animation clipping
  const visualRatio = 0.6;

  // Match the hamburger menu size: 2.5rem (40px) on mobile, 3rem (48px) on desktop
  const height = isMobile ? 40 : 48;
  
  // Container width (cropped)
  const containerWidth = height * visualRatio;
  
  // Actual Lottie width (full size to maintain aspect ratio with height)
  const lottieWidth = height * originalRatio;

  return (
    <div
      style={{
        height: `${height}px`,
        width: `${containerWidth}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: shouldBeDark ? 'brightness(0) invert(1)' : 'none',
        overflow: 'hidden', // Crop the excess width
      }}
      onMouseEnter={() => lottieRef.current?.play()}
      onMouseLeave={() => lottieRef.current?.stop()}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={true}
        autoplay={false}
        // Force the Lottie to be the correct width for the height, ignoring container width constraint
        style={{ 
          height: '100%', 
          width: `${lottieWidth}px`, 
          minWidth: `${lottieWidth}px` 
        }}
      />
    </div>
  );
};

export default AnimatedLogo;
