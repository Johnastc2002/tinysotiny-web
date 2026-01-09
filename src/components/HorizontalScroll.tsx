'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { DailyData } from '@/types/daily';
import Link from 'next/link';
import SmartMedia from '@/components/SmartMedia';

interface HorizontalScrollProps {
  daily: DailyData;
}

export default function HorizontalScroll({ daily }: HorizontalScrollProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
  });

  const [scrollRange, setScrollRange] = React.useState(0);
  const [viewportWidth, setViewportWidth] = React.useState(0); // Initialize with 0 to prevent hydration mismatch

  // Measure content width dynamically
  React.useEffect(() => {
    // Set initial viewport width
    setViewportWidth(window.innerHeight); // Using innerHeight as placeholder until ref updates

    if (containerRef.current) {
      const updateScrollRange = () => {
        if (containerRef.current) {
          const scrollWidth = containerRef.current.scrollWidth;
          const vw = window.innerWidth;
          // Scroll distance = Content Width - Viewport Width
          // We add a small buffer to ensure end is reached comfortably
          setScrollRange(-(scrollWidth - vw));
          setViewportWidth(window.innerHeight); // Update height for vertical container
        }
      };

      // Initial update
      updateScrollRange();
      // Retry after a short delay to allow images to load layout
      setTimeout(updateScrollRange, 100);
      setTimeout(updateScrollRange, 500);

      window.addEventListener('resize', updateScrollRange);
      return () => window.removeEventListener('resize', updateScrollRange);
    }
  }, [daily]); // Recalculate if daily data changes

  // Use dynamic scroll range instead of hardcoded value
  const x = useTransform(scrollYProgress, [0, 1], ['0px', `${scrollRange}px`]);

  return (
    <>
      {/* Fixed Logo */}
      <div className="fixed top-8 left-8 md:top-12 md:left-16 z-50 mix-blend-difference">
        <Link
          href="/daily"
          className="text-4xl font-bold tracking-tighter text-[#0F2341] hover:text-gray-400 transition-colors"
        >
          t.
        </Link>
      </div>

      {/* Scroll Container - Height determines scroll length */}
      {/* Dynamic height based on content width to ensure enough scroll track */}
      {/* 1px horizontal scroll = 1px vertical scroll approximately */}
      {/* Fallback height of 500vh until calculation completes to allow initial scroll */}
      <div
        ref={targetRef}
        style={{
          height:
            scrollRange !== 0 ? Math.abs(scrollRange) + viewportWidth : '500vh',
        }}
        className="relative"
      >
        {/* Sticky Container - Stays fixed while parent scrolls */}
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <motion.div ref={containerRef} style={{ x }} className="flex h-full">
            {/* Section 1: Hero (Navy) */}
            <section className="relative flex h-screen w-auto shrink-0 items-center bg-[#0F2341] text-white overflow-hidden z-10">
              <div className="flex items-stretch h-full relative z-10 gap-1 md:gap-2">
                {/* Text Container */}
                <div className="flex flex-col justify-center space-y-6 w-[40vw] min-w-[300px] pl-8 md:pl-16 shrink-0 z-20">
                  <h1 className="text-5xl md:text-7xl font-serif font-bold leading-tight">
                    {daily.title}
                  </h1>
                  <p className="text-lg text-gray-300 max-w-md font-light leading-relaxed">
                    {daily.description}
                  </p>
                </div>

                {/* Decorative / Main Image */}
                <div className="relative h-full shrink-0 z-10">
                  {daily.thumbnail && daily.thumbnail.url && (
                    <div
                      className="relative h-full overflow-hidden"
                      style={{
                        aspectRatio:
                          daily.thumbnail.width && daily.thumbnail.height
                            ? `${daily.thumbnail.width}/${daily.thumbnail.height}`
                            : 'auto',
                        minWidth: '50vw', // Fallback minimum width
                      }}
                    >
                      <SmartMedia
                        url={daily.thumbnail.url}
                        type={daily.thumbnail.type}
                        alt={daily.title}
                        fill
                        className="object-cover"
                        sizes="100vh"
                        priority
                      />
                    </div>
                  )}
                </div>

                {/* Padding for overlap transition */}
                <div className="w-32 md:w-64 bg-[#0F2341] shrink-0" />
              </div>

              {/* Background Media/Effect if any */}
              {/* Moved bgMedia to its own section, removed from Hero background */}
            </section>

            {/* Section 2: Image Grid (White) */}
            {/* Removed overflow-hidden to allow image to overlap previous section */}
            {/* Added z-20 to ensure it (and its negative margin image) sits on top of Section 1 */}
            <section className="relative flex h-screen w-auto shrink-0 items-center justify-center bg-white z-20">
              <div className="flex gap-8 md:gap-16 items-center px-8 md:px-16 h-full bg-white">
                {/* Map through first few medias or placeholders */}
                {daily.medias &&
                  daily.medias.slice(0, 3).map((media, idx) => (
                    <div
                      key={idx}
                      className={`relative h-[50vh] md:h-[70vh] rounded-4xl overflow-hidden shadow-lg shrink-0 ${
                        idx === 0 ? '-ml-20 md:-ml-32' : ''
                      }`}
                      style={{
                        aspectRatio:
                          media.width && media.height
                            ? `${media.width}/${media.height}`
                            : 'auto',
                      }}
                    >
                      <SmartMedia
                        url={media.url}
                        type={media.type}
                        alt={`Gallery ${idx}`}
                        fill
                        className="object-cover"
                        sizes="(max-height: 70vh) auto, 33vw"
                      />
                    </div>
                  ))}
                {(!daily.medias || daily.medias.length === 0) && (
                  <div className="text-gray-400 italic">
                    No gallery images available
                  </div>
                )}
              </div>
            </section>

            {/* Section 3: Text & Elements (Light Grey) */}
            {/* Reduced width to 60vw to bring next section closer */}
            {/* Added z-10 to allow Section 4 to overlap it if needed */}
            <section className="relative flex h-screen w-[60vw] shrink-0 items-center justify-center bg-[#F0F2F5] z-10">
              <div className="flex flex-col md:flex-row items-center gap-20 px-8">
                <div className="flex flex-col space-y-6 max-w-xl">
                  <h2 className="text-3xl md:text-5xl font-serif text-[#0F2341]">
                    Details & Concept
                  </h2>
                  <p className="text-gray-600 leading-loose">
                    {daily.description2 ||
                      daily.description ||
                      'More details coming soon...'}
                  </p>
                </div>
              </div>
            </section>

            {/* Optional Section: Fullscreen Background Media */}
            {daily.bgMedia && (
              <section className="relative flex h-screen aspect-9/16 shrink-0 items-center justify-center bg-[#F0F2F5] overflow-hidden z-10">
                <div className="relative w-full h-full">
                  <SmartMedia
                    url={daily.bgMedia.url}
                    type={daily.bgMedia.type}
                    alt="Background Media"
                    fill
                    className="object-cover"
                    sizes="(max-height: 100vh) auto"
                  />
                </div>
              </section>
            )}

            {/* Section 4: Secondary Gallery (White Background) */}
            {/* Changed min-w-screen to w-auto to allow Section 5 to come closer */}
            {/* Added z-20 to stack on top of Section 5 */}
            <section className="relative flex h-screen w-auto shrink-0 items-center bg-white text-[#0F2341] z-20">
              <div className="w-full h-full flex items-center px-16 gap-8 overflow-visible">
                {/* Remaining medias */}
                {daily.medias &&
                  daily.medias.slice(3).map((media, idx, arr) => (
                    <div
                      key={idx}
                      className={`relative h-[50vh] md:h-[70vh] rounded-4xl overflow-hidden shadow-2xl shrink-0 ${
                        idx === 0 ? '-ml-20 md:-ml-32' : ''
                      } ${idx === arr.length - 1 ? '-mr-32 md:-mr-64' : ''}`}
                      style={{
                        aspectRatio:
                          media.width && media.height
                            ? `${media.width}/${media.height}`
                            : 'auto',
                      }}
                    >
                      <SmartMedia
                        url={media.url}
                        type={media.type}
                        alt={`Gallery ${idx + 3}`}
                        fill
                        className="object-cover"
                        sizes="(max-height: 70vh) auto, 50vw"
                      />
                    </div>
                  ))}
              </div>
            </section>

            {/* Section 5: Fin (Navy) */}
            {/* Added z-10 to stay under Section 4's last image */}
            <section className="relative flex h-screen w-[30vw] shrink-0 items-center justify-center bg-[#0F2341] text-white z-10" />
          </motion.div>
        </div>
      </div>

      {/* Scroll Progress Indicator (Optional) */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 h-2 bg-[#0F2341] origin-left z-50"
        style={{ scaleX: scrollYProgress }}
      />
    </>
  );
}
