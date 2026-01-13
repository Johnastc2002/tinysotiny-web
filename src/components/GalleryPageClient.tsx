'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Project, GridFilter } from '@/types/project';
import BubbleScene from '@/components/BubbleScene';
import Link from 'next/link';
import Image from 'next/image';
import {
  getMoreNonFeaturedProjects,
  getFilteredProjectsAction,
  getProjectByIdAction,
  getRecommendedProjectAction,
} from '@/app/actions';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import DetailCard, { DetailCardData } from './DetailCard';
import ProjectPageClient from '@/components/ProjectPageClient';

interface GalleryPageClientProps {
  initialFeaturedProjects: Project[];
  initialNonFeaturedProjects: Project[];
  gridFilter: GridFilter | null;
  projectType: 'work' | 'play';
  enableExplosion?: boolean;
  explosionDelay?: number;
}

function GalleryPageContent({
  initialFeaturedProjects,
  initialNonFeaturedProjects,
  gridFilter,
  projectType = 'work',
  enableExplosion = false,
  explosionDelay = 0,
}: GalleryPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Track if close was triggered manually to enable exit animation
  const isManualClose = useRef(false);

  // Full Project Details State
  const [fullProject, setFullProject] = useState<Project | null>(null);
  const [recommendedProject, setRecommendedProject] = useState<Project | null>(
    null
  );
  const [overlayContainer, setOverlayContainer] = useState<HTMLElement | null>(
    null
  );
  const [isBubblePaused, setIsBubblePaused] = useState(false);

  useEffect(() => {
    // Pause bubbles ONLY if full project overlay is open
    // Allow bubbles to keep moving when Detail Card (selectedProject) is open
    if (fullProject) {
      // Delay pause to ensure any layout shifts (scrollbars) are handled by a few frames
      // Matches transition duration (300ms) + buffer
      const timer = setTimeout(() => setIsBubblePaused(true), 400);
      return () => clearTimeout(timer);
    } else {
      setIsBubblePaused(false);
    }
  }, [fullProject]);

  // Reset scroll on project change (handle Back/Forward navigation)
  useEffect(() => {
    if (overlayContainer) {
      overlayContainer.scrollTop = 0;
    }
  }, [fullProject, overlayContainer]);

  useEffect(() => {
    // Simple check for iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isMobile = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isMobile);

    // Restore state from URL
    const view = searchParams.get('view');
    const tags = searchParams.get('tags');
    // project (full detail) is handled in separate effect

    if (view === 'grid') {
      setViewMode('grid');
    }

    if (tags) {
      const t = tags.split(',');
      setAppliedTags(t);
      setSelectedTags(t);
    }

    // Restore DetailCard state
    // Note: DetailCard state is now fully synced with URL in a separate effect below

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount to restore state

  // Sync DetailCard state with URL (Open and Close)
  useEffect(() => {
    const cardId = searchParams.get('card');

    if (cardId) {
      // If URL has card param but state doesn't match or matches different ID, open the correct one
      if (selectedProject?.id !== cardId) {
        const allProjects = [
          ...initialFeaturedProjects,
          ...nonFeaturedProjects,
          ...(filteredProjects || []),
        ];
        const proj = allProjects.find((p) => p.id === cardId);
        if (proj) {
          setSelectedProject(proj);
        }
      }
    } else {
      // If URL doesn't have card param but state is open, close it
      if (selectedProject) {
        setSelectedProject(null);
      }
    }
    // Remove selectedProject from dependency array to avoid double-firing or stale closures causing re-renders
    // We only want to react to searchParams changes predominantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchParams,
    initialFeaturedProjects,
    nonFeaturedProjects,
    filteredProjects,
  ]);

  // Handle Project URL Param (Full Detail)
  useEffect(() => {
    const projectId = searchParams.get('project');
    if (projectId) {
      // Reset manual close ref when opening a project
      isManualClose.current = false;

      // Fetch full project details
      const fetchProjectDetails = async () => {
        try {
          const project = await getProjectByIdAction(projectId);
          if (project) {
            setFullProject(project);
            const recommended = await getRecommendedProjectAction(
              project.id,
              projectType
            );
            setRecommendedProject(recommended);

            // Lock body scroll
            // document.body.style.overflow = 'hidden';
          }
        } catch (error) {
          console.error('Error fetching project details:', error);
        }
      };
      fetchProjectDetails();
    } else {
      // When projectId is gone, we just want to close.
      // We set state to null. AnimatePresence handles the rest.
      setFullProject(null);
      setRecommendedProject(null);
      // Unlock body scroll
      // document.body.style.overflow = '';
    }

    return () => {
      // document.body.style.overflow = '';
    };
  }, [searchParams, projectType]);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    if (viewMode === 'grid') {
      if (params.get('view') !== 'grid') {
        params.set('view', 'grid');
        changed = true;
      }
    } else {
      if (params.has('view')) {
        params.delete('view');
        changed = true;
      }
    }

    if (appliedTags.length > 0) {
      const tagsStr = appliedTags.join(',');
      if (params.get('tags') !== tagsStr) {
        params.set('tags', tagsStr);
        changed = true;
      }
    } else {
      if (params.has('tags')) {
        params.delete('tags');
        changed = true;
      }
    }

    if (changed) {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [viewMode, appliedTags, pathname, router, searchParams]);

  // Map Project to DetailCardData
  const cardData: DetailCardData | null = selectedProject
    ? {
        id: selectedProject.id,
        title: selectedProject.title,
        description: selectedProject.description,
        imageUrl:
          (selectedProject.thumbnails && selectedProject.thumbnails.length > 0
            ? selectedProject.thumbnails[0]
            : undefined) || selectedProject.bubble_thumbnail,
        topLabel: selectedProject.clientName ? (
          <>
            <span className="font-['Value_Sans'] font-normal">CLIENT / </span>
            <span className="font-['Value_Serif'] font-medium">
              {selectedProject.clientName}
            </span>
          </>
        ) : null,
        bottomContent: (
          <ul className="flex flex-wrap gap-x-4 gap-y-2 md:block md:space-y-3 m-0 p-0">
            {selectedProject.tags.map((tag, index) => (
              <li
                key={index}
                className={`flex items-center leading-none text-[10px] md:text-xs font-['Value_Sans'] font-normal uppercase tracking-wide transition-colors ${
                  selectedProject.card_font_color
                    ? 'text-current opacity-80 md:text-[#B6B6B6] md:opacity-100'
                    : 'text-[#B6B6B6]'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-current mr-2 shrink-0 mb-0.5" />
                {tag}
              </li>
            ))}
          </ul>
        ),
        cardBgColor: selectedProject.card_bg_color,
        cardFontColor: selectedProject.card_font_color,
      }
    : null;

  const handleCloseCard = () => {
    setSelectedProject(null);
    const params = new URLSearchParams(searchParams.toString());
    if (params.has('card')) {
      params.delete('card');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };

  const updateUrlWithProject = (projectId: string) => {
    // Keep preview card open (don't set null)
    const params = new URLSearchParams(searchParams.toString());
    // Keep card param if exists (don't delete)

    params.set('project', projectId);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Update URL when opening DetailCard (Bubble Click)
  const handleOpenCard = (project: Project) => {
    // Check if card is already open or url param exists
    const currentCardId = searchParams.get('card');
    if (currentCardId === project.id) return;

    // We only update the URL. The useEffect above will handle setting the state.
    // This prevents race conditions where state is set but URL param hasn't propagated yet.
    const params = new URLSearchParams(searchParams.toString());
    params.set('card', project.id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Intercept DetailCard open to just update URL for simple card or keep separate?
  // The user says "when the user press the project detail... navigate to it".
  // The DetailCard seems to be a preview.
  // BubbleScene onOpenCard currently sets selectedProject for DetailCard.
  // The user might mean clicking the card inside DetailCard or clicking ProjectCard.

  // If DetailCard is just a preview, we can keep it. But wait, user said "the project details page is using the same URL... as overlay".
  // So likely they mean the FULL details page.
  // Currently ProjectCard links to /project/[id].
  // DetailCard also has handleCardClick which pushes to /project/[id].

  // We should intercept these.

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
      // Reset logic: Clear filters and reload initial non-featured projects
      const resetProjects = async () => {
        setLoading(true);
        try {
          // Clear filtered state first
          setFilteredProjects(null);

          // Fetch fresh non-featured projects (page 1)
          const projects = await getMoreNonFeaturedProjects(1, projectType);
          setNonFeaturedProjects(projects);

          setHasMore(true);
          setPage(2);
        } catch (error) {
          console.error('Error resetting projects:', error);
        } finally {
          setLoading(false);
        }
      };
      resetProjects();
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

  return (
    <div className={`relative w-full min-h-screen ${bgClass}`}>
      <DetailCard
        isOpen={!!selectedProject}
        onClose={handleCloseCard}
        data={cardData}
        basePath="/project"
        onCardClick={(id) => updateUrlWithProject(id)}
      />

      {/* Full Project Overlay */}
      <AnimatePresence mode="wait">
        {fullProject && searchParams.get('project') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={
              isManualClose.current
                ? { opacity: 0 }
                : { opacity: 0, transition: { duration: 0 } }
            }
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-white overflow-y-auto"
            ref={setOverlayContainer}
            style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
          >
            {/* Close Button */}
            <button
              onClick={() => {
                isManualClose.current = true;
                // Clear 'project' param but keep view/tags/page state
                const params = new URLSearchParams(searchParams.toString());
                params.delete('project');
                router.push(`${pathname}?${params.toString()}`);
              }}
              className="fixed top-4 right-4 z-60 p-2 bg-white/50 backdrop-blur-md rounded-full shadow-md hover:bg-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {overlayContainer && (
              <ProjectPageClient
                key={fullProject.id} // Add key to force remount on project change
                project={fullProject}
                recommendedProject={recommendedProject}
                scrollContainerRef={{ current: overlayContainer }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <div
        className="fixed top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2"
        style={{ right: '1.75rem' }}
      >
        <span className="text-[10px] font-['Value_Sans'] font-normal tracking-widest text-[#B6B6B6] uppercase">
          DOT
        </span>

        {/* Glass Switch */}
        <button
          onClick={() =>
            setViewMode((prev) => (prev === 'dot' ? 'grid' : 'dot'))
          }
          className="w-8 h-20 rounded-full border border-white/40 bg-white/10 backdrop-blur-sm shadow-[inset_2px_3px_8px_rgba(150,150,150,0.2),inset_-1px_-2px_4px_rgba(255,255,255,0.8)] relative overflow-hidden active:scale-95 flex flex-col justify-between p-1"
          aria-label="Toggle View"
        >
          {/* Distorted Reflection Overlay */}
          <div
            className="absolute inset-0 bg-linear-to-br from-white/20 via-white/5 to-transparent opacity-70 pointer-events-none"
            style={{ filter: 'blur(1px)' }}
          />

          {/* Active White Indicator */}
          <motion.div
            className="absolute w-5 h-5 rounded-full bg-white z-10 left-[5px]"
            initial={false}
            animate={{
              top: viewMode === 'dot' ? '7px' : 'calc(100% - 27px)',
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
            }}
          />
        </button>

        <span className="text-[10px] font-['Value_Sans'] font-normal tracking-widest text-[#B6B6B6] uppercase">
          GRID
        </span>
      </div>

      {/* Filter Button */}
      {viewMode === 'grid' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => setIsFilterOpen(true)}
            className="group flex items-center justify-center w-12 h-12 rounded-full border border-white/40 bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20 shadow-lg relative"
            aria-label="Filters"
          >
            {/* Icon */}
            <div className="flex flex-col gap-1.5">
              {/* Line 1 */}
              <div
                className={`relative w-5 h-0.5 rounded-full ${
                  isPlay ? 'bg-white' : 'bg-[#B6B6B6]'
                }`}
              >
                <div
                  className={`absolute right-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${
                    isPlay ? 'bg-white' : 'bg-[#B6B6B6]'
                  }`}
                />
              </div>
              {/* Line 2 */}
              <div
                className={`relative w-5 h-0.5 rounded-full ${
                  isPlay ? 'bg-white' : 'bg-[#B6B6B6]'
                }`}
              >
                <div
                  className={`absolute left-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${
                    isPlay ? 'bg-white' : 'bg-[#B6B6B6]'
                  }`}
                />
              </div>
            </div>

            {/* Badge */}
            {appliedTags.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#0F2341]/80 text-[10px] text-white">
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
            className="fixed inset-0 z-60 bg-black/20 backdrop-blur-md flex flex-col items-center justify-end pb-32 md:pb-32 px-4"
            onClick={handleCloseFilter}
          >
            <motion.div
              initial={isIOS ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={isIOS ? { duration: 0 } : { delay: 0.3 }}
              className="max-w-5xl w-full flex flex-wrap justify-center gap-3 md:gap-4 max-h-[60vh] overflow-y-auto pt-0 pb-4 md:pt-0"
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
                    className={`px-6 py-2.5 rounded-full transition-colors duration-200 text-xs md:text-sm uppercase tracking-wide font-['Value_Sans'] font-normal text-white ${
                      isSelected
                        ? 'bg-[#0F2341]/80'
                        : 'bg-[#B6B6B6]/60 hover:bg-[#B6B6B6]/80'
                    }`}
                  >
                    {tag.display_name}
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Bottom Actions Container */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
              <div className="relative">
                {/* Close Button */}
                <button
                  onClick={handleCloseFilter}
                  className="group flex items-center justify-center w-12 h-12 rounded-full border border-white/40 bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20 shadow-lg relative"
                  aria-label="Close Filters"
                >
                  {/* Cross Icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>

                {/* Reset Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTags([]);
                  }}
                  className="absolute right-full top-0 mr-4 h-12 px-6 rounded-full bg-[#3b3b3b]/80 text-white backdrop-blur-sm shadow-sm flex items-center gap-2 text-xs md:text-sm uppercase tracking-wide font-['Value_Sans'] font-normal hover:bg-[#3b3b3b] transition-all border border-transparent whitespace-nowrap"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  RESET
                </button>
              </div>
            </div>
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
            onOpenCard={handleOpenCard}
            enableBlur={true}
            paused={isBubblePaused}
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
          <div className="w-full min-h-full pt-24 px-2 md:px-12 pb-32">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 max-w-7xl mx-auto">
              {displayedProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
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

export default function GalleryPageClient(props: GalleryPageClientProps) {
  const isPlay = props.projectType === 'play';
  const bgClass = isPlay ? 'bg-play-gradient' : 'bg-[#F0F2F5]';
  const spinnerColor = isPlay ? '#ffffff' : '#0F2341';
  const trackColor = isPlay
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(15, 35, 65, 0.1)';

  return (
    <Suspense
      fallback={
        <div
          className={`w-full h-screen flex items-center justify-center ${bgClass}`}
        >
          <LoadingSpinner color={spinnerColor} trackColor={trackColor} />
        </div>
      }
    >
      <GalleryPageContent {...props} />
    </Suspense>
  );
}

function ProjectCard({ project }: { project: Project }) {
  // Use bubble_thumbnail or first thumbnail
  const imageUrl = project.thumbnails?.[0] || project.bubble_thumbnail;
  const searchParams = useSearchParams();

  const getHref = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('project', project.id);
    return `?${params.toString()}`;
  };

  return (
    <Link
      href={getHref()}
      scroll={false}
      className="block group transition-all duration-300"
    >
      <div className="relative w-full aspect-square overflow-hidden bg-gray-200 rounded-3xl">
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

        {/* Client Overlay */}
        {project.clientName && (
          <div className="absolute top-2 left-3 right-3 md:top-4 md:left-4 md:right-4 z-10 pointer-events-none">
            <span className="inline-block text-[10px] md:text-xs uppercase tracking-wider text-white drop-shadow-md whitespace-normal wrap-break-word">
              <span className="font-['Value_Sans'] font-normal">CLIENT / </span>
              <span className="font-['Value_Serif'] font-medium">
                {project.clientName}
              </span>
            </span>
          </div>
        )}

        {/* Tags Overlay */}
        <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4 z-10 flex flex-col gap-1 md:gap-2 items-start">
          {project.tags.slice(0, 2).map((tag, i) => (
            <span
              key={i}
              className="px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-white/20 backdrop-blur-sm text-[9px] md:text-[10px] uppercase tracking-wide font-['Value_Sans'] font-normal text-white shadow-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
