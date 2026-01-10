'use client';

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export interface DetailCardData {
  id: string;
  imageUrl?: string;
  title: string;
  description: string;
  topLabel: React.ReactNode;
  bottomContent: React.ReactNode;
  cardBgColor?: string;
  cardFontColor?: string;
}

interface DetailCardProps {
  data: DetailCardData | null;
  onClose: () => void;
  isOpen: boolean;
  basePath: string;
}

export default function DetailCard({
  data,
  onClose,
  isOpen,
  basePath,
}: DetailCardProps) {
  const [isImageLoaded, setIsImageLoaded] = React.useState(false);
  const router = useRouter();

  // Helper to ensure color has # if it's a hex code
  const formatColor = (c?: string) => {
    if (!c) return undefined;
    const clean = c.trim();
    if (/^[0-9A-Fa-f]{6}$/.test(clean)) return `#${clean}`;
    return clean;
  };

  const bgColor = data ? formatColor(data.cardBgColor) : undefined;
  const fontColor = data ? formatColor(data.cardFontColor) : undefined;

  // Reset loading state when data changes
  React.useEffect(() => {
    if (isOpen) {
      setIsImageLoaded(false);
    }
  }, [data, isOpen]);

  const handleCardClick = () => {
    if (data) {
      router.push(`${basePath}/${data.id}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 overflow-y-auto bg-black/20 backdrop-blur-md cursor-pointer"
          onClick={onClose}
        >
          <div className="min-h-full flex items-center justify-center p-12 md:p-0">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`
                relative flex flex-col md:flex-row 
                w-full md:w-[80vw] md:max-w-5xl md:h-[60vh]
                overflow-hidden 
                bg-white 
                rounded-4xl md:rounded-4xl 
                shadow-2xl cursor-auto
              `}
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
            >
              {/* Left Side - Image */}
              <div className="relative w-full md:w-1/2 h-[55vh] md:h-full bg-gray-100 group shrink-0">
                {data.imageUrl ? (
                  <>
                    {!isImageLoaded && (
                      <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                    )}
                    <Image
                      src={data.imageUrl}
                      alt={data.title}
                      fill
                      className={`object-cover transition-all duration-700 ${
                        isImageLoaded ? 'opacity-100' : 'opacity-0'
                      } group-hover:scale-105`}
                      sizes="(max-width: 768px) 100vw, 50vw"
                      onLoad={() => setIsImageLoaded(true)}
                    />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <span className="text-gray-400">No Image</span>
                  </div>
                )}
              </div>

              {/* Right Side - Content */}
              <div className="flex w-full md:w-1/2 flex-col cursor-pointer hover:bg-gray-50 transition-colors flex-1 md:h-auto overflow-y-auto md:overflow-hidden bg-white">
                {/* Top Section - Description */}
                <div
                  className="flex-1 p-10 md:p-10 flex flex-col justify-center transition-colors duration-300 min-h-min"
                  style={{
                    backgroundColor: bgColor || '#E5E5E5',
                  }}
                >
                  {data.topLabel && (
                    <div className="mb-4">
                      <span
                        className={`text-xs md:text-sm font-semibold uppercase tracking-wider ${
                          !fontColor ? 'text-gray-500' : ''
                        }`}
                        style={
                          fontColor ? { color: fontColor, opacity: 0.7 } : {}
                        }
                      >
                        {data.topLabel}
                      </span>
                    </div>
                  )}
                  <h2
                    className={`mb-4 text-3xl md:text-4xl font-serif leading-tight ${
                      !fontColor ? 'text-gray-800' : ''
                    }`}
                    style={fontColor ? { color: fontColor } : {}}
                  >
                    {data.title}
                  </h2>
                  <p
                    className={`text-sm leading-relaxed max-w-md line-clamp-3 md:line-clamp-none ${
                      !fontColor ? 'text-gray-600' : ''
                    }`}
                    style={fontColor ? { color: fontColor, opacity: 0.9 } : {}}
                  >
                    {data.description}
                  </p>

                  {/* Mobile: Tags moved here under description */}
                  <div className="mt-6 md:hidden">
                    {/* Clone bottomContent but style it differently if needed, or assume it's just content */}
                    {/* We need to apply font color to children if possible, but they are ReactNodes. */}
                    {/* Assuming bottomContent is structured for styling or we wrap it */}
                    <div style={fontColor ? { color: fontColor } : {}}>
                      {data.bottomContent}
                    </div>
                  </div>
                </div>

                {/* Bottom Section - Tags/Points (Desktop Only) */}
                <div className="hidden md:flex bg-white p-10 flex-col justify-center min-h-[30%]">
                  {data.bottomContent}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
