'use client';

import { useState, useRef, useEffect } from 'react';
import { Project } from '@/types/project';
import BubbleScene from '@/components/BubbleScene';
import Link from 'next/link';
import Image from 'next/image';
import { getMoreNonFeaturedProjects } from '@/app/actions';
import { motion } from 'framer-motion';

interface WorkPageClientProps {
  initialFeaturedProjects: Project[];
  initialNonFeaturedProjects: Project[];
}

export default function WorkPageClient({
  initialFeaturedProjects,
  initialNonFeaturedProjects,
}: WorkPageClientProps) {
  const [viewMode, setViewMode] = useState<'dot' | 'grid'>('dot');
  const [nonFeaturedProjects, setNonFeaturedProjects] = useState<Project[]>(
    initialNonFeaturedProjects
  );
  const [page, setPage] = useState(2);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      async (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !loading &&
          viewMode === 'grid'
        ) {
          setLoading(true);
          try {
            const newProjects = await getMoreNonFeaturedProjects(page, 'work');
            if (newProjects.length === 0) {
              setHasMore(false);
            } else {
              setNonFeaturedProjects((prev) => [...prev, ...newProjects]);
              setPage((prev) => prev + 1);
            }
          } catch (error) {
            console.error('Error fetching more projects:', error);
          } finally {
            setLoading(false);
          }
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    const currentTarget = observerTarget.current;
    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, page, viewMode]);

  const allProjects = [...initialFeaturedProjects, ...nonFeaturedProjects];

  return (
    <div className="relative w-full min-h-screen bg-[#F0F2F5]">
      {/* Toggle Button */}
      <div className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2">
        <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase">
          DOT
        </span>

        {/* Glass Switch */}
        <button
          onClick={() =>
            setViewMode((prev) => (prev === 'dot' ? 'grid' : 'dot'))
          }
          className="w-10 h-24 rounded-full border border-white/40 bg-white/10 backdrop-blur-xl transition-all hover:bg-white/20 shadow-lg relative overflow-hidden active:scale-95 flex flex-col justify-between p-1"
          aria-label="Toggle View"
        >
          {/* Active White Indicator */}
          <motion.div
            className="absolute w-8 h-8 rounded-full bg-white shadow-md z-10 left-1"
            initial={false}
            animate={{
              top: viewMode === 'dot' ? '4px' : 'calc(100% - 36px)',
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
            }}
          />
        </button>

        <span className="text-[10px] font-medium tracking-widest text-gray-400 uppercase">
          GRID
        </span>
      </div>

      <div className="w-full h-full relative">
        {/* Dot View (Always Mounted, Hidden via CSS) */}
        <div
          className={`h-screen w-full overflow-hidden fixed top-0 left-0 transition-opacity duration-500 ${
            viewMode === 'dot'
              ? 'opacity-100 z-10'
              : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <BubbleScene mode="gallery" projects={initialFeaturedProjects} />
        </div>

        {/* Grid View (Always Mounted, Hidden via CSS) */}
        <div
          className={`w-full h-screen fixed inset-0 overflow-y-auto bg-[#F0F2F5] transition-opacity duration-500 ${
            viewMode === 'grid'
              ? 'opacity-100 z-20'
              : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <div className="w-full min-h-full pt-24 px-4 md:px-12 pb-20">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-12 md:gap-x-8 md:gap-y-16 max-w-7xl mx-auto">
              {allProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            {/* Loading Indicator / Observer Target */}
            <div
              ref={observerTarget}
              className="w-full h-20 flex items-center justify-center mt-12"
            >
              {loading && (
                <div className="w-6 h-6 border-2 border-gray-300 border-t-[#E32619] rounded-full animate-spin" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  // Use bubble_thumbnail or first thumbnail
  const imageUrl = project.thumbnails?.[0] || project.bubble_thumbnail;

  return (
    <Link href={`/project/${project.id}`} className="block group">
      <div className="relative w-full aspect-square overflow-hidden bg-gray-200 mb-4 rounded-3xl">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={project.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            No Image
          </div>
        )}
      </div>
      <div className="flex flex-col items-center text-center">
        <h3 className="text-lg md:text-xl font-medium text-[#0F2341] group-hover:text-gray-400 transition-colors font-serif">
          {project.title}
        </h3>
        {project.clientName && (
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
            {project.clientName}
          </p>
        )}
      </div>
    </Link>
  );
}
