'use client';

import React from 'react';
import Lottie from 'lottie-react';
import animationData from '@/assets/animations/branding.json';

// Filter out the solid background layer (usually type 1 and/or specific name)
// We create a shallow copy of the animation data to avoid mutating the original import
const cleanAnimationData = {
  ...animationData,
  layers: animationData.layers.filter((layer) => layer.nm !== 'Deep Royal Blue Solid 2'),
};

const BrandingAnimation = () => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Lottie
        animationData={cleanAnimationData}
        loop={true}
        autoplay={true}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default BrandingAnimation;
