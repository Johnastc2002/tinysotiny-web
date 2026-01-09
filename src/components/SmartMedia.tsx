import React, { useState, useRef, useEffect, useId } from 'react';
import Image from 'next/image';
import Player from '@vimeo/player';
import { useVideoContext } from '@/context/VideoContext';

interface VimeoTextTrack {
  language: string;
  kind: string;
  label: string;
  mode?: string;
}

interface MediaItemProps {
  url: string;
  type: 'image' | 'video' | 'vimeo';
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

export default function SmartMedia({
  url,
  type,
  alt,
  fill = false,
  width,
  height,
  className = '',
  priority = false,
  sizes,
}: MediaItemProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasCaptions, setHasCaptions] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [textTracks, setTextTracks] = useState<VimeoTextTrack[]>([]);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  // Track fullscreen changes to toggle overscan/pointer-events
  const [isFullscreen, setIsFullscreen] = useState(false);

  const controlTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef(0);

  const [iframeStyle, setIframeStyle] = useState<React.CSSProperties>({
    width: '100%',
    height: '100%',
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const vimeoIframeRef = useRef<HTMLIFrameElement>(null);
  const vimeoPlayerRef = useRef<Player | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const id = useId();
  const { activeVideoId, playVideo, pauseVideo } = useVideoContext();

  // Effect to pause video if another video becomes active
  useEffect(() => {
    if (activeVideoId && activeVideoId !== id) {
      // Pause this video because another one is active
      if (isPlaying) {
        if (type === 'vimeo' && vimeoPlayerRef.current) {
          vimeoPlayerRef.current.pause();
        } else if (type === 'video' && videoRef.current) {
          videoRef.current.pause();
        }
        setIsPlaying(false);
      }
    }
  }, [activeVideoId, id, isPlaying, type]);

  // Check cached state for HTML5 video
  useEffect(() => {
    if (type === 'video' && videoRef.current) {
      if (videoRef.current.readyState >= 1) {
        // HAVE_METADATA
        setIsLoaded(true);
      }
    }
  }, [type]);

  // Fallback to ensure video becomes visible even if events don't fire immediately
  useEffect(() => {
    if (type === 'video' || type === 'vimeo') {
      const timer = setTimeout(() => {
        setIsLoaded(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [type]);

  const updateIframeDimensions = React.useCallback(
    (videoW: number, videoH: number) => {
      if (!containerRef.current || !videoW || !videoH) return;

      const { clientWidth: containerW, clientHeight: containerH } =
        containerRef.current;

      const containerRatio = containerW / containerH;
      const videoRatio = videoW / videoH;

      // Calculate dimensions to cover the container (standard object-fit: cover logic)
      let coverWidth, coverHeight;

      if (containerRatio > videoRatio) {
        // Container is wider than video
        coverWidth = containerW;
        coverHeight = containerW / videoRatio;
      } else {
        // Container is taller than video
        coverHeight = containerH;
        coverWidth = containerH * videoRatio;
      }

      // Add vertical padding to the iframe to create black bars top/bottom where controls sit
      // Vimeo will center the video in this taller iframe.
      // By centering the iframe in our container, we crop these black bars (and the controls).
      // const VERTICAL_PADDING = 240; // No longer needed with controls=0
      const VERTICAL_PADDING = 0;

      setIframeStyle({
        width: `${coverWidth}px`,
        height: `${coverHeight + VERTICAL_PADDING}px`,
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
    },
    []
  );

  useEffect(() => {
    const handleFullscreenChange = () => {
      // Check if ANY element is fullscreen - if it is our iframe, great.
      // But more importantly, if we are fullscreen, we want to disable overscan.
      // Ideally we check if it is *this* element.
      // Since Vimeo requestFullscreen is on the iframe, checking document.fullscreenElement should work.
      const fsElement = document.fullscreenElement;
      if (
        fsElement &&
        ((vimeoIframeRef.current && fsElement === vimeoIframeRef.current) ||
          (containerRef.current && fsElement === containerRef.current))
      ) {
        setIsFullscreen(true);
        setShowControls(true);
      } else {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const showControlsTemporary = () => {
    setShowControls(true);
    if (controlTimeoutRef.current) clearTimeout(controlTimeoutRef.current);
    // If playing, hide after delay. If paused, keep them showing?
    // User said "when playing, the controls will fade away".
    if (isPlaying) {
      controlTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSubtitleMenu(false);
      }, 3000);
    }
  };

  const handleActivity = () => {
    // Only care if playing or in fullscreen where controls might be hidden
    if (isPlaying || isFullscreen) {
      showControlsTemporary();
    }
  };

  const toggleVimeo = async () => {
    if (!vimeoPlayerRef.current) return;

    const paused = await vimeoPlayerRef.current.getPaused();
    if (paused) {
      vimeoPlayerRef.current.play();
      playVideo(id); // Register this video as playing
    } else {
      vimeoPlayerRef.current.pause();
      if (activeVideoId === id) {
        pauseVideo(); // Clear active video if we are pausing the active one
      }
    }
    showControlsTemporary();
  };

  const handleContainerClick = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 200;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }

      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => console.error(err));
      }
    } else {
      // Single tap - wait to see if it becomes a double tap
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }

      clickTimeoutRef.current = setTimeout(() => {
        toggleVimeo();
        clickTimeoutRef.current = null;
      }, DOUBLE_TAP_DELAY);
    }
    lastTapRef.current = now;
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch((err) => {
          console.error('Error attempting to enable full-screen mode:', err);
          // Fallback to iframe fullscreen if container fails (though unlikely in modern browsers)
          if (vimeoPlayerRef.current) {
            vimeoPlayerRef.current.requestFullscreen().catch((e) => {
              console.warn('Vimeo fullscreen request failed:', e);
            });
          }
        });
      } else {
        document.exitFullscreen();
      }
    } else if (vimeoPlayerRef.current) {
      // Fallback
      vimeoPlayerRef.current.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (vimeoPlayerRef.current) {
      vimeoPlayerRef.current.setCurrentTime(time);
      setCurrentTime(time);
    }
  };

  const toggleCaptions = async () => {
    if (!vimeoPlayerRef.current) return;
    if (captionsEnabled) {
      vimeoPlayerRef.current.disableTextTrack();
      setCaptionsEnabled(false);
    } else {
      const tracks = await vimeoPlayerRef.current.getTextTracks();
      if (tracks && tracks.length > 0) {
        // Enable first track
        vimeoPlayerRef.current.enableTextTrack(
          tracks[0].language,
          tracks[0].kind
        );
        setCaptionsEnabled(true);
      }
    }
  };

  const toggleVideo = () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play();
      playVideo(id); // Register this video as playing
    } else {
      videoRef.current.pause();
      if (activeVideoId === id) {
        pauseVideo(); // Clear active video if we are pausing the active one
      }
    }
    setShowControls(true);
    setTimeout(() => setShowControls(false), 2000);
  };

  useEffect(() => {
    // If it's a contentful video, try to check if it's already ready (cached)
    if (type === 'video' && videoRef.current) {
      if (videoRef.current.readyState >= 1) {
        setIsLoaded(true);
      }
    }
  }, [type]);

  useEffect(() => {
    if (type === 'vimeo' && vimeoIframeRef.current) {
      const player = new Player(vimeoIframeRef.current);
      vimeoPlayerRef.current = player;

      // Ensure state matches player
      player.on('play', () => setIsPlaying(true));
      player.on('pause', () => setIsPlaying(false));
      player.on('timeupdate', (data) => setCurrentTime(data.seconds));
      player.on('durationchange', (data) => setDuration(data.duration));
      player.getDuration().then((d) => setDuration(d));
      player.getTextTracks().then((tracks) => {
        setHasCaptions(tracks && tracks.length > 0);
        setTextTracks(tracks || []);
      });

      player.on('loaded', async () => {
        setIsLoaded(true);
        // Calculate cover dimensions on load
        if (containerRef.current) {
          try {
            // Get intrinsic video dimensions from Vimeo
            const [videoWidth, videoHeight] = await Promise.all([
              player.getVideoWidth(),
              player.getVideoHeight(),
            ]);
            updateIframeDimensions(videoWidth, videoHeight);
          } catch (e) {
            console.error('Failed to get video dimensions', e);
            // Fallback to 16:9
            updateIframeDimensions(16, 9);
          }
        }
      });

      return () => {
        player.destroy();
      };
    }
  }, [type, url, updateIframeDimensions]);

  // Resize observer to update dimensions on window resize
  useEffect(() => {
    if (type === 'vimeo' && containerRef.current) {
      const update = () => {
        if (vimeoPlayerRef.current) {
          Promise.all([
            vimeoPlayerRef.current.getVideoWidth(),
            vimeoPlayerRef.current.getVideoHeight(),
          ])
            .then(([w, h]) => updateIframeDimensions(w, h))
            .catch(() => updateIframeDimensions(16, 9));
        }
      };

      const resizeObserver = new ResizeObserver(update);
      resizeObserver.observe(containerRef.current);
      // Also update immediately on fullscreen change
      update();

      return () => resizeObserver.disconnect();
    }
  }, [type, isFullscreen, updateIframeDimensions]); // Add isFullscreen dependency

  if (type === 'vimeo') {
    // Assuming url is a full vimeo url like https://vimeo.com/123456
    // We need to extract the ID for embedding
    const vimeoId = url.split('/').pop();

    // Remove hover/transform effects when fullscreen to prevent layout issues and padding errors
    const activeClassName = isFullscreen
      ? className
          .split(' ')
          .filter(
            (c) =>
              !c.includes('hover:') &&
              !c.includes('transition') &&
              !c.includes('duration') &&
              !c.includes('transform')
          )
          .join(' ')
      : className;

    const wrapperClasses = `relative ${activeClassName} ${
      fill ? 'w-full h-full' : ''
    } ${
      isFullscreen
        ? '!transform-none !transition-none !m-0 !p-0 !rounded-none select-none'
        : 'select-none'
    }`;

    return (
      <div
        ref={containerRef}
        className={`${wrapperClasses} bg-gray-100 overflow-hidden group cursor-pointer`}
        onClick={handleContainerClick}
        onMouseMove={handleActivity}
        onTouchStart={handleActivity}
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        <div
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } pointer-events-none`}
        >
          <iframe
            ref={vimeoIframeRef}
            src={`https://player.vimeo.com/video/${vimeoId}?autoplay=0&loop=1&controls=0&muted=0&title=0&byline=0&portrait=0`}
            style={iframeStyle}
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={alt}
          />
        </div>

        {/* Fullscreen Custom Controls */}
        {isFullscreen && (
          <div
            className={`fixed bottom-0 left-0 right-0 w-full z-50 px-4 md:px-8 py-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center gap-4 transition-opacity duration-300 ${
              showControls
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none'
            }`}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setShowControls(true)}
          >
            {/* Play/Pause Button */}
            <button
              onClick={toggleVimeo}
              className="flex-none text-white hover:text-gray-200 focus:outline-none transition-transform hover:scale-110"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-8 h-8"
                >
                  <path
                    fillRule="evenodd"
                    d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-8 h-8"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>

            {/* Timeline */}
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="grow min-w-0 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white hover:bg-white/50 transition-colors"
            />

            {/* Captions */}
            {hasCaptions && (
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleCaptions}
                  className={`flex-none hover:text-gray-200 focus:outline-none transition-transform hover:scale-110 flex items-center justify-center ${
                    captionsEnabled ? 'text-white' : 'text-white/60'
                  }`}
                  aria-label="Toggle Captions"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"
                    />
                  </svg>
                </button>

                <div className="relative flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSubtitleMenu(!showSubtitleMenu);
                      showControlsTemporary();
                    }}
                    className={`flex-none hover:text-gray-200 focus:outline-none transition-transform hover:scale-110 flex items-center justify-center ${
                      showSubtitleMenu ? 'text-white' : 'text-white/60'
                    }`}
                    aria-label="Subtitle Language"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S12 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S12 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                      />
                    </svg>
                  </button>
                  {showSubtitleMenu && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md rounded-lg p-2 min-w-[120px] flex flex-col gap-1 max-h-48 overflow-y-auto">
                      {textTracks.map((track, i) => (
                        <button
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (vimeoPlayerRef.current) {
                              vimeoPlayerRef.current.enableTextTrack(
                                track.language,
                                track.kind
                              );
                              setCaptionsEnabled(true);
                            }
                            setShowSubtitleMenu(false);
                            showControlsTemporary();
                          }}
                          className="text-white/80 hover:text-white text-sm py-1 px-2 text-left rounded hover:bg-white/10 whitespace-nowrap block w-full"
                        >
                          {track.label}
                        </button>
                      ))}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (vimeoPlayerRef.current) {
                            vimeoPlayerRef.current.disableTextTrack();
                            setCaptionsEnabled(false);
                          }
                          setShowSubtitleMenu(false);
                          showControlsTemporary();
                        }}
                        className="text-white/60 hover:text-white text-sm py-1 px-2 text-left rounded hover:bg-white/10 border-t border-white/10 mt-1 pt-2 block w-full"
                      >
                        Off
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Exit Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="flex-none text-white hover:text-gray-200 focus:outline-none transition-transform hover:scale-110"
              aria-label="Exit Fullscreen"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Play/Pause Overlay (Center) - Only show if NOT fullscreen */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${
            (!isPlaying || showControls) && isLoaded && !isFullscreen
              ? 'opacity-100'
              : 'opacity-0'
          }`}
        >
          <div className="bg-black/30 rounded-full p-4 backdrop-blur-sm relative z-10">
            {!isPlaying ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="white"
                className="w-8 h-8 md:w-12 md:h-12"
              >
                <path
                  fillRule="evenodd"
                  d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="white"
                className="w-8 h-8 md:w-12 md:h-12"
              >
                <path
                  fillRule="evenodd"
                  d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </div>

        {/* Fullscreen Button - Only show if NOT fullscreen (as we have it in bar) */}
        {!isFullscreen && (
          <div
            className={`absolute bottom-4 right-4 z-20 transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFullscreen();
              }}
              className="bg-black/30 rounded-full p-2 backdrop-blur-sm hover:bg-black/50 transition-colors pointer-events-auto"
              aria-label="Fullscreen"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="white"
                className="w-6 h-6"
              >
                <path
                  fillRule="evenodd"
                  d="M3.75 3.75v4.5a.75.75 0 01-1.5 0v-4.5A1.5 1.5 0 013.75 2.25h4.5a.75.75 0 010 1.5h-4.5zM21.75 3.75h-4.5a.75.75 0 010-1.5h4.5A1.5 1.5 0 0123.25 3.75v4.5a.75.75 0 01-1.5 0v-4.5zM3.75 20.25h4.5a.75.75 0 010 1.5h-4.5A1.5 1.5 0 012.25 20.25v-4.5a.75.75 0 011.5 0v4.5zM21.75 20.25v-4.5a.75.75 0 011.5 0v4.5A1.5 1.5 0 0121.75 23.25h-4.5a.75.75 0 010-1.5h4.5z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}

        <div
          className={`absolute inset-0 bg-gray-200 transition-opacity duration-700 ease-in-out pointer-events-none ${
            isLoaded ? 'opacity-0' : 'opacity-100'
          }`}
        />
      </div>
    );
  }

  if (type === 'video') {
    const wrapperClasses = `relative ${className} ${
      fill ? 'w-full h-full' : ''
    }`;
    const videoSrc = url.includes('#') ? url : `${url}#t=0.001`;

    return (
      <div
        className={`${wrapperClasses} bg-gray-100 overflow-hidden cursor-pointer group`}
        onClick={toggleVideo}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          className={`w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ objectFit: 'cover' }}
          loop
          playsInline
          preload="auto"
          onLoadedMetadata={() => setIsLoaded(true)}
          onLoadedData={() => setIsLoaded(true)}
          onCanPlay={() => setIsLoaded(true)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Play/Pause Overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${
            (!isPlaying || showControls) && isLoaded
              ? 'opacity-100'
              : 'opacity-0'
          }`}
        >
          <div className="bg-black/30 rounded-full p-4 backdrop-blur-sm">
            {!isPlaying ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="white"
                className="w-8 h-8 md:w-12 md:h-12"
              >
                <path
                  fillRule="evenodd"
                  d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="white"
                className="w-8 h-8 md:w-12 md:h-12"
              >
                <path
                  fillRule="evenodd"
                  d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </div>

        <div
          className={`absolute inset-0 bg-gray-200 transition-opacity duration-700 ease-in-out pointer-events-none ${
            isLoaded ? 'opacity-0' : 'opacity-100'
          }`}
        />
      </div>
    );
  }

  // Image handling with Fade-in effect
  const wrapperClasses = `relative ${className} ${fill ? 'w-full h-full' : ''}`;
  return (
    <div className={`${wrapperClasses} bg-gray-100 overflow-hidden`}>
      <Image
        src={url}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        className={`transition-opacity duration-700 ease-in-out ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } object-cover`}
        onLoad={() => setIsLoaded(true)}
        priority={priority}
        sizes={sizes}
      />
      {!isLoaded && (
        <div className={`absolute inset-0 bg-gray-200 animate-pulse`} />
      )}
    </div>
  );
}
