'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { DailyData } from '@/types/daily';
import SmartMedia from '@/components/SmartMedia';

interface HorizontalScrollProps {
  daily: DailyData;
  scrollContainerRef?: React.RefObject<HTMLElement>;
}

export default function HorizontalScroll({
  daily,
  scrollContainerRef,
}: HorizontalScrollProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    container: scrollContainerRef,
    offset: ['start start', 'end end'],
  });

  const [scrollRange, setScrollRange] = React.useState(0);
  const [viewportWidth, setViewportWidth] = React.useState(0); // Initialize with 0 to prevent hydration mismatch

  // Measure content width dynamically
  React.useEffect(() => {
    if (!containerRef.current) return;

    const updateScrollRange = () => {
      if (containerRef.current) {
        // Use getBoundingClientRect for more accurate sub-pixel width
        // and to respect transforms/max-content
        const scrollWidth = containerRef.current.getBoundingClientRect().width;
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;

        // Calculate total scrollable distance (negative value)
        // Ensure we actually have scrollable content
        const range = -(scrollWidth - viewportW);

        // Only update if dimensions effectively changed or initialized
        setScrollRange(range > 0 ? 0 : range);
        setViewportWidth(viewportH);
      }
    };

    // Initial measure with a slight delay to ensure layout is stable
    // and resources (fonts/images) have initiated layout
    const timeoutId = setTimeout(updateScrollRange, 100);

    // Use ResizeObserver to detect size changes of the content
    const observer = new ResizeObserver(() => {
      // Small delay to allow layout to settle
      requestAnimationFrame(() => updateScrollRange());
    });

    observer.observe(containerRef.current);
    window.addEventListener('resize', updateScrollRange);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      window.removeEventListener('resize', updateScrollRange);
    };
  }, [daily]);

  // Use dynamic scroll range
  const x = useTransform(scrollYProgress, [0, 1], ['0px', `${scrollRange}px`]);

  // Helper to ensure color has # if it's a hex code
  const formatColor = (c?: string) => {
    if (!c) return undefined;
    const clean = c.trim();
    if (/^[0-9A-Fa-f]{6}$/.test(clean)) return `#${clean}`;
    return clean;
  };

  const cardBgColor = formatColor(daily.card_bg_color);
  const cardFontColor = formatColor(daily.card_font_color);

  return (
    <>
      {/* Scroll Container - Height determines scroll length */}
      {/* Dynamic height based on content width to ensure enough scroll track */}
      {/* 1px horizontal scroll = 1px vertical scroll approximately */}
      {/* Fallback height of 500vh until calculation completes to allow initial scroll */}
      <div className="flex flex-col w-full bg-[#fcfcfc] md:hidden pb-0">
        {/* Mobile Layout Components */}
        {/* Thumbnail */}
        <div className="relative w-full">
          {daily.thumbnail?.url && (
            <div
              className="relative w-full"
              style={{
                aspectRatio:
                  daily.thumbnail.width && daily.thumbnail.height
                    ? `${daily.thumbnail.width}/${daily.thumbnail.height}`
                    : 'auto',
              }}
            >
              <SmartMedia
                url={daily.thumbnail.url}
                type={daily.thumbnail.type}
                alt={daily.title}
                fill
                className="object-cover"
              />
            </div>
          )}
        </div>

        {/* Title Card */}
        <div
          className="relative z-20 mx-0 -mt-20 bg-[#0F2341] p-8 shadow-2xl rounded-tr-3xl rounded-br-3xl mr-8"
          style={{ backgroundColor: cardBgColor || '#0F2341' }}
        >
          <h1
            className="text-4xl font-['Value_Serif'] font-medium leading-tight mb-4 text-white"
            style={{ color: cardFontColor }}
          >
            {daily.title}
          </h1>
          <p
            className="text-base text-gray-300 font-['Value_Sans'] font-normal leading-relaxed"
            style={{ color: cardFontColor }}
          >
            {daily.description}
          </p>
        </div>

        {/* First 3 Images */}
        <div className="flex flex-col gap-4 px-8 pt-8 bg-white pb-0">
          {daily.medias?.slice(0, 3).map((media, idx) => (
            <div
              key={`m-media-1-${idx}`}
              className="relative w-full aspect-4/5 rounded-2xl overflow-hidden shadow-lg"
            >
              <SmartMedia
                url={media.url}
                type={media.type}
                alt={`Gallery image ${idx + 1}`}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {/* Description 2 */}
        <div className="px-8 py-8 bg-white wrap-break-word pb-32">
          <p className="text-gray-600 leading-loose wrap-break-word whitespace-pre-wrap font-['Value_Sans'] font-medium">
            {daily.description2 ||
              daily.description ||
              'More details coming soon...'}
          </p>
        </div>

        {/* Spacer or BgMedia */}
        {daily.bgMedia ? (
          <div className="relative w-full h-[80vh] z-0">
            <SmartMedia
              url={daily.bgMedia.url}
              type={daily.bgMedia.type}
              alt="Background media"
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-32 bg-[#F0F2F5]" />
        )}

        {/* Rest of Medias */}
        <div className="flex flex-col gap-4 px-8 relative z-20 -mt-24 pointer-events-none">
          <div className="pointer-events-auto flex flex-col gap-4">
            {daily.medias?.slice(3).map((media, idx) => (
              <div
                key={`m-media-2-${idx}`}
                className="relative w-full aspect-4/5 rounded-2xl overflow-hidden shadow-xl bg-white"
              >
                <SmartMedia
                  url={media.url}
                  type={media.type}
                  alt={`Gallery image ${idx + 4}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Last Section */}
        <div
          className="relative w-full h-[20vh] bg-[#0F2341] z-0 -mt-24"
          style={{ backgroundColor: cardBgColor || '#0F2341' }}
        />
      </div>

      <div
        ref={targetRef}
        style={{
          height:
            scrollRange !== 0
              ? `${Math.abs(scrollRange) + viewportWidth}px`
              : '500vh',
        }}
        className="relative hidden md:block"
      >
        {/* Fixed Container - Matches ProjectPageClient behavior */}
        <div className="sticky top-0 left-0 w-full h-screen overflow-hidden bg-[#fcfcfc] z-0">
          <motion.div
            ref={containerRef}
            style={{ x, willChange: 'transform' }}
            className="flex h-full w-max"
          >
            {/* Section 1: Hero (Navy) */}
            <section
              className="relative flex h-screen w-auto shrink-0 items-center bg-[#0F2341] text-white overflow-hidden z-10"
              style={{ backgroundColor: cardBgColor || '#0F2341' }}
            >
              <div className="flex items-stretch h-full relative z-10 gap-1 md:gap-2">
                {/* Text Container */}
                <div className="flex flex-col justify-center space-y-6 w-[40vw] min-w-[300px] pl-8 md:pl-16 shrink-0 z-20">
                  <h1
                    className="text-5xl md:text-7xl font-['Value_Serif'] font-medium leading-tight"
                    style={{ color: cardFontColor }}
                  >
                    {daily.title}
                  </h1>
                  <p
                    className="text-lg text-gray-300 max-w-md font-['Value_Sans'] font-normal leading-relaxed"
                    style={{ color: cardFontColor }}
                  >
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
                <div
                  className="w-32 md:w-64 bg-[#0F2341] shrink-0"
                  style={{ backgroundColor: cardBgColor || '#0F2341' }}
                />
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
            <section className="relative flex h-screen w-[60vw] shrink-0 items-center justify-center bg-white z-10">
              <div className="flex flex-col md:flex-row items-center gap-20 px-12 wrap-break-word">
                <div className="flex flex-col space-y-6 max-w-xl">
                  <p className="text-gray-600 leading-loose wrap-break-word whitespace-pre-wrap font-['Value_Sans'] font-medium">
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
            <section
              className="relative flex h-screen w-[30vw] shrink-0 items-center justify-center bg-[#0F2341] text-white z-10"
              style={{ backgroundColor: cardBgColor || '#0F2341' }}
            />
          </motion.div>
        </div>
      </div>

      {/* Scroll Progress Indicator (Optional) */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 h-2 bg-[#0F2341] origin-left z-50 hidden md:block"
        style={{
          scaleX: scrollYProgress,
          backgroundColor: cardBgColor || '#0F2341',
        }}
      />
    </>
  );
}
