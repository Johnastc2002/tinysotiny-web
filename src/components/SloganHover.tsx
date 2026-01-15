'use client';

import React, { useState, useRef } from 'react';
import { useMotionValue } from 'framer-motion';
import { ImageMeta } from '@/types/client';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ImageTrailOverlay } from './ui/ImageTrailOverlay';

interface SloganHoverProps {
  slogan: string;
  images?: ImageMeta[];
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const BUFFER = 100;

export default function SloganHover({ slogan, images }: SloganHoverProps) {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Shared mouse values (relative to container)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const [interactionState, setInteractionState] = useState<{
    initialX: number;
    initialY: number;
    bounds: Bounds;
  } | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (isMobile) return;
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const relX = e.clientX - containerRect.left;
      const relY = e.clientY - containerRect.top;

      mouseX.set(relX);
      mouseY.set(relY);

      // Define bounds for the overlay movement.
      // Since the container wraps the text, we allow movement within the container + buffer
      const bounds: Bounds = {
        minX: -BUFFER,
        maxX: containerRect.width + BUFFER,
        minY: -BUFFER,
        maxY: containerRect.height + BUFFER,
      };

      setInteractionState({
        initialX: relX,
        initialY: relY,
        bounds,
      });
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative block w-fit" // w-fit so bounds are tight to text
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isHovered && interactionState && images && images.length > 0 && (
        <ImageTrailOverlay
          images={images}
          initialX={interactionState.initialX}
          initialY={interactionState.initialY}
          mouseX={mouseX}
          mouseY={mouseY}
          bounds={interactionState.bounds}
        />
      )}
      <h1 className="mb-8 font-['Value_Serif'] font-medium text-6xl leading-tight text-[#0F2341] md:text-6xl lg:text-7xl">
        {slogan}
      </h1>
    </div>
  );
}
