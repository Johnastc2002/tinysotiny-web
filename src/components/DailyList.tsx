'use client';

import React, {
  useRef,
  useEffect,
  useState,
  useTransition,
  useCallback,
} from 'react';
import { DailyData } from '@/types/daily';
import { getDailyEntriesAction } from '@/app/actions';
import Image from 'next/image';
import DetailCard, { DetailCardData } from './DetailCard';
import LoadingSpinner from './LoadingSpinner';

interface DailyListProps {
  initialItems: DailyData[];
}

export default function DailyList({ initialItems }: DailyListProps) {
  const [items, setItems] = useState<DailyData[]>(initialItems);
  const [page, setPage] = useState(2); // Start from page 2 since page 1 is passed as initialItems
  const [hasMore, setHasMore] = useState(true);
  const [isPending, startTransition] = useTransition();
  const loaderRef = useRef<HTMLDivElement>(null);
  const [selectedDaily, setSelectedDaily] = useState<DailyData | null>(null);

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

  const handleCardClose = () => {
    setSelectedDaily(null);
  };

  // Map DailyData to DetailCardData
  const cardData: DetailCardData | null = selectedDaily
    ? {
        id: selectedDaily.id,
        title: selectedDaily.title,
        description: selectedDaily.description,
        imageUrl: selectedDaily.thumbnail.url,
        topLabel: 'DAILY',
        bottomContent: (
          <div className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <span className="mr-2 text-[10px]">◉</span>{' '}
            {new Date(selectedDaily.createdAt).toLocaleDateString()}
          </div>
        ),
      }
    : null;

  return (
    <>
      <DetailCard
        isOpen={!!selectedDaily}
        onClose={handleCardClose}
        data={cardData}
        basePath="/daily"
      />
      <div className="w-full max-w-2xl flex flex-col gap-32 pb-20">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col items-center gap-6 cursor-pointer group"
            onClick={() => setSelectedDaily(item)}
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
            <div className="text-center max-w-md px-4">
              <h2 className="text-2xl md:text-3xl font-serif text-[#0F2341] mb-2 tracking-wide uppercase group-hover:text-gray-600 transition-colors">
                {item.title}
              </h2>
              <p className="text-sm md:text-base text-gray-500 font-light leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
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
