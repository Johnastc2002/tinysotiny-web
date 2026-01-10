'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ClientData } from '@/types/client';
import Image from 'next/image';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface ClientListProps {
  clients: ClientData[];
}

export default function ClientList({ clients }: ClientListProps) {
  const [hoveredClientId, setHoveredClientId] = useState<string | null>(null);

  // Use Framer Motion values for performant cursor tracking without re-renders
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring animation for the cursor follower
  const springConfig = { damping: 25, stiffness: 300, mass: 0.2 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  // Store random offsets for the currently hovered client's images
  const [verticalOffsets, setVerticalOffsets] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    // Update motion values directly
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
  };

  const hoveredClient = clients.find((c) => c.id === hoveredClientId);

  // Generate new random offsets whenever a new client is hovered
  useEffect(() => {
    if (hoveredClient && hoveredClient.thumbnails) {
      // Generate an array of random offsets between -50 and 50
      const newOffsets = hoveredClient.thumbnails.map(
        () => Math.random() * 100 - 50
      );
      setVerticalOffsets(newOffsets);
    } else {
      setVerticalOffsets([]);
    }
  }, [hoveredClientId, hoveredClient]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-wrap justify-start items-center text-2xl md:text-4xl lg:text-5xl font-bold leading-normal tracking-wider text-gray-400"
      onMouseMove={handleMouseMove}
    >
      {/* Thumbnails Overlay - Increased z-index to be on top */}
      {hoveredClient && hoveredClient.thumbnails && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {/* Motion div that follows the cursor */}
          <motion.div
            style={{ x: springX, y: springY }}
            className="fixed top-0 left-0"
          >
            {hoveredClient.thumbnails.map((src, index) => {
              // Get viewport width
              const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
              // Check if cursor is on the right side of the screen
              const isRightSide = mouseX.get() > viewportWidth / 2;

              // Position relative to the cursor (0,0 point of the motion.div)
              // Responsive offset: 30px on small screens (mobile), 60px on larger screens
              const offset = typeof window !== 'undefined' && window.innerWidth < 768 ? 30 : 60; 
              const overlap = 120; // Reduced overlap for tighter stacking on mobile
              
              // If cursor is on the right, show images to the left (negative offset)
              // If on the left, show images to the right (positive offset)
              const direction = isRightSide ? -1 : 1;
              
              // Calculate left position:
              // Right side: -60 - 0*180, -60 - 1*180... (stacked to left)
              // Left side: 60 + 0*180, 60 + 1*180... (stacked to right)
              // We also need to account for image width (200px) when going left
              const imageWidth = 200; // This is the max width, but we are clamping. 
              // Using a fixed offset calculation might result in gaps if width is smaller. 
              // However, 'overlap' (180) handles the spacing.
              // For correct alignment on right side with variable width, we might need dynamic width.
              // But let's stick to the simpler logic for now as clamp is CSS-side.
              
              let left;
              if (isRightSide) {
                 // To prevent overlap with cursor, we shift left by (offset + width)
                 // The 'width' here is the CSS width. 
                 // Since we use clamp(150px, 20vw, 200px), the max width is 200px.
                 // However, to match the "right side distance", we don't need to push it *so* far left.
                 // The 'offset' alone (30px/60px) is the gap we want.
                 // But because 'left' position of an element is its *left edge*,
                 // if we want the *right edge* of the image to be at (cursorX - offset),
                 // we must subtract width.
                 // So left = -offset - width.
                 // If the apparent gap is larger, it might be due to the width assumption (200px) 
                 // being larger than the actual rendered width (e.g. 150px on mobile).
                 // If we assume max width 200px but it renders at 150px, the gap increases by 50px.
                 // To fix this, we should use the smaller width estimate for calculation on mobile?
                 // Or better, let's use a conservative width estimate or rely on the same clamp logic?
                 // We can approximate width:
                 const estimatedWidth = typeof window !== 'undefined' && window.innerWidth < 768 ? 150 : 200;
                 
                 left = -offset - estimatedWidth - (index * overlap);
              } else {
                 left = offset + (index * overlap);
              }

              const verticalOffset = verticalOffsets[index] || 0;
              const top = verticalOffset;

              return (
                <div
                  key={index}
                  className="absolute transition-all duration-300 ease-out"
                  style={{
                    left: left,
                    top: top,
                    transform: 'translate(0, -50%)', // Center vertically relative to cursor Y + offset
                    width: 'clamp(150px, 20vw, 200px)', // Responsive width: min 150px, max 200px
                    height: 'clamp(187px, 25vw, 250px)', // Maintain approx 4:5 aspect ratio
                    zIndex: isRightSide ? 10 - index : index, // Reverse z-index stacking when on right side
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
      )}

      {/* List Items */}
      {clients.map((client) => (
        <div
          key={client.id}
          className="flex items-center relative z-20 h-[1.5em]" // Added fixed height to container
          onMouseEnter={() => setHoveredClientId(client.id)}
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
