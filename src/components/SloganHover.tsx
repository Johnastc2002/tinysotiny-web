'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useSpring, MotionValue } from 'framer-motion';
import { ImageMeta } from '@/types/client';

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

const SloganImageOverlay = ({
  images,
  initialX,
  initialY,
  mouseX,
  mouseY,
  bounds,
}: {
  images: ImageMeta[];
  initialX: number;
  initialY: number;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  bounds: Bounds;
}) => {
  const x = useMotionValue(initialX);
  const y = useMotionValue(initialY);

  useEffect(() => {
    const updateX = (latestX: number) => {
      x.set(Math.min(Math.max(latestX, bounds.minX), bounds.maxX));
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

  const springConfig = { damping: 25, stiffness: 300, mass: 0.2 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const [isRightSide, setIsRightSide] = useState(false);

  useEffect(() => {
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

  const [randomOffsets, setRandomOffsets] = useState<number[]>([]);

  useEffect(() => {
    // Generate random offsets when the component mounts or when images change
    if (images) {
      const offsets = images.map(() => Math.random() * 100 - 50);
      setRandomOffsets(offsets);
    }
  }, [images]);

  if (!images || images.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-visible">
      <motion.div
        style={{ x: springX, y: springY }}
        className="absolute top-0 left-0"
      >
        {images.map((img, index) => {
          const offset =
            typeof window !== 'undefined' && window.innerWidth < 768 ? 30 : 60;
          const overlap = 120;

          let left;
          if (isRightSide) {
            const estimatedWidth =
              typeof window !== 'undefined' && window.innerWidth < 768
                ? 150
                : 200;
            left = -offset - estimatedWidth - index * overlap;
          } else {
            left = offset + index * overlap;
          }

          // Use the pre-generated random offset, fallback to deterministic if not ready
          const randomOffset = randomOffsets[index] !== undefined ? randomOffsets[index] : ((index * 37) % 100) - 50;
          const verticalOffset = randomOffset;
          
          const aspectRatio = img.width / img.height;
          const isLandscape = aspectRatio > 1;
          
          const baseSize = typeof window !== 'undefined' && window.innerWidth < 768 ? 150 : 200;
          
          let width, height;
          
          if (isLandscape) {
            width = baseSize * 1.2;
            height = width / aspectRatio;
          } else {
            height = baseSize * 1.25;
            width = height * aspectRatio;
          }

          return (
            <div
              key={index}
              className="absolute transition-transform duration-300 ease-out"
              style={{
                left: 0,
                top: 0,
                transform: `translate3d(${left}px, ${verticalOffset}px, 0) translate(0, -50%)`,
                width: width,
                height: height,
                zIndex: isRightSide ? 10 - index : index,
                willChange: 'transform',
                backfaceVisibility: 'hidden',
              }}
            >
              <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl bg-white">
                <Image
                  src={img.url}
                  alt={`Slogan image ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 150px, 200px"
                  priority={index < 3}
                  unoptimized
                />
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default function SloganHover({ slogan, images }: SloganHoverProps) {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
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
        <SloganImageOverlay
          images={images}
          initialX={interactionState.initialX}
          initialY={interactionState.initialY}
          mouseX={mouseX}
          mouseY={mouseY}
          bounds={interactionState.bounds}
        />
      )}
      <h1 className="mb-8 font-['Value_Serif'] font-medium text-6xl leading-tight text-[#0F2341] md:text-6xl lg:text-7xl cursor-default">
        {slogan}
      </h1>
    </div>
  );
}

