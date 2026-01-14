'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { InteractionCursor } from './BubbleActions';

interface CursorPortalProps {
  visible: boolean;
  text?: string | null;
  className?: string;
  zIndex?: number;
}

export const CursorPortal = ({
  visible,
  text,
  className,
  zIndex = 9999,
}: CursorPortalProps) => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Small delay to ensure body is ready
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX + 20}px, ${
          e.clientY + 20
        }px, 0)`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={cursorRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: zIndex,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease-out',
        willChange: 'transform, opacity',
        // Initialize off-screen to prevent flash
        transform: 'translate3d(-100px, -100px, 0)',
      }}
      aria-hidden="true"
      className={className}
    >
      <InteractionCursor text={text} />
    </div>,
    document.body
  );
};

