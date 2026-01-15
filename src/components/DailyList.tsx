'use client';

import React, {
  useRef,
  useEffect,
  useState,
  useTransition,
  useCallback,
  Suspense,
} from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { DailyData } from '@/types/daily';
import { getDailyEntriesAction, getDailyEntryByIdAction } from '@/app/actions';
import Image from 'next/image';
import LoadingSpinner from './LoadingSpinner';
import HorizontalScroll from '@/components/HorizontalScroll';
import { CursorPortal } from '@/components/CursorPortal';

interface DailyListProps {
  initialItems: DailyData[];
}

function DailyListContent({ initialItems }: DailyListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<DailyData[]>(initialItems);
  const [page, setPage] = useState(2); // Start from page 2 since page 1 is passed as initialItems
  const [hasMore, setHasMore] = useState(true);
  const [isPending, startTransition] = useTransition();
  const loaderRef = useRef<HTMLDivElement>(null);

  // Overlay state
  const [selectedDaily, setSelectedDaily] = useState<DailyData | null>(null);
  const [overlayContainer, setOverlayContainer] = useState<HTMLElement | null>(
    null
  );

  // Track if close was triggered manually to enable exit animation
  const isManualClose = useRef(false);

  // Handle URL param for daily detail
  useEffect(() => {
    const dailyId = searchParams.get('daily');
    if (dailyId) {
      // Reset manual close ref when opening a daily entry
      isManualClose.current = false;

      // Check if we already have it in items
      const existing = items.find((i) => i.id === dailyId);
      if (existing) {
        // Wrap in startTransition to avoid sync render warning
        React.startTransition(() => {
          setSelectedDaily(existing);
        });
      }

      // Always fetch to ensure we have latest/full data especially if fields were omitted in list
      const fetchDaily = async () => {
        try {
          const daily = await getDailyEntryByIdAction(dailyId);
          if (daily) {
            setSelectedDaily(daily);
            document.body.style.overflow = 'hidden';
          }
        } catch (error) {
          console.error(error);
        }
      };
      fetchDaily();
    } else {
      React.startTransition(() => {
        setSelectedDaily(null);
      });
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [searchParams, items]);

  // Scroll reset for overlay
  useEffect(() => {
    if (overlayContainer) {
      overlayContainer.scrollTo(0, 0);
    }
  }, [selectedDaily, overlayContainer]);

  const updateUrlWithDaily = useCallback(
    (dailyId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('daily', dailyId);
      // Push to history so back button works
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleClose = () => {
    isManualClose.current = true;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('daily');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const loadMore = useCallback(() => {
    startTransition(async () => {
      const newItems = await getDailyEntriesAction(page);
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems((prev) => [...prev, ...newItems]);
        setPage((prev) => prev + 1);
      }
    });
  }, [page]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !isPending) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    const currentLoader = loaderRef.current;

    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [hasMore, isPending, loadMore]);

  return (
    <>
      <AnimatePresence mode="wait">
        {selectedDaily && searchParams.get('daily') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={
              // eslint-disable-next-line
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
              onClick={handleClose}
              className="fixed top-8 right-6 z-60 p-2 bg-white/50 backdrop-blur-md rounded-full shadow-md hover:bg-white transition-colors flex items-center justify-center w-12 h-12"
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
              <HorizontalScroll
                key={selectedDaily.id}
                daily={selectedDaily}
                scrollContainerRef={{ current: overlayContainer }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-2xl flex flex-col gap-16 md:gap-24 pb-20">
        <div className="h-6 md:h-8" /> {/* Spacer */}
        {items.map((item) => (
          <DailyCard key={item.id} item={item} onClick={updateUrlWithDaily} />
        ))}
        {/* Loading Indicator */}
        {hasMore && (
          <div ref={loaderRef} className="flex justify-center p-8">
            {isPending ? <LoadingSpinner size={24} /> : <div className="h-8" />}
          </div>
        )}
      </div>
    </>
  );
}

function DailyCard({
  item,
  onClick,
}: {
  item: DailyData;
  onClick: (id: string) => void;
}) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <>
      <CursorPortal visible={isHovering} text={null} />
      <div
        onClick={() => onClick(item.id)}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="flex flex-col items-center gap-3 cursor-pointer group w-full"
      >
        {/* Image Container */}
        {/* Use thumbnail as the main image in the list view */}
        {item.thumbnail && item.thumbnail.url && (
          <div
            className="relative w-full rounded-3xl overflow-hidden shadow-sm"
            style={{
              aspectRatio:
                item.thumbnail.width && item.thumbnail.height
                  ? `${item.thumbnail.width}/${item.thumbnail.height}`
                  : '4/5', // Default aspect ratio if dimensions missing
            }}
          >
            <Image
              src={item.thumbnail.url}
              alt={item.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}

        {/* Caption */}
        <div className="w-full text-left px-4">
          <h2 className="text-lg md:text-xl font-['Value_Serif'] font-medium text-[#0F2341] mb-2 tracking-wide uppercase group-hover:text-gray-600 transition-colors">
            {item.title}
          </h2>
        </div>
      </div>
    </>
  );
}

export default function DailyList(props: DailyListProps) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-8">
          <LoadingSpinner size={24} color="#0F2341" trackColor="#e5e7eb" />
        </div>
      }
    >
      <DailyListContent {...props} />
    </Suspense>
  );
}
