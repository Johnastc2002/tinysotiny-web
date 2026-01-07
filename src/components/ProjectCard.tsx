import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface BubbleData {
  id: number;
  position: [number, number, number];
  scale: number;
  imageUrl?: string;
  color?: string;
  type: 'image' | 'solid' | 'glass';
  link?: string;
  title?: string;
  description?: string;
  tags?: string[];
}

interface ProjectCardProps {
  data: BubbleData | null;
  onClose: () => void;
  isOpen: boolean;
}

export default function ProjectCard({ data, onClose, isOpen }: ProjectCardProps) {
  return (
    <AnimatePresence>
      {isOpen && data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative flex h-[60vh] w-[80vw] max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside card
          >
            {/* Left Side - Image */}
            <div className="relative w-1/2 h-full bg-gray-100">
              {data.imageUrl ? (
                <Image
                  src={data.imageUrl}
                  alt={data.title || 'Project Image'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <span className="text-gray-400">No Image</span>
                </div>
              )}
            </div>

            {/* Right Side - Content */}
            <div className="flex w-1/2 flex-col">
              {/* Top Section - Description */}
              <div className="flex-1 bg-[#E5E5E5] p-10 flex flex-col justify-center">
                <div className="mb-4">
                  <span className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                    CLIENT / lululemon HK
                  </span>
                </div>
                <h2 className="mb-4 text-4xl font-serif text-gray-800 leading-tight">
                  {data.title || 'lululemon HK Ambassadors'}
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed max-w-md">
                  {data.description ||
                    'This is work project full description within 50 words. Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam.'}
                </p>
              </div>

              {/* Bottom Section - Tags/Points */}
              <div className="bg-white p-10 flex flex-col justify-center min-h-[30%]">
                <ul className="space-y-3">
                  {(data.tags || [
                    'COMMERCIAL PHOTOGRAPHY',
                    'FASHION & BEAUTY  •  PORTRAIT',
                    'RETAIL & CONSUMER BRANDS',
                    'VIDEO & REELS',
                  ]).map((tag, index) => (
                    <li key={index} className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      <span className="mr-2 text-[10px]">◉</span> {tag}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
