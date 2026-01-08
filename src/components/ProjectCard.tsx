import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Project } from '@/types/project';
import { useRouter } from 'next/navigation';

interface ProjectCardProps {
  project: Project | null;
  onClose: () => void;
  isOpen: boolean;
}

export default function ProjectCard({
  project,
  onClose,
  isOpen,
}: ProjectCardProps) {
  const [isImageLoaded, setIsImageLoaded] = React.useState(false);
  const router = useRouter();

  // Reset loading state when project changes
  React.useEffect(() => {
    if (isOpen) {
      setIsImageLoaded(false);
    }
  }, [project, isOpen]);

  const handleCardClick = () => {
    if (project) {
      router.push(`/project/${project.id}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && project && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md cursor-pointer"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative flex h-[60vh] w-[80vw] max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl cursor-auto"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick(); // Navigate on click anywhere in card
            }}
          >
            {/* Left Side - Image */}
            <div className="relative w-1/2 h-full bg-gray-100 group">
              {project.thumbnails && project.thumbnails.length > 0 ? (
                <>
                  {!isImageLoaded && (
                    <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                  )}
                  <Image
                    src={project.thumbnails[0]}
                    alt={project.title}
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
            <div className="flex w-1/2 flex-col cursor-pointer hover:bg-gray-50 transition-colors">
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
                  {project.tags.map((tag, index) => (
                    <li
                      key={index}
                      className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wide"
                    >
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
