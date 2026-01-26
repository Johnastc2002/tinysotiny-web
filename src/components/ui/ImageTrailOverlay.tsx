'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  motion,
  useMotionValue,
  useSpring,
  MotionValue,
  useTransform,
} from 'framer-motion';
import { ImageMeta } from '@/types/client';

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface ImageTrailOverlayProps {
  images: ImageMeta[];
  initialX: number;
  initialY: number;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  bounds: Bounds;
  isRightSide?: boolean; // Optional: Force direction or let component decide?
}

const SnakeSegment = ({
  index,
  images,
  targetX,
  targetY,
  diffX = 0,
}: {
  index: number;
  images: ImageMeta[];
  targetX: MotionValue<number>;
  targetY: MotionValue<number>;
  diffX?: number;
}) => {
  const img = images[index];

  // Use state to store stable random values for THIS segment, initialized lazily
  const [randomY] = useState(() => {
    // Generate random Y offset between -110 and +110 for each segment
    const maxY = 110;
    return Math.random() * (maxY * 2) - maxY;
  });

  // Determine size
  const isSmall = typeof window !== 'undefined' && window.innerWidth < 768;
  const baseSize = isSmall ? 150 : 200;

  let width = 0;
  let height = 0;

  if (img) {
    const aspectRatio = img.width / img.height;
    const isLandscape = aspectRatio > 1;

    if (isLandscape) {
      width = baseSize * 1.2;
      height = width / aspectRatio;
    } else {
      height = baseSize * 1.25;
      width = height * aspectRatio;
    }
  }

  // Snake physics configuration
  const springConfig = { damping: 20, stiffness: 200, mass: 0.5 };
  const x = useSpring(targetX, springConfig);
  const y = useSpring(targetY, springConfig);

  // Offset the target for the next segment so they don't stack perfectly.
  // We use the image width to determine overlap spacing.
  const overlapFactor = 0.8; // 80% spacing (20% overlap)
  const spacing = width * overlapFactor;
  const direction = diffX >= 0 ? 1 : -1;

  const nextTargetX = useTransform(x, (v) => v + spacing * direction);
  // Use the local randomY for this segment's contribution to the chain
  const nextTargetY = useTransform(y, (v) => v + randomY);

  if (!img) return null;

  return (
    <>
      {index + 1 < images.length && (
        <SnakeSegment
          index={index + 1}
          images={images}
          targetX={nextTargetX}
          targetY={nextTargetY}
          diffX={diffX}
        />
      )}
      <motion.div
        style={{
          x,
          y,
          width,
          height,
          translateX: '24px',
          translateY: '24px',
          zIndex: 100 - index,
        }}
        className="absolute top-0 left-0 pointer-events-none"
      >
        <div className="relative w-full h-full rounded-xl overflow-hidden bg-white shadow-lg">
          <Image
            src={img.url}
            alt={`Thumbnail ${index}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 150px, 200px"
            unoptimized
            priority={index === 0}
          />
        </div>
      </motion.div>
    </>
  );
};

export const ImageTrailOverlay = ({
  images,
  initialX,
  initialY,
  mouseX,
  mouseY,
  bounds,
}: ImageTrailOverlayProps) => {
  // Create local motion values initialized to the specific start position of THIS interaction
  const x = useMotionValue(initialX);
  const y = useMotionValue(initialY);

  // Sync with parent mouse values, but clamp to bounds
  useEffect(() => {
    const updateX = (latestX: number) => {
      // Clamp to bounds to prevent overflow, but allow full range within bounds
      let newX = Math.min(Math.max(latestX, bounds.minX), bounds.maxX);
      
      // Additional safety clamp to viewport if window is available
      if (typeof window !== 'undefined') {
        const viewportWidth = window.innerWidth;
        // Assuming overlay is full width, clamp to [0, viewportWidth] roughly
        // But x is relative to container. We need to be careful.
        // For now, rely on bounds being correct.
      }
      x.set(newX);
    };
    const updateY = (latestY: number) => {
      y.set(Math.min(Math.max(latestY, bounds.minY), bounds.maxY));
    };

    const unsubX = mouseX.on('change', updateX);
    const unsubY = mouseY.on('change', updateY);

    return () => {
      unsubX();
      unsubY();
    };
  }, [mouseX, mouseY, x, y, bounds]);

  const [isRightSide, setIsRightSide] = useState(false);

  useEffect(() => {
    // Determine if cursor is on the right side of the screen/bounds to offset images to the left
    const checkSide = () => {
      if (typeof window !== 'undefined') {
        const center = (bounds.minX + bounds.maxX) / 2;
        setIsRightSide(x.get() > center);
      }
    };
    checkSide();
    const unsub = x.on('change', () => {
      if (typeof window !== 'undefined') {
        const center = (bounds.minX + bounds.maxX) / 2;
        setIsRightSide(x.get() > center);
      }
    });
    return unsub;
  }, [x, bounds]);

  if (!images || images.length === 0) return null;

  // Stagger direction based on screen side
  const offsetDistance = 200;
  const diffX = isRightSide ? -offsetDistance : offsetDistance;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-visible">
      <SnakeSegment
        index={0}
        images={images}
        targetX={x}
        targetY={y}
        diffX={diffX}
      />
    </div>
  );
};

