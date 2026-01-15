'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { Project } from '@/types/project';
import { useCursor } from '@/context/CursorContext';

import SmartMedia from '@/components/SmartMedia';

interface ProjectPageClientProps {
  project: Project;
  recommendedProject: Project | null;
  scrollContainerRef?: React.RefObject<HTMLElement>;
}

// Removed local FadeInImage as it is superseded by SmartMedia

export default function ProjectPageClient({
  project,
  recommendedProject,
  scrollContainerRef,
}: ProjectPageClientProps) {
  // Ref for the container that holds the horizontal scroll section
  const containerRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const { setCursor } = useCursor();

  const getRecommendedHref = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('project', id);
    return `?${params.toString()}`;
  };

  const handleNextProject = () => {
    // Logic handled by Link, but we might want to scroll to top first
    // Actually, since we use key={project.id} in parent, the component remounts
    // and scroll state of the container (overlay) is reset?
    // No, the container is in parent (overlayContainer).
    if (scrollContainerRef && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo(0, 0);
    }
  };

  // Track scroll progress of the container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    container: scrollContainerRef,
    offset: ['start start', 'end end'],
  });

  // Create slides array: Info Slide (replaces Banner 0) -> Remaining Banners
  const slides = [
    { type: 'info', content: project, id: 'info-slide' },
    ...project.banners.slice(1).map((b, i) => ({
      type: 'banner',
      content: b,
      id: `banner-${i + 1}`,
    })),
  ];

  const numSlides = slides.length;
  // Assign 100vh per slide for scrolling "time"
  const scrollHeight = `${numSlides * 100}vh`;

  // Map vertical scroll (0 to 1) to horizontal translation (0 to -(totalWidth - viewportWidth))
  // Total width = numSlides * 100vw
  // We want to move from 0 to -((numSlides - 1) * 100)vw
  const x = useTransform(
    scrollYProgress,
    [0, 1],
    ['0%', `-${(numSlides - 1) * 100}%`]
  );

  // Helper to ensure color has # if it's a hex code
  const formatColor = (c?: string) => {
    if (!c) return undefined;
    const clean = c.trim();
    if (/^[0-9A-Fa-f]{6}$/.test(clean)) return `#${clean}`;
    return clean;
  };

  const cardBgColor = formatColor(project.card_bg_color);
  const cardFontColor = formatColor(project.card_font_color);
  const cardTagColor = formatColor(project.card_tag_color);

  // Check if we should show the split layout (2nd thumbnail instead of tags at bottom)
  const showSecondThumbnail =
    project.thumbnails && project.thumbnails.length > 1;

  return (
    <div className="">
      {/* Mobile Fixed Banner 1 */}
      <div className="sticky top-0 left-0 w-full h-screen z-0 md:hidden -mb-[100vh]">
        {project.banners.length > 0 && (
          <SmartMedia
            url={project.banners[0]}
            type="image"
            alt={`${project.title} Banner`}
            fill
            className="object-cover"
            priority
          />
        )}
      </div>

      {/* Horizontal Scroll Section - Fixed Banner (Desktop Only) */}
      <div
        ref={containerRef}
        style={{ height: scrollHeight }}
        className="relative z-0 hidden md:block"
      >
        <div className="sticky top-0 left-0 w-full h-screen overflow-hidden bg-black z-0">
          <motion.div
            style={{ x, willChange: 'transform' }}
            className="flex h-full"
          >
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className="relative h-full min-w-full w-screen shrink-0"
              >
                {slide.type === 'banner' ? (
                  <SmartMedia
                    url={slide.content as string}
                    type="image"
                    alt={`${project.title} Banner`}
                    fill
                    className="object-cover"
                    priority={index === 0}
                  />
                ) : (
                  // Info Slide - Similar to ProjectCard
                  <div className="flex h-full w-full">
                    {/* Left Side - First Banner Image */}
                    <div className="relative w-3/5 h-full bg-[#b6b6b6]">
                      {project.banners.length > 0 && (
                        <SmartMedia
                          url={project.banners[0]}
                          type="image"
                          alt={project.title}
                          fill
                          className="object-cover"
                          priority
                        />
                      )}
                    </div>

                    {/* Right Side - Content */}
                    <div className="flex w-2/5 flex-col bg-white">
                      {/* Top Section - Description */}
                      <div
                        className="flex-1 p-10 flex flex-col transition-colors duration-300 relative"
                        style={{
                          backgroundColor: cardBgColor || '#E5E5E5',
                        }}
                      >
                        <div className="flex-1 flex flex-col justify-center">
                          {project.clientName && (
                            <div className="mb-4">
                              <span
                                className={`text-sm font-semibold uppercase tracking-wider ${
                                  !cardFontColor ? 'text-gray-500' : ''
                                }`}
                                style={
                                  cardFontColor
                                    ? {
                                        color: cardFontColor,
                                        opacity: 0.7,
                                      }
                                    : {}
                                }
                              >
                                <span className="font-['Value_Sans'] font-normal">
                                  CLIENT /{' '}
                                </span>
                                <span className="font-['Value_Serif'] font-medium">
                                  {project.clientName}
                                </span>
                              </span>
                            </div>
                          )}
                          <h2
                            className={`mb-4 text-4xl font-['Value_Serif'] font-medium leading-tight ${
                              !cardFontColor ? 'text-[#0F2341]' : ''
                            }`}
                            style={
                              cardFontColor ? { color: cardFontColor } : {}
                            }
                          >
                            {project.title}
                          </h2>
                          <p
                            className={`text-sm leading-relaxed max-w-md font-['Value_Sans'] font-normal ${
                              !cardFontColor ? 'text-[#0F2341]' : ''
                            }`}
                            style={
                              cardFontColor
                                ? {
                                    color: cardFontColor,
                                    opacity: 0.9,
                                  }
                                : {}
                            }
                          >
                            {project.description}
                          </p>
                        </div>

                        {/* Desktop: Tags moved here if showing second thumbnail */}
                        {showSecondThumbnail && (
                          <ul className="flex flex-wrap gap-x-4 gap-y-2 mt-8 pt-4 p-0 list-none shrink-0">
                            {project.tags.map((tag, index) => (
                              <li
                                key={index}
                                className={`flex items-center leading-none text-xs font-['Value_Sans'] font-normal uppercase tracking-wide transition-colors ${
                                  !cardTagColor && !cardFontColor
                                    ? 'text-[#B6B6B6]'
                                    : ''
                                }`}
                                style={
                                  cardTagColor
                                    ? { color: cardTagColor }
                                    : cardFontColor
                                    ? { color: cardFontColor }
                                    : {}
                                }
                              >
                                <div className="w-2 h-2 rounded-full bg-current mr-2 shrink-0 mb-0.5" />
                                {tag}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Bottom Section - Tags/Points or Second Thumbnail */}
                      <div
                        className={`bg-white ${
                          showSecondThumbnail
                            ? 'relative p-0'
                            : 'p-10 flex flex-col justify-center'
                        } min-h-[30%] overflow-hidden shrink-0`}
                      >
                        {showSecondThumbnail ? (
                          <div className="relative w-full h-full">
                            <Image
                              src={project.thumbnails[1]}
                              alt={`${project.title} Thumbnail 2`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 40vw"
                              priority
                              unoptimized={true}
                            />
                          </div>
                        ) : (
                          <ul className="space-y-3">
                            {project.tags.map((tag, tagIndex) => (
                              <li
                                key={tagIndex}
                                className={`flex items-center leading-none text-xs font-['Value_Sans'] font-normal uppercase tracking-wide ${
                                  !cardTagColor ? 'text-[#B6B6B6]' : ''
                                }`}
                                style={
                                  cardTagColor ? { color: cardTagColor } : {}
                                }
                              >
                                <div className="w-2 h-2 rounded-full bg-current mr-2 shrink-0 mb-0.5" />{' '}
                                {tag}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Content Section - Scrolls OVER the fixed banner */}
      <div className="relative z-10 bg-transparent">
        {/* Background Layer for the lower part */}
        <div className="hidden md:block absolute top-[10vh] left-0 w-full bottom-0 bg-[#f8f8f8] -z-10" />

        {/* Mobile Layout */}
        <div className="md:hidden w-full pt-[70vh]">
          <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] overflow-hidden">
            {/* 1. Info Block (Title, Description) */}
            <div
              className="px-8 pt-10 pb-8 transition-colors duration-300"
              style={{
                backgroundColor: cardBgColor || '#E5E5E5',
              }}
            >
              {project.clientName ? (
                <div className="mb-4">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      !cardFontColor ? 'text-gray-500' : ''
                    }`}
                    style={
                      cardFontColor
                        ? { color: cardFontColor, opacity: 0.7 }
                        : {}
                    }
                  >
                    <span className="font-['Value_Sans'] font-normal">
                      CLIENT /{' '}
                    </span>
                    <span className="font-['Value_Serif'] font-medium">
                      {project.clientName}
                    </span>
                  </span>
                </div>
              ) : (
                /* No Client: Show Tags here */
                <div className="mb-6">
                  <ul className="flex flex-wrap gap-x-4 gap-y-2">
                    {project.tags.map((tag, tagIndex) => (
                      <li
                        key={tagIndex}
                        className={`flex items-center leading-none text-xs font-['Value_Sans'] font-normal uppercase tracking-wide ${
                          !cardTagColor ? 'text-[#B6B6B6]' : ''
                        }`}
                        style={cardTagColor ? { color: cardTagColor } : {}}
                      >
                        <div className="w-2 h-2 rounded-full bg-current mr-2 shrink-0 mb-0.5" />{' '}
                        {tag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <h1
                className={`text-4xl font-['Value_Serif'] font-medium leading-tight mb-6 ${
                  !cardFontColor ? 'text-[#0F2341]' : ''
                }`}
                style={cardFontColor ? { color: cardFontColor } : {}}
              >
                {project.title}
              </h1>
              <p
                className={`text-base leading-relaxed mb-0 font-['Value_Sans'] font-normal ${
                  !cardFontColor ? 'text-[#0F2341]' : ''
                }`}
                style={
                  cardFontColor ? { color: cardFontColor, opacity: 0.9 } : {}
                }
              >
                {project.description}
              </p>
            </div>

            {/* Tags (Only if Client Name exists, otherwise they are shown above) */}
            {project.clientName && (
              <div
                className="px-8 pt-4 pb-10 transition-colors duration-300"
                style={{
                  backgroundColor: cardBgColor || '#E5E5E5',
                }}
              >
                <ul className="flex flex-wrap gap-x-4 gap-y-2">
                  {project.tags.map((tag, tagIndex) => (
                    <li
                      key={tagIndex}
                      className={`flex items-center leading-none text-xs font-['Value_Sans'] font-normal uppercase tracking-wide ${
                        !cardTagColor ? 'text-[#B6B6B6]' : ''
                      }`}
                      style={cardTagColor ? { color: cardTagColor } : {}}
                    >
                      <div className="w-2 h-2 rounded-full bg-current mr-2 shrink-0 mb-0.5" />{' '}
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 2. Banner 2 (Full Width) */}
            {project.banners.length > 1 && (
              <div className="w-full relative bg-[#f8f8f8]">
                <SmartMedia
                  url={project.banners[1]}
                  type="image"
                  alt={`${project.title} banner 2`}
                  width={1200}
                  height={800}
                  className="w-full h-auto object-contain"
                />
              </div>
            )}

            {/* 3. Remaining Banners */}
            {project.banners.length > 2 && (
              <div className="flex flex-col">
                {project.banners.slice(2).map((banner, index) => (
                  <div key={index} className="w-full relative bg-[#f8f8f8]">
                    <SmartMedia
                      url={banner}
                      type="image"
                      alt={`${project.title} banner ${index + 3}`}
                      width={1200}
                      height={800}
                      className="w-full h-auto object-contain"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 4. Title Description Div (Cast & Extra Content) */}
            {/* The user requested "the title description div". 
                Since Description is already shown, we focus on Cast here, 
                reusing the style of the desktop vertical section. */}
            <div className="px-8 py-12 bg-white">
              {/* Optional: Repeat Title or just show Cast */}
              {project.cast && (
                <div
                  className="text-base text-[#0F2341] leading-relaxed whitespace-pre-line font-['Value_Sans'] font-normal"
                  dangerouslySetInnerHTML={{ __html: project.cast }}
                />
              )}
            </div>

            {/* Client & Services Section (Mobile) */}
            <div className="px-8 pt-12 bg-[#f8f8f8]">
              {/* Client Section */}
              {project.clientName && (
                <div>
                  <span className="text-sm font-semibold uppercase tracking-wider text-[#B6B6B6] block mb-1">
                    <span className="font-['Value_Sans'] font-normal">
                      CLIENT
                    </span>
                  </span>
                  <span className="text-xl font-['Value_Serif'] font-medium text-[#B6B6B6]">
                    {project.clientName}
                  </span>
                </div>
              )}

              {/* Services Section - Only for 'work' */}
              {project.projectType === 'work' &&
                project.services &&
                project.services.length > 0 && (
                  <div className="mt-12 flex flex-col items-end text-left">
                    <div className="text-left">
                      <h4 className="text-sm font-['Value_Sans'] font-normal text-[#B6B6B6] uppercase tracking-widest mb-2">
                        SERVICES
                      </h4>
                      <ul className="space-y-0.5">
                        {project.services.map((service, index) => (
                          <li
                            key={index}
                            className="text-lg text-[#B6B6B6] font-['Value_Sans'] font-normal leading-relaxed lowercase"
                          >
                            {service}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Title and Cast Section Container - Overlap the banner (Desktop Only) */}
        <div className="hidden md:block w-full relative -mt-32 z-20 pointer-events-none">
          <div className="flex flex-col md:flex-row gap-0">
            {/* Left Column: White Box for Title & Cast */}
            <div className="w-full md:w-[60%] bg-white pt-8 pb-8 pr-8 md:pt-16 md:pb-16 md:pr-16 pl-12 md:pl-24 shadow-lg pointer-events-auto rounded-r-3xl">
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                viewport={{ once: true }}
                className="flex-1 pr-12"
              >
                <h1 className="text-5xl md:text-7xl font-['Value_Serif'] font-medium text-[#0F2341] leading-tight mb-8">
                  {project.title}
                </h1>

                {/* Casts */}
                <div
                  className="text-lg text-[#0F2341] leading-relaxed whitespace-pre-line font-['Value_Sans'] font-normal [&>p:last-child]:mb-0 [&>p]:mb-4"
                  dangerouslySetInnerHTML={{ __html: project.cast }}
                />
              </motion.div>
            </div>

            {/* Right Column: Client & Services Section (Desktop) - Outside the white box */}
            <div className="w-full md:w-[40%] pt-16 pl-12 pb-0 pointer-events-auto flex flex-col justify-end">
              {/* Client Section */}
              {project.clientName && (
                <div className="mb-8">
                  <span className="text-sm font-semibold uppercase tracking-wider text-[#B6B6B6] block mb-1">
                    <span className="font-['Value_Sans'] font-normal">
                      CLIENT
                    </span>
                  </span>
                  <span className="text-xl md:text-2xl font-['Value_Serif'] font-medium text-[#B6B6B6]">
                    {project.clientName}
                  </span>
                </div>
              )}

              {/* Services Section - Only for 'work' */}
              {project.projectType === 'work' &&
                project.services &&
                project.services.length > 0 && (
                  <div>
                    <h4 className="text-sm font-['Value_Sans'] font-normal text-[#B6B6B6] uppercase tracking-widest mb-2">
                      SERVICES
                    </h4>
                    <ul className="space-y-0.5">
                      {project.services.map((service, index) => (
                        <li
                          key={index}
                          className="text-xl text-[#B6B6B6] font-['Value_Sans'] font-normal leading-relaxed lowercase"
                        >
                          {service}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Gray Background Section for Gallery */}
        {project.media_rows.length > 0 && (
          <div
            className={`w-full pt-12 px-8 md:pt-40 md:px-24 mt-0 md:-mt-24 z-10 relative bg-[#f8f8f8] md:bg-transparent ${
              project.media_rows.length <= 3 ? 'pb-0' : 'pb-12 md:pb-20'
            }`}
          >
            <div className="">
              {/* Image Gallery */}
              <div className="flex flex-col gap-8">
                {project.media_rows?.map((row, rowIndex) => {
                  const parts = row.row_layout.split('-');
                  const orientation = parts[0];
                  const count = parseInt(parts[1], 10) || 1;

                  // Aspect ratio: V = 2:3, H = 3:2
                  const aspectRatioClass =
                    orientation === 'V' ? 'aspect-[2/3]' : 'aspect-[3/2]';

                  // Grid columns class
                  const gridColsClass =
                    count === 1
                      ? 'grid-cols-1'
                      : count === 2
                      ? 'grid-cols-2'
                      : 'grid-cols-3';

                  const mediasToShow = row.medias.slice(0, count);
                  const placeHoldersCount = Math.max(
                    0,
                    count - mediasToShow.length
                  );

                  const isLastRow = rowIndex === project.media_rows.length - 1;
                  const showDescription2 =
                    (rowIndex === 2 && project.description_2) ||
                    (isLastRow &&
                      project.description_2 &&
                      project.media_rows.length < 3);

                  return (
                    <React.Fragment key={rowIndex}>
                      <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: rowIndex * 0.1 }}
                        viewport={{ once: true, margin: '-10%' }}
                        className={`grid ${gridColsClass} gap-4 w-full`}
                      >
                        {mediasToShow.map((media, mediaIndex) => (
                          <div
                            key={mediaIndex}
                            className={`relative w-full ${aspectRatioClass} overflow-hidden rounded-lg bg-[#f8f8f8] shadow-sm group`}
                          >
                            <SmartMedia
                              url={media.url}
                              type={media.type}
                              alt={`Gallery image ${rowIndex}-${mediaIndex}`}
                              fill
                              className="object-cover"
                              mediaClassName="group-hover:scale-105 transition-transform duration-700"
                              sizes={`(max-width: 768px) 100vw, ${Math.floor(
                                100 / count
                              )}vw`}
                              externalUrl={media.external_url}
                              layout={row.row_layout}
                            />
                          </div>
                        ))}
                        {Array.from({ length: placeHoldersCount }).map(
                          (_, pIndex) => (
                            <div
                              key={`placeholder-${pIndex}`}
                              className={`relative w-full ${aspectRatioClass} overflow-hidden rounded-lg bg-gray-50`}
                            />
                          )
                        )}
                      </motion.div>

                      {/* Description 2 Section */}
                      {showDescription2 && (
                        <motion.div
                          initial={{ opacity: 0, y: 30 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                          viewport={{ once: true }}
                          className="w-full pb-16 flex justify-start px-0 overflow-hidden"
                        >
                          <p className="text-base text-gray-700 leading-relaxed max-w-full text-left font-['Value_Sans'] font-medium wrap-break-word whitespace-pre-wrap">
                            {project.description_2}
                          </p>
                        </motion.div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Recommended Project Section */}
        {recommendedProject && (
          <div className="w-full px-4 pt-8 md:px-8 z-10 relative mt-0 bg-[#f8f8f8] md:bg-transparent pb-0">
            <Link
              href={getRecommendedHref(recommendedProject.id)}
              scroll={false}
              onClick={handleNextProject}
              onMouseEnter={() => setCursor('label', 'Next Project')}
              onMouseLeave={() => setCursor('default')}
              className="block w-full bg-[#F2B45A] rounded-t-3xl p-12 md:p-24 hover:bg-[#F5C270] transition-colors duration-300 group cursor-none"
            >
              <div className="flex flex-col items-start">
                <div className="flex items-center space-x-2 mb-6 opacity-80 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm tracking-widest text-[#ffffff] uppercase font-['Value_Sans'] font-normal leading-none">
                    Next Project
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 15 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-[#ffffff] block"
                  >
                    <path
                      d="M3 3 L12 12 L12 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="text-4xl md:text-6xl font-['Value_Serif'] font-medium text-[#0F2341] leading-tight max-w-4xl">
                  {recommendedProject.title}
                </h3>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
