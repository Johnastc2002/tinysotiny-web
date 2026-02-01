'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface WelcomeAnimationProps {
  onComplete: () => void;
}

export default function WelcomeAnimation({ onComplete }: WelcomeAnimationProps) {
  // Use a unique key to force the SVG to reload and replay animation on every mount
  const uniqueSrc = `/opening.svg?t=${Date.now()}`;

  useEffect(() => {
    // Duration for the animation - adjust as needed
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
      className="fixed inset-0 z-[200] bg-[#efefef] flex items-center justify-center overflow-hidden"
    >
      <div className="relative w-1/3 h-1/3 md:w-1/5 md:h-1/5">
        {/* Assuming the SVG is placed in public/opening.svg */}
        <Image
          src={uniqueSrc}
          alt="Welcome Animation"
          fill
          className="object-contain"
          priority
          unoptimized
        />
      </div>
    </motion.div>
  );
}
