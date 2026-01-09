'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Project } from '@/types/project';

import SmartMedia from '@/components/SmartMedia';

interface ProjectPageClientProps {
  project: Project;
  recommendedProject: Project | null;
}

// Removed local FadeInImage as it is superseded by SmartMedia

export default function ProjectPageClient({ project, recommendedProject }: ProjectPageClientProps) {
  // Ref for the container that holds the horizontal scroll section
  const containerRef = useRef<HTMLDivElement>(null);

  // Track scroll progress of the container
  const { scrollYProgress } = useScroll({
    target: containerRef,
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

  return (
    <div className="bg-white">
      {/* Mobile Fixed Banner 1 */}
      <div className="fixed top-0 left-0 w-full h-screen z-0 md:hidden">
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
        <div className="fixed top-0 left-0 w-full h-screen overflow-hidden bg-black z-0">
          <motion.div style={{ x }} className="flex h-full">
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
                    <div className="relative w-3/5 h-full bg-gray-100">
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
                      <div className="flex-1 bg-[#E5E5E5] p-10 flex flex-col justify-center">
                        <div className="mb-4">
                          <span className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                            CLIENT / {project.clientName}
                          </span>
                        </div>
                        <h2 className="mb-4 text-4xl font-serif text-gray-800 leading-tight">
                          {project.title}
                        </h2>
                        <p className="text-sm text-gray-600 leading-relaxed max-w-md">
                          {project.description}
                        </p>
                      </div>

                      {/* Bottom Section - Tags/Points */}
                      <div className="bg-white p-10 flex flex-col justify-center min-h-[30%]">
                        <ul className="space-y-3">
                          {project.tags.map((tag, tagIndex) => (
                            <li
                              key={tagIndex}
                              className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wide"
                            >
                              <span className="mr-2 text-[10px]">◉</span> {tag}
                            </li>
                          ))}
                        </ul>
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
      <div className="relative z-10 bg-transparent min-h-screen">
        {/* Background Layer for the lower part */}
        <div className="hidden md:block absolute top-[10vh] left-0 w-full bottom-0 bg-gray-100 -z-10" />

        {/* Mobile Layout */}
        <div className="md:hidden w-full pt-[70vh]">
          <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] overflow-hidden">
            {/* 1. Info Block (Title, Description, Tags) */}
            <div className="px-8 pt-10 pb-10">
              <div className="mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  CLIENT / {project.clientName}
                </span>
              </div>
              <h1 className="text-4xl font-serif text-gray-900 leading-tight mb-6">
                {project.title}
              </h1>
              <p className="text-base text-gray-700 leading-relaxed mb-8">
                {project.description}
              </p>
              
              {/* Tags */}
              <ul className="space-y-2">
                {project.tags.map((tag, tagIndex) => (
                  <li
                    key={tagIndex}
                    className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wide"
                  >
                    <span className="mr-2 text-[10px]">◉</span> {tag}
                  </li>
                ))}
              </ul>
            </div>

            {/* 2. Banner 2 (Full Width) */}
            {project.banners.length > 1 && (
              <div className="w-full relative bg-gray-100">
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
                    <div key={index} className="w-full relative bg-gray-100">
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
                    className="text-base text-gray-600 leading-relaxed whitespace-pre-line font-light"
                    dangerouslySetInnerHTML={{ __html: project.cast }}
                 />
               )}
            </div>
          </div>
        </div>

        {/* Title and Cast Section Container - Overlap the banner (Desktop Only) */}
        <div className="hidden md:block w-full relative -mt-32 z-20 pointer-events-none">
          <div className="flex flex-col md:flex-row gap-0">
            {/* Left Column: White Box for Title & Cast */}
            <div className="w-full md:w-1/2 bg-white pt-8 pb-8 pr-8 md:pt-16 md:pb-16 md:pr-16 pl-12 md:pl-24 shadow-lg pointer-events-auto rounded-r-3xl">
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                viewport={{ once: true }}
              >
                <div className="mb-6">
                  <span className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                    CLIENT / {project.clientName}
                  </span>
                </div>
                <h1 className="text-5xl md:text-7xl font-serif text-gray-900 leading-tight mb-8">
                  {project.title}
                </h1>

                {/* Casts */}
                <div
                    className="text-lg text-gray-600 leading-relaxed whitespace-pre-line font-light mb-12"
                    dangerouslySetInnerHTML={{ __html: project.cast }}
                />

                {/* Description */}
                <div className="mb-8">
                  <p className="text-xl text-gray-700 leading-relaxed">
                    {project.description}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Spacer (Transparent) to show banner behind */}
            <div className="hidden md:block w-full md:w-1/2 pointer-events-none"></div>
          </div>
        </div>

        {/* Gray Background Section for Gallery */}
        <div className="w-full pt-12 pb-24 px-4 md:pt-40 md:px-24 mt-0 md:-mt-24 z-10 relative bg-gray-100 md:bg-transparent">
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
                          className={`relative w-full ${aspectRatioClass} overflow-hidden rounded-lg bg-gray-100 shadow-sm group`}
                        >
                          <SmartMedia
                            url={media.url}
                            type={media.type}
                            alt={`Gallery image ${rowIndex}-${mediaIndex}`}
                            fill
                            className="object-cover hover:scale-105 transition-transform duration-700"
                            sizes={`(max-width: 768px) 100vw, ${Math.floor(
                              100 / count
                            )}vw`}
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
                        className="w-full py-16 flex justify-center"
                      >
                        <p className="text-xl md:text-2xl text-gray-700 leading-relaxed max-w-3xl text-center font-light">
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

        {/* Recommended Project Section */}
        {recommendedProject && (
          <div className="w-full px-4 md:px-8 z-10 relative -mt-8 bg-gray-100 md:bg-transparent pb-0">
            <Link
              href={`/project/${recommendedProject.id}`}
              className="block w-full bg-[#D6A360] rounded-t-3xl p-12 md:p-24 hover:bg-[#c59556] transition-colors duration-300 group"
            >
              <div className="flex flex-col items-start">
                <div className="flex items-center space-x-2 mb-6 opacity-80 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-bold tracking-widest text-[#2c2c2c] uppercase">
                    Next Project
                  </span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-[#2c2c2c]"
                  >
                    <path
                      d="M1 1L11 11M11 11V1M11 11H1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="text-4xl md:text-6xl font-serif text-[#2c2c2c] leading-tight max-w-4xl">
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

