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
import Link from 'next/link';
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
      <div className="w-full max-w-2xl flex flex-col gap-16 md:gap-24 pb-20">
        {items.map((item) => (
          <Link
            href={`/daily/${item.id}`}
            key={item.id}
            className="flex flex-col items-center gap-3 cursor-pointer group"
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
              <h2 className="text-lg md:text-xl font-serif text-[#0F2341] mb-2 tracking-wide uppercase group-hover:text-gray-600 transition-colors">
                {item.title}
              </h2>
            </div>
          </Link>
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
