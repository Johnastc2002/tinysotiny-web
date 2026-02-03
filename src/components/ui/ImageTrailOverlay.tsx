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

// Helper to get image dimensions
const getImageDimensions = (img: ImageMeta | undefined) => {
  if (typeof window === 'undefined') return { width: 0, height: 0 };
  const isSmall = window.innerWidth < 768;
  const baseSize = isSmall ? 150 : 200;
  
  if (!img) return { width: 0, height: 0 };
  
  const aspectRatio = img.width / img.height;
  if (aspectRatio > 1) {
    return { width: baseSize * 1.2, height: (baseSize * 1.2) / aspectRatio };
  } else {
    const h = baseSize * 1.25;
    return { width: h * aspectRatio, height: h };
  }
};

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
  const { width, height } = getImageDimensions(img);

  // Use state to store stable random values for THIS segment, initialized lazily
  const [randomY] = useState(() => {
    // Generate random Y offset between -110 and +110 for each segment
    const maxY = 110;
    return Math.random() * (maxY * 2) - maxY;
  });

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

// Helper to calculate total width of the snake
const calculateTotalWidth = (images: ImageMeta[]) => {
  const overlapFactor = 0.8;
  let totalWidth = 0;
  
  images.forEach((img, index) => {
    const { width } = getImageDimensions(img);
    
    // Add spacing (for all except last, but effectively the chain length is sum of spacings + last width)
    if (index < images.length - 1) {
      totalWidth += width * overlapFactor;
    } else {
      totalWidth += width;
    }
  });
  
  return totalWidth;
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
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Sync with parent mouse values, but clamp to bounds
  useEffect(() => {
    const updateX = (latestX: number) => {
      // Clamp to bounds to prevent overflow, but allow full range within bounds
      let newX = Math.min(Math.max(latestX, bounds.minX), bounds.maxX);
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
    const checkDirection = () => {
      if (typeof window === 'undefined' || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = x.get(); // relative to container
      const viewportX = rect.left + currentX;
      const totalWidth = calculateTotalWidth(images);
      const padding = 40; // Safety buffer
      
      // Calculate available space
      const spaceRight = window.innerWidth - viewportX;
      const spaceLeft = viewportX;
      
      // Calculate width of first image to be precise
      const { width: firstImgWidth } = getImageDimensions(images[0]);
      
      // Space needed to the right (if we go right)
      // We need room for the full chain starting from x.
      const canRightCheck = spaceRight >= (totalWidth + padding);

      // Space needed to the left (if we go left)
      // The leftmost edge would be x - (totalWidth - firstImgWidth).
      const canLeftCheck = viewportX >= (totalWidth + padding);

      // Priority Logic:
      // 1. If only one side fits, pick that side.
      // 2. If both fit, use standard center logic.
      // 3. If neither fit, pick side with MORE space.
      
      if (canRightCheck && !canLeftCheck) {
        setIsRightSide(false); // Force Right (diffX positive)
      } else if (canLeftCheck && !canRightCheck) {
        setIsRightSide(true); // Force Left (diffX negative)
      } else if (canRightCheck && canLeftCheck) {
        // Both fit, use cursor position preference
        const center = (bounds.minX + bounds.maxX) / 2;
        setIsRightSide(currentX > center);
      } else {
        // Neither fit fully. Pick the side with MORE space.
        if (spaceLeft > spaceRight) {
          setIsRightSide(true); // Go Left
        } else {
          setIsRightSide(false); // Go Right
        }
      }
    };

    checkDirection();
    const unsub = x.on('change', checkDirection);
    window.addEventListener('resize', checkDirection);
    return () => {
      unsub();
      window.removeEventListener('resize', checkDirection);
    };
  }, [x, bounds, images]);

  if (!images || images.length === 0) return null;

  // Stagger direction based on screen side
  const offsetDistance = 200;
  const diffX = isRightSide ? -offsetDistance : offsetDistance;
  
  // Calculate offset to shift the chain origin
  // If going Left (isRightSide=true), we want the first image to end at the cursor.
  // So we shift it left by its width + padding.
  // If going Right, we shift it right by padding.
  const { width: firstWidth } = getImageDimensions(images[0]);
  const offsetX = isRightSide ? -(firstWidth + 20) : 20;
  
  // Create a transformed motion value for the first segment
  const startX = useTransform(x, (v) => v + offsetX);

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-50 overflow-visible">
      <SnakeSegment
        index={0}
        images={images}
        targetX={startX}
        targetY={y}
        diffX={diffX}
      />
    </div>
  );
};

