'use client';

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCursor } from '@/context/CursorContext';
import { SearchTag } from '@/types/project';

export interface DetailCardData {
  id: string;
  imageUrl?: string;
  title: string;
  description: string;
  topLabel: React.ReactNode;
  bottomContent: React.ReactNode;
  cardBgColor?: string;
  cardFontColor?: string;
  cardTagColor?: string;
  thumbnails?: string[];
  tags?: SearchTag[];
}

interface DetailCardProps {
  data: DetailCardData | null;
  onClose: () => void;
  isOpen: boolean;
  basePath: string;
  onCardClick?: (id: string) => void;
}

export default function DetailCard({
  data,
  onClose,
  isOpen,
  basePath,
  onCardClick,
}: DetailCardProps) {
  const [isImageLoaded, setIsImageLoaded] = React.useState(false);
  const router = useRouter();
  const { setCursor } = useCursor();

  // Helper to ensure color has # if it's a hex code
  const formatColor = (c?: string) => {
    if (!c) return undefined;
    const clean = c.trim();
    if (/^[0-9A-Fa-f]{6}$/.test(clean)) return `#${clean}`;
    return clean;
  };

  const bgColor = data ? formatColor(data.cardBgColor) : undefined;
  const fontColor = data ? formatColor(data.cardFontColor) : undefined;
  const tagColor = data ? formatColor(data.cardTagColor) : undefined;

  const showSecondThumbnail = data?.thumbnails && data.thumbnails.length > 1;

  // Reset loading state when data changes
  React.useEffect(() => {
    if (isOpen) {
      setIsImageLoaded(false);
      // Safety timeout: force show image after 1s to prevent infinite loading state
      const timer = setTimeout(() => setIsImageLoaded(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [data?.id, isOpen]); // Only reset when ID changes or opens

  const handleCardClick = () => {
    if (data) {
      if (onCardClick) {
        onCardClick(data.id);
      } else {
        router.push(`${basePath}/${data.id}`);
      }
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="fixed inset-0 z-40 overflow-y-auto cursor-none"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(12px)',
              }}
              onClick={onClose}
            >
              <div className="min-h-full flex items-center justify-center p-12 landscape:p-4 md:p-0">
                <motion.div
                  key={data.id} // Add key to force proper AnimatePresence behavior on ID change
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  onMouseLeave={() => setCursor('default')}
                  onMouseEnter={() => setCursor('label', 'open project')}
                  className={`
                relative flex flex-col landscape:flex-row md:flex-row 
                w-[60vw] h-[60vh] md:max-w-5xl
                overflow-hidden 
                bg-white 
                rounded-4xl md:rounded-4xl 
                cursor-none
              `}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick();
                  }}
                >
                  {/* Left Side - Image */}
                  <div className="relative w-full landscape:w-1/2 md:w-1/2 flex-1 landscape:flex-none md:flex-none min-h-0 landscape:h-full md:h-full bg-gray-100 group overflow-hidden">
                    {data.imageUrl ? (
                      <>
                        <Image
                          src={data.imageUrl}
                          alt={data.title}
                          fill
                          className={`object-cover z-10 group-hover:scale-105 transition-transform duration-700 ${
                            isImageLoaded ? 'opacity-100' : 'opacity-0'
                          } transition-opacity duration-500`}
                          sizes="(max-width: 768px) 100vw, 50vw"
                          onLoad={() => setIsImageLoaded(true)}
                          onError={() => setIsImageLoaded(true)} // Ensure placeholder clears even on error
                          priority
                          unoptimized={true} // Bypass Next.js image optimization
                        />
                        <div
                          className={`absolute inset-0 bg-gray-100 z-20 transition-all duration-700 group-hover:scale-105 ${
                            isImageLoaded
                              ? 'opacity-0 pointer-events-none'
                              : 'opacity-100'
                          }`}
                        />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <span className="text-gray-400">No Image</span>
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4 z-30 text-[10px] md:text-xs font-['Value_Serif'] font-medium text-[#0F2341]">
                      © tinysotiny.co. All rights reserved.
                    </div>
                  </div>

                  {/* Right Side - Content */}
                  <div className="flex w-full landscape:w-1/2 md:w-1/2 flex-col hover:bg-gray-50 transition-colors flex-none landscape:flex-none md:flex-none landscape:h-full md:h-full landscape:overflow-y-auto md:overflow-y-auto bg-white z-10">
                    {/* Top Section - Description */}
                    <div
                      className="flex-1 px-6 pt-3 pb-6 landscape:p-6 md:p-10 flex flex-col transition-colors duration-300 min-h-min relative"
                      style={{
                        backgroundColor: bgColor || '#E5E5E5',
                      }}
                    >
                      <div className="flex-1 flex flex-col justify-start md:justify-center">
                        {data.topLabel && (
                          <div className="mb-2 md:mb-4">
                            <span
                              className={`text-[10px] md:text-sm font-semibold uppercase tracking-wider ${
                                !fontColor ? 'text-gray-500' : ''
                              }`}
                              style={
                                fontColor
                                  ? { color: fontColor, opacity: 0.7 }
                                  : {}
                              }
                            >
                              {data.topLabel}
                            </span>
                          </div>
                        )}
                        <h2
                          className={`mb-2 md:mb-4 text-2xl md:text-4xl font-['Value_Serif'] font-medium leading-tight ${
                            !fontColor ? 'text-[#0F2341]' : ''
                          }`}
                          style={fontColor ? { color: fontColor } : {}}
                        >
                          {data.title}
                        </h2>
                        <p
                          className={`text-xs md:text-sm leading-relaxed max-w-md font-['Value_Sans'] font-normal line-clamp-5 md:line-clamp-6 text-ellipsis overflow-hidden ${
                            !fontColor ? 'text-[#0F2341]' : ''
                          }`}
                          style={
                            fontColor ? { color: fontColor, opacity: 0.9 } : {}
                          }
                        >
                          {data.description}
                        </p>

                        {/* Mobile: Tags moved here under description */}
                        <div className="mt-4 md:hidden landscape:hidden">
                          {/* Clone bottomContent but style it differently if needed, or assume it's just content */}
                          {/* We need to apply font color to children if possible, but they are ReactNodes. */}
                          {/* Assuming bottomContent is structured for styling or we wrap it */}
                          <div
                            style={
                              tagColor
                                ? { color: tagColor }
                                : fontColor
                                ? { color: fontColor }
                                : { color: '#0F2341' }
                            }
                          >
                            {data.bottomContent}
                          </div>
                        </div>
                      </div>

                      {/* Desktop: Tags moved here if showing second thumbnail */}
                      {showSecondThumbnail && data.tags && (
                        <ul className="hidden landscape:flex md:flex flex-wrap gap-x-4 gap-y-2 mt-8 md:mt-0 pt-4 p-0 list-none shrink-0">
                          {data.tags.map((tag, index) => (
                            <li
                              key={index}
                              className={`flex items-center leading-none text-xs font-['Value_Sans'] font-normal uppercase tracking-wide transition-colors ${
                                !tagColor && !fontColor
                                  ? 'text-[#B6B6B6]'
                                  : 'text-current'
                              }`}
                              style={
                                tagColor
                                  ? { color: tagColor }
                                  : fontColor
                                  ? { color: fontColor }
                                  : {}
                              }
                            >
                              <div className="w-2 h-2 rounded-full bg-current mr-2 shrink-0 mb-0.5" />
                              {tag.display_name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Bottom Section - Tags/Points (Desktop Only) */}
                    <div
                      className={`hidden landscape:flex md:flex bg-white text-[#B6B6B6] ${
                        showSecondThumbnail
                          ? 'relative p-0'
                          : 'px-10 flex-col justify-center'
                      } min-h-[30%] overflow-hidden shrink-0`}
                    >
                      {showSecondThumbnail &&
                      data.thumbnails &&
                      data.thumbnails[1] ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={data.thumbnails[1]}
                            alt={data.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                            priority
                          />
                        </div>
                      ) : (
                        data.bottomContent
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
