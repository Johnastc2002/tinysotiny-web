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
      className="relative flex flex-wrap justify-center items-center text-3xl md:text-4xl lg:text-5xl font-bold leading-normal tracking-wider text-gray-400"
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
              // Position relative to the cursor (0,0 point of the motion.div)
              const startOffset = 60; // Initial gap from cursor
              const visibleWidth = 180; // Overlap width

              const left = startOffset + index * visibleWidth;
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
                    width: '200px',
                    height: '250px',
                    zIndex: index,
                  }}
                >
                  <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl bg-gray-100">
                    <Image
                      src={src}
                      alt={`${hoveredClient.clientName} thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="200px"
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
              className={`absolute inset-0 flex items-center justify-center transition-transform duration-200 cursor-default whitespace-nowrap px-1 ${
                hoveredClientId === client.id
                  ? 'font-serif italic scale-105'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {client.clientName}
            </div>
          </div>
          <div className="mx-1 md:mx-2 text-gray-400 font-bold">.</div>
        </div>
      ))}
      <div className="flex items-center z-20">
        <div>ETC...</div>
      </div>
    </div>
  );
}
