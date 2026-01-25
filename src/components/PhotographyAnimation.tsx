'use client';

import React from 'react';
import Lottie from 'lottie-react';
import animationData from '@/assets/animations/photography.json';

const PhotographyAnimation = () => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Lottie
        animationData={animationData}
        loop={true}
        autoplay={true}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default PhotographyAnimation;
