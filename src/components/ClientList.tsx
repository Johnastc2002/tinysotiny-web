'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ClientData } from '@/types/client';
import Image from 'next/image';
import { motion, useMotionValue, useSpring, MotionValue } from 'framer-motion';

interface ClientListProps {
  clients: ClientData[];
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const BUFFER = 100; // Buffer in pixels

const ClientImageOverlay = ({
  hoveredClient,
  initialX,
  initialY,
  mouseX, // Shared raw mouse motion values (relative to container)
  mouseY,
  bounds,
}: {
  hoveredClient: ClientData;
  initialX: number;
  initialY: number;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  bounds: Bounds;
}) => {
  // Create local motion values initialized to the specific start position of THIS interaction
  const x = useMotionValue(initialX);
  const y = useMotionValue(initialY);

  // Sync with parent mouse values, but clamp to bounds
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

  // Smooth spring animation
  const springConfig = { damping: 25, stiffness: 300, mass: 0.2 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  // Calculate direction based on current clamped position relative to viewport width?
  // Since we are using absolute positioning relative to container, we need to know container width or viewport width.
  // We can just use the 'x' value to determine side if container is full width.
  // But let's stick to the original logic using window.innerWidth if possible, or relative to center of bounds?

  // Original logic used mouseX.get() > viewportWidth / 2.
  // Here x is relative to container. We can approximate or pass viewport width.
  // Let's use a simpler heuristic: is it on the right half of the bounds?
  const [isRightSide, setIsRightSide] = useState(false);

  useEffect(() => {
    // Check initially and on updates
    const checkSide = () => {
      if (typeof window !== 'undefined') {
        // We need screen coordinates for this check to match original behavior accurately
        // But 'x' is relative.
        // Let's assume container is roughly centered or full width.
        // Or better, just check if x is past the midpoint of the bounds?
        // The original code used viewportWidth / 2.
        // Let's grab window width.
        setIsRightSide((x.get() || 0) > window.innerWidth / 2); // Approximate since x is relative
      }
    };
    checkSide();
    const unsub = x.on('change', () => {
      if (typeof window !== 'undefined') {
        // This is rough because x is relative. But for ClientList which is usually wide, it might work.
        // Better: pass the container's left offset to convert back to screen?
        // Let's just use the bounds center.
        const center = (bounds.minX + bounds.maxX) / 2;
        setIsRightSide(x.get() > center);
      }
    });
    return unsub;
  }, [x, bounds]);

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-visible">
      <motion.div
        style={{ x: springX, y: springY }}
        className="absolute top-0 left-0"
      >
        {hoveredClient.thumbnails?.map((src, index) => {
          // Logic from original component adapted
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

          // Generate random vertical offsets locally or pass them?
          // We can generate them here deterministically based on index to avoid flicker on re-mount?
          // Or generate once on mount.
          const verticalOffset = Math.random() * 100 - 50;

          return (
            <div
              key={index}
              className="absolute transition-all duration-300 ease-out"
              style={{
                left: left,
                top: verticalOffset, // utilizing the random offset
                transform: 'translate(0, -50%)',
                width: 'clamp(150px, 20vw, 200px)',
                height: 'clamp(187px, 25vw, 250px)',
                zIndex: isRightSide ? 10 - index : index,
              }}
            >
              <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl bg-gray-100">
                <Image
                  src={src}
                  alt={`${hoveredClient.clientName} thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 150px, 200px"
                  priority={index < 3}
                />
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default function ClientList({ clients }: ClientListProps) {
  const [hoveredClientId, setHoveredClientId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Shared mouse values (relative to container)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // State for the current interaction
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

  const handleMouseEnterClient = (e: React.MouseEvent, clientId: string) => {
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const itemRect = e.currentTarget.getBoundingClientRect();

      // Calculate relative position
      const relX = e.clientX - containerRect.left;
      const relY = e.clientY - containerRect.top;

      // Update shared mouse values immediately
      mouseX.set(relX);
      mouseY.set(relY);

      // Calculate bounds relative to container
      // Item bounds relative to container
      const itemLeft = itemRect.left - containerRect.left;
      const itemTop = itemRect.top - containerRect.top;
      const itemRight = itemLeft + itemRect.width;
      const itemBottom = itemTop + itemRect.height;

      const bounds: Bounds = {
        minX: itemLeft - BUFFER,
        maxX: itemRight + BUFFER,
        minY: itemTop - BUFFER,
        maxY: itemBottom + BUFFER,
      };

      setInteractionState({
        initialX: relX,
        initialY: relY,
        bounds,
      });
      setHoveredClientId(clientId);
    }
  };

  const hoveredClient = clients.find((c) => c.id === hoveredClientId);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-wrap justify-start items-center text-2xl md:text-4xl lg:text-5xl font-bold leading-normal tracking-wider text-gray-400"
      onMouseMove={handleMouseMove}
    >
      {/* Overlay Component */}
      {hoveredClient && interactionState && (
        <ClientImageOverlay
          key={hoveredClient.id} // Re-mount on client change to reset springs
          hoveredClient={hoveredClient}
          initialX={interactionState.initialX}
          initialY={interactionState.initialY}
          mouseX={mouseX}
          mouseY={mouseY}
          bounds={interactionState.bounds}
        />
      )}

      {/* List Items */}
      {clients.map((client) => (
        <div
          key={client.id}
          className="flex items-center relative z-20 h-[1.5em]"
          onMouseEnter={(e) => handleMouseEnterClient(e, client.id)}
          onMouseLeave={() => setHoveredClientId(null)}
        >
          {/* Container to prevent layout shift */}
          <div className="relative h-full flex items-center">
            {/* Invisible placeholder to reserve space for the bold/italic text */}
            <div
              className="font-serif italic invisible opacity-0 px-1"
              aria-hidden="true"
            >
              {client.clientName}
            </div>

            {/* Visible text positioned absolutely over the placeholder */}
            <div
              className={`absolute inset-0 flex items-center justify-center transition-transform duration-200 cursor-default whitespace-nowrap px-1 text-[#B6B6B6] hover:text-[#B6B6B6] ${
                hoveredClientId === client.id
                  ? 'font-serif italic scale-105'
                  : ''
              }`}
            >
              {client.clientName}
            </div>
          </div>
          <div className="mx-1 md:mx-2 text-[#B6B6B6] font-bold">.</div>
        </div>
      ))}
      <div className="flex items-center z-20">
        <div className="text-[#B6B6B6]">ETC...</div>
      </div>
    </div>
  );
}
