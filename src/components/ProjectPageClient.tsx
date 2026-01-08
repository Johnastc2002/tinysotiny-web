'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Project } from '@/types/project';

interface ProjectPageClientProps {
  project: Project;
  recommendedProject: Project | null;
}

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
      {/* Horizontal Scroll Section - Fixed Banner */}
      <div
        ref={containerRef}
        style={{ height: scrollHeight }}
        className="relative z-0"
      >
        <div className="fixed top-0 left-0 w-full h-screen overflow-hidden bg-black z-0">
          <motion.div style={{ x }} className="flex h-full">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className="relative h-full min-w-full w-screen shrink-0"
              >
                {slide.type === 'banner' ? (
                  <Image
                    src={slide.content as string}
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
                        <Image
                          src={project.banners[0]}
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
        <div className="absolute top-[10vh] left-0 w-full bottom-0 bg-gray-100 -z-10" />

        {/* Title and Cast Section Container - Overlap the banner */}
        <div className="w-full relative -mt-32 z-20 pointer-events-none">
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
        <div className="w-full pt-40 pb-24 px-12 md:px-24 -mt-24 z-10 relative">
          <div className="">
            {/* Image Gallery */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {project.images.map((img, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true, margin: '-10%' }}
                  className={`relative w-full ${
                    index % 3 === 0
                      ? 'md:col-span-2 aspect-video'
                      : 'aspect-3/4'
                  }`}
                >
                  <div className="relative w-full h-full overflow-hidden rounded-lg bg-gray-100 shadow-sm">
                    <Image
                      src={img}
                      alt={`Gallery image ${index + 1}`}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-700"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommended Project Section */}
        {recommendedProject && (
          <div className="w-full px-4 md:px-8 z-10 relative -mt-8">
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

