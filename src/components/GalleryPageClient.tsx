'use client';

import { useState, useRef, useEffect } from 'react';
import { Project, GridFilter } from '@/types/project';
import BubbleScene from '@/components/BubbleScene';
import Link from 'next/link';
import Image from 'next/image';
import {
  getMoreNonFeaturedProjects,
  getFilteredProjectsAction,
} from '@/app/actions';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';

interface GalleryPageClientProps {
  initialFeaturedProjects: Project[];
  initialNonFeaturedProjects: Project[];
  gridFilter: GridFilter | null;
  projectType: 'work' | 'play';
  enableExplosion?: boolean;
  explosionDelay?: number;
}

export default function GalleryPageClient({
  initialFeaturedProjects,
  initialNonFeaturedProjects,
  gridFilter,
  projectType = 'work',
  enableExplosion = false,
  explosionDelay = 0,
}: GalleryPageClientProps) {
  const [viewMode, setViewMode] = useState<'dot' | 'grid'>('dot');

  // Projects state
  const [nonFeaturedProjects, setNonFeaturedProjects] = useState<Project[]>(
    initialNonFeaturedProjects
  );
  const [filteredProjects, setFilteredProjects] = useState<Project[] | null>(
    null
  );

  // Pagination state
  const [page, setPage] = useState(2);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [appliedTags, setAppliedTags] = useState<string[]>([]);

  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    // Simple check for iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isMobile = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isMobile);
  }, []);

  const observerTarget = useRef<HTMLDivElement>(null);

  // Handle filter close and apply
  const handleCloseFilter = () => {
    setIsFilterOpen(false);

    // Check if tags changed
    const isDifferent =
      selectedTags.length !== appliedTags.length ||
      !selectedTags.every((tag) => appliedTags.includes(tag));

    if (isDifferent) {
      setAppliedTags(selectedTags);
      setPage(1); // Reset page for new filter
      setHasMore(true);
      setFilteredProjects(null); // Clear current filtered results to trigger loading state or fetch
    }
  };

  // Toggle tag selection
  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Fetch projects when appliedTags change or page increments
  useEffect(() => {
    const fetchProjects = async () => {
      // If we have active filters
      if (appliedTags.length > 0) {
        setLoading(true);
        try {
          const newProjects = await getFilteredProjectsAction(
            appliedTags,
            page,
            projectType
          );

          if (newProjects.length === 0) {
            setHasMore(false);
          }

          if (page === 1) {
            setFilteredProjects(newProjects);
            // If we got full page, assume more might exist.
            // If less than limit (12), we know no more.
            setHasMore(newProjects.length >= 12);
            if (newProjects.length >= 12) setPage(2);
          } else {
            setFilteredProjects((prev) => [...(prev || []), ...newProjects]);
            if (newProjects.length > 0) setPage((prev) => prev + 1);
          }
        } catch (error) {
          console.error('Error fetching filtered projects:', error);
        } finally {
          setLoading(false);
        }
      } else {
        // No filters: if we just cleared filters (filteredProjects is null but we might need to reset nonFeatured)
        // Actually, if appliedTags is empty, we fall back to initial props + infinite scroll of non-featured.
        // We just ensure filteredProjects is null.
        setFilteredProjects(null);
      }
    };

    // If appliedTags changed to non-empty, or if we are paging through filtered results
    if (appliedTags.length > 0) {
      // Only fetch if we haven't fetched this page yet or if it's page 1 reset
      // But useEffect runs on dependency change.
      // We need to distinguish between "filter changed" (page reset to 1) and "scroll load more" (page > 1)
      // The logic above handles page=1 specially.
      fetchProjects();
    }
  }, [appliedTags, page, projectType]); // Only fetch when appliedTags change (reset) or page changes (scroll)

  // Note: The above useEffect has a flaw: `setPage` inside it might cause loop if not careful.
  // Actually, for "load more", we increment page in the observer, which triggers this effect.
  // For "filter change", we setPage(1) in handleCloseFilter, which triggers this effect.
  // But inside fetchProjects, we setPage(2) if page=1. This would trigger effect again?
  // Yes. So we should NOT setPage inside useEffect if it triggers itself.
  // Better strategy:
  // 1. Filter change -> setAppliedTags -> triggers Effect 1 (reset filteredProjects, setPage(1), fetch page 1).
  // 2. Scroll -> Observer -> setPage(prev+1) -> triggers Effect 1 (fetch next page).

  // Let's separate the "Load More" logic from "Initial Filter Fetch".

  // Refined Effect for Filter Change
  useEffect(() => {
    if (appliedTags.length > 0) {
      const loadFirstPage = async () => {
        setLoading(true);
        try {
          // Reset page to 1 implicitly by calling API with page 1
          const newProjects = await getFilteredProjectsAction(
            appliedTags,
            1,
            projectType
          );
          setFilteredProjects(newProjects);
          setHasMore(newProjects.length >= 12);
          setPage(2); // Next page to fetch is 2
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };
      loadFirstPage();
    } else {
      setFilteredProjects(null);
      setHasMore(true);
      setPage(2); // Reset for non-featured pagination
    }
  }, [appliedTags, projectType]);

  // Infinite Scroll Observer
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
            if (appliedTags.length > 0) {
              // Load more filtered
              const newProjects = await getFilteredProjectsAction(
                appliedTags,
                page,
                projectType
              );
              if (newProjects.length === 0) {
                setHasMore(false);
              } else {
                setFilteredProjects((prev) => [
                  ...(prev || []),
                  ...newProjects,
                ]);
                setPage((prev) => prev + 1);
              }
            } else {
              // Load more non-featured (default)
              const newProjects = await getMoreNonFeaturedProjects(
                page,
                projectType
              );
              if (newProjects.length === 0) {
                setHasMore(false);
              } else {
                setNonFeaturedProjects((prev) => [...prev, ...newProjects]);
                setPage((prev) => prev + 1);
              }
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
  }, [hasMore, loading, page, viewMode, appliedTags, projectType]);

  const displayedProjects =
    filteredProjects !== null
      ? filteredProjects
      : [...initialFeaturedProjects, ...nonFeaturedProjects];

  const isPlay = projectType === 'play';
  const bgClass = isPlay ? 'bg-play-gradient' : 'bg-[#F0F2F5]';
  const textClass = isPlay ? 'text-white' : 'text-[#0F2341]';

  return (
    <div className={`relative w-full min-h-screen ${bgClass}`}>
      {/* Toggle Button */}
      <div
        className="fixed top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2"
        style={{ right: '1.75rem' }}
      >
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

      {/* Filter Button */}
      {viewMode === 'grid' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={() => setIsFilterOpen(true)}
            className="px-6 py-3 rounded-full bg-white/30 backdrop-blur-xl border border-white/40 shadow-lg text-[#0F2341] font-medium text-xs hover:bg-white/50 transition-all uppercase tracking-widest hover:scale-105"
          >
            Filters
            {appliedTags.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#E32619] text-white text-[10px]">
                {appliedTags.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Filter Overlay */}
      <AnimatePresence>
        {isFilterOpen && gridFilter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 bg-black/20 backdrop-blur-md flex flex-col items-center justify-end pb-8 px-4"
            onClick={handleCloseFilter}
          >
            <motion.div
              initial={isIOS ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={isIOS ? { duration: 0 } : { delay: 0.1 }}
              className="max-w-5xl w-full flex flex-wrap justify-center gap-3 md:gap-4 max-h-[60vh] overflow-y-auto pt-8 md:pt-0"
            >
              {gridFilter.filters.map((tag, index) => {
                const isSelected = selectedTags.includes(tag.tag_id);
                return (
                  <motion.button
                    key={tag.id}
                    initial={
                      isIOS
                        ? { opacity: 1, scale: 1 }
                        : { opacity: 0, scale: 0.9 }
                    }
                    animate={{ opacity: 1, scale: 1 }}
                    transition={
                      isIOS ? { duration: 0 } : { delay: 0.03 * index }
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTag(tag.tag_id);
                    }}
                    className={`px-6 py-2.5 rounded-full border transition-all text-xs md:text-sm uppercase tracking-wide font-medium shadow-sm ${
                      isSelected
                        ? 'border-[#E32619] bg-[#E32619] text-white'
                        : 'border-gray-300 bg-white/80 backdrop-blur-sm text-gray-600 hover:border-[#E32619] hover:text-[#E32619] hover:bg-white'
                    }`}
                  >
                    {tag.display_name}
                  </motion.button>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full h-full relative">
        {/* Dot View (Always Mounted, Hidden via CSS) */}
        <div
          className={`h-screen w-full overflow-hidden fixed top-0 left-0 transition-opacity duration-500 ${
            viewMode === 'dot'
              ? 'opacity-100 z-10'
              : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <BubbleScene
            mode="gallery"
            projects={initialFeaturedProjects}
            enableExplosion={enableExplosion}
            explosionDelay={explosionDelay}
            transparent={isPlay}
          />
        </div>

        {/* Grid View (Always Mounted, Hidden via CSS) */}
        <div
          className={`w-full h-screen fixed inset-0 overflow-y-auto transition-opacity duration-500 ${
            isPlay ? 'bg-transparent' : 'bg-[#F0F2F5]'
          } ${
            viewMode === 'grid'
              ? 'opacity-100 z-20'
              : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <div className="w-full min-h-full pt-24 px-4 md:px-12 pb-32">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-12 md:gap-x-8 md:gap-y-16 max-w-7xl mx-auto">
              {displayedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  textClass={textClass}
                />
              ))}
            </div>

            {/* Loading Indicator / Observer Target */}
            <div
              ref={observerTarget}
              className="w-full h-20 flex items-center justify-center mt-12"
            >
              {loading && <LoadingSpinner size={24} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  textClass = 'text-[#0F2341]',
}: {
  project: Project;
  textClass?: string;
}) {
  // Use bubble_thumbnail or first thumbnail
  const imageUrl = project.thumbnails?.[0] || project.bubble_thumbnail;

  return (
    <Link
      href={`/project/${project.id}`}
      className="block group transition-all duration-300"
    >
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
      <div className="flex flex-col items-center text-center transition-all duration-300">
        <h3
          className={`text-lg md:text-xl font-medium ${textClass} group-hover:text-gray-400 transition-colors font-serif`}
        >
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
