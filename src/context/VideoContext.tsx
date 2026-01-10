'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

interface VideoContextType {
  activeVideoId: string | null;
  registerVideo: (id: string) => void;
  playVideo: (id: string) => void;
  pauseVideo: () => void;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export const VideoProvider = ({ children }: { children: ReactNode }) => {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  // No-op for now, but could be used to track available videos
  const registerVideo = useCallback((id: string) => {}, []);

  const playVideo = useCallback((id: string) => {
    setActiveVideoId(id);
  }, []);

  const pauseVideo = useCallback(() => {
    setActiveVideoId(null);
  }, []);

  return (
    <VideoContext.Provider
      value={{ activeVideoId, registerVideo, playVideo, pauseVideo }}
    >
      {children}
    </VideoContext.Provider>
  );
};

export const useVideoContext = () => {
  const context = useContext(VideoContext);
  if (context === undefined) {
    throw new Error('useVideoContext must be used within a VideoProvider');
  }
  return context;
};
