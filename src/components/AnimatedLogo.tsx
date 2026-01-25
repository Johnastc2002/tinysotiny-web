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
  
  // Aspect ratio is roughly 321/302 ~= 1.06
  // Match the hamburger menu size: 2.5rem (40px) on mobile, 3rem (48px) on desktop
  const height = isMobile ? 40 : 48;
  const width = height * (321 / 302);

  return (
    <div
      style={{
        height: `${height}px`,
        width: `${width}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: shouldBeDark ? 'brightness(0) invert(1)' : 'none',
      }}
      onMouseEnter={() => lottieRef.current?.play()}
      onMouseLeave={() => lottieRef.current?.stop()}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={true}
        autoplay={false}
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
};

export default AnimatedLogo;
