'use client';

import React, { useState, useRef } from 'react';
import { ClientData } from '@/types/client';
import { useMotionValue } from 'framer-motion';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ImageTrailOverlay } from './ui/ImageTrailOverlay';

interface ClientListProps {
  clients: ClientData[];
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const BUFFER = 100;

export default function ClientList({ clients }: ClientListProps) {
  const [hoveredClientId, setHoveredClientId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

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
    if (isMobile) return;
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

  const handleClientClick = (e: React.MouseEvent, clientId: string) => {
    if (!isMobile) return;
    
    // If clicking the already selected client, toggle off
    if (hoveredClientId === clientId) {
      setHoveredClientId(null);
      return;
    }

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
      className="relative flex flex-wrap justify-start items-baseline text-xl md:text-2xl lg:text-3xl font-bold leading-normal tracking-wider text-gray-400"
      onMouseMove={handleMouseMove}
    >
      {/* Overlay Component */}
      {hoveredClient && interactionState && hoveredClient.thumbnails && (
        <ImageTrailOverlay
          key={hoveredClient.id} // Re-mount on client change to reset springs
          images={hoveredClient.thumbnails}
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
          className="flex items-baseline relative z-20"
          onMouseEnter={(e) => handleMouseEnterClient(e, client.id)}
          onMouseLeave={() => !isMobile && setHoveredClientId(null)}
          onClick={(e) => handleClientClick(e, client.id)}
        >
          {/* Container to prevent layout shift */}
          <div className="relative grid grid-cols-1 grid-rows-1 items-baseline">
            {/* Invisible placeholder to reserve space for the bold/italic text */}
            <div
              className="col-start-1 row-start-1 font-['Value_Serif'] font-medium invisible opacity-0 px-1"
              aria-hidden="true"
            >
              {client.clientName}
            </div>
            <div
              className="col-start-1 row-start-1 font-['Value_Sans'] font-medium invisible opacity-0 px-1"
              aria-hidden="true"
            >
              {client.clientName}
            </div>

            {/* Visible text */}
            <div
              className={`col-start-1 row-start-1 flex items-baseline justify-center transition-transform duration-200 whitespace-nowrap text-[#B6B6B6] hover:text-[#B6B6B6] ${
                hoveredClientId === client.id
                  ? "font-['Value_Serif'] font-medium"
                  : "font-['Value_Sans'] font-medium"
              }`}
            >
              {client.clientName}
            </div>
          </div>
          <div className="mx-1 md:mx-2 text-[#B6B6B6] font-bold">.</div>
        </div>
      ))}
      <div className="flex items-baseline z-20 mx-1 md:mx-2">
        <div className="text-[#B6B6B6] font-['Value_Sans'] font-medium">
          ETC...
        </div>
      </div>
    </div>
  );
}
