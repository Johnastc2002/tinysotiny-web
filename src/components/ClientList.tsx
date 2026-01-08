'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ClientData } from '@/types/client';
import Image from 'next/image';

interface ClientListProps {
  clients: ClientData[];
}

export default function ClientList({ clients }: ClientListProps) {
  const [hoveredClientId, setHoveredClientId] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  // Store random offsets for the currently hovered client's images
  const [verticalOffsets, setVerticalOffsets] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    // We'll track mouse position relative to the viewport to position fixed images
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const hoveredClient = clients.find((c) => c.id === hoveredClientId);
  
  // Generate new random offsets whenever a new client is hovered
  useEffect(() => {
    if (hoveredClient && hoveredClient.thumbnails) {
      // Generate an array of random offsets between -50 and 50
      const newOffsets = hoveredClient.thumbnails.map(() => (Math.random() * 100) - 50);
      setVerticalOffsets(newOffsets);
    } else {
      setVerticalOffsets([]);
    }
  }, [hoveredClientId, hoveredClient]);

  const getThumbnailStyle = (index: number) => {
    // Position images starting from the right of the cursor
    const startOffset = 60; // Initial gap from cursor
    const visibleWidth = 180; // Increased to 180 (images are 200px wide), so 20px overlap
    
    // Horizontal position
    const left = mousePosition.x + startOffset + (index * visibleWidth);
    
    // Vertical position using the generated random offset
    // Fallback to 0 if not ready (though effect should run fast enough)
    const verticalOffset = verticalOffsets[index] || 0;
    
    const top = mousePosition.y + verticalOffset;

    return {
      left,
      top,
    };
  };

  return (
    <div 
      ref={containerRef}
      className="relative flex flex-wrap justify-center items-center text-3xl md:text-4xl lg:text-5xl font-bold leading-normal tracking-wider text-gray-400"
      onMouseMove={handleMouseMove}
    >
      {/* Thumbnails Overlay - Increased z-index to be on top */}
      {hoveredClient && hoveredClient.thumbnails && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {hoveredClient.thumbnails.map((src, index) => {
            const style = getThumbnailStyle(index);
            
            return (
              <div
                key={index}
                className="absolute transition-all duration-300 ease-out"
                style={{
                  left: style.left,
                  top: style.top,
                  transform: 'translate(0, -50%)', // Center vertically relative to calculated top
                  width: '200px',
                  height: '250px',
                  zIndex: index, // Stack them in order
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
        </div>
      )}

      {/* List Items */}
      {clients.map((client) => (
        <div 
          key={client.id} 
          className="flex items-center relative z-20"
          onMouseEnter={() => setHoveredClientId(client.id)}
          onMouseLeave={() => setHoveredClientId(null)}
        >
          <div 
            className={`transition-all duration-200 cursor-default ${
              hoveredClientId === client.id 
                ? 'font-serif italic' 
                : 'hover:text-gray-300'
            }`}
          >
            {client.clientName}
          </div>
          <div className="mx-2 md:mx-4">.</div>
        </div>
      ))}
      <div className="flex items-center z-20">
        <div>ETC...</div>
      </div>
    </div>
  );
}
