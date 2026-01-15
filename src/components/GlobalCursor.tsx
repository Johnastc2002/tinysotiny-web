'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCursor } from '@/context/CursorContext';
import { InteractionCursor } from './BubbleActions';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function GlobalCursor() {
  const { cursorState } = useCursor();
  const cursorRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false); // Track if mouse moved
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isVisible) setIsVisible(true);
      if (cursorRef.current) {
        // Use translate3d for performance
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isVisible, isMobile]);

  if (!mounted || isMobile) return null;

  return (
    <div
      ref={cursorRef}
      className={`fixed top-0 left-0 pointer-events-none z-[99999] ${
        cursorState.type === 'default'
          ? 'mix-blend-difference'
          : 'mix-blend-normal'
      }`}
      style={{
        opacity: isVisible && cursorState.type !== 'hidden' ? 1 : 0,
        transition: 'opacity 0.2s ease-out',
        // Initialize off-screen
        transform: 'translate3d(-100px, -100px, 0)',
      }}
    >
      <AnimatePresence mode="wait">
        {cursorState.type === 'default' && (
          <motion.div
            key="default"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-3 h-3 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"
          />
        )}

        {cursorState.type === 'label' && (
          <motion.div
            key="label"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative -top-[14px] -left-[14px]"
            // Offset logic to keep icon centered: -14px is half of 28px icon size
          >
            <InteractionCursor
              text={cursorState.text}
              className="mix-blend-normal"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
