import React, { useState, useRef, useEffect, useId } from 'react';
import Image from 'next/image';
import Player from '@vimeo/player';
import { useVideoContext } from '@/context/VideoContext';
import LoadingSpinner from './LoadingSpinner';

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
  const [buttonConfig, setButtonConfig] = useState({
    size: 36, // default to large
    iconSize: 20,
    padding: 8,
    offset: 16,
    playButtonSize: 64, // default play button size
    playIconSize: 32, // default play icon size
  });
  const [shouldLoad, setShouldLoad] = useState(type !== 'vimeo'); // Default to load non-vimeo
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [videoActivated, setVideoActivated] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const controlTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef(0);

  const [iframeStyle, setIframeStyle] = useState<React.CSSProperties>({
    width: '100%',
    height: '100%',
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [vimeoIframe, setVimeoIframe] = useState<HTMLIFrameElement | null>(
    null
  );
  const vimeoPlayerRef = useRef<Player | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const id = useId();
  const maskId = `cc-mask-${id.replace(/:/g, '')}`;
  const { activeVideoId, playVideo, pauseVideo } = useVideoContext();

  // Helper to remove hover/transform effects when fullscreen
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

  useEffect(() => {
    // If not vimeo, ensure loaded immediately (in effect to avoid hydration mismatch if state differed)
    if (type !== 'vimeo') {
      setTimeout(() => setShouldLoad(true), 0);
      return;
    }

    if (shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [type, shouldLoad]);

  useEffect(() => {
    if (type === 'vimeo' && shouldLoad && !thumbnailUrl && !videoActivated) {
      // Fetch oEmbed thumbnail
      fetch(`https://vimeo.com/api/oembed.json?url=${url}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.thumbnail_url) {
            setThumbnailUrl(data.thumbnail_url);
          } else {
            setVideoActivated(true); // Fallback
          }
        })
        .catch(() => setVideoActivated(true)); // Fallback
    }
  }, [type, shouldLoad, url, thumbnailUrl, videoActivated]);

  // Effect to pause video if another video becomes active
  useEffect(() => {
    if (activeVideoId && activeVideoId !== id) {
      if (isPlaying) {
        if (type === 'vimeo' && vimeoPlayerRef.current) {
          vimeoPlayerRef.current.pause();
        } else if (type === 'video' && videoRef.current) {
          videoRef.current.pause();
        }
        // State update for isPlaying will happen via event listeners
        // setIsPlaying(false);
      }
    }
  }, [activeVideoId, id, isPlaying, type]);

  const setLoaded = React.useCallback(() => {
    setIsLoaded(true);
  }, []);

  // Check cached state for HTML5 video
  useEffect(() => {
    if (type === 'video' && videoRef.current) {
      if (videoRef.current.readyState >= 1) {
        // HAVE_METADATA - we can safely show it
        // Use timeout to push to next tick to avoid synchronous set state in effect warning if concurrent
        setTimeout(() => setLoaded(), 0);
      }
    }
  }, [type, setLoaded]);

  // Fallback to ensure video becomes visible even if events don't fire immediately
  useEffect(() => {
    // Only apply fallback for HTML5 video.
    // For Vimeo, we rely on the 'loaded' event or safety timer.
    if (type === 'video') {
      const timer = setTimeout(() => {
        setLoaded();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [type, setLoaded]);

  const updateIframeDimensions = React.useCallback(
    (videoW: number, videoH: number) => {
      if (!containerRef.current) return;

      const { clientWidth: containerW, clientHeight: containerH } =
        containerRef.current;

      // If container has no dimensions yet, stick to 100% to ensure visibility
      if (!containerW || !containerH) {
        setIframeStyle({
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: '0',
          left: '0',
        });
        return;
      }

      if (!videoW || !videoH) {
        // Fallback if video dimensions are missing
        setIframeStyle({
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: '0',
          left: '0',
        });
        return;
      }

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
        ((vimeoIframe && fsElement === vimeoIframe) ||
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
  }, [vimeoIframe]);

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
    if (!videoActivated) {
      setVideoActivated(true);

      // Try to play immediately if player is ready (critical for iOS sound)
      if (vimeoPlayerRef.current) {
        try {
          await vimeoPlayerRef.current.setMuted(false);
          await vimeoPlayerRef.current.setVolume(1);
          await vimeoPlayerRef.current.play();
          playVideo(id);
        } catch (e) {
          console.warn('Vimeo manual play failed:', e);
        }
      }
      return;
    }

    if (!vimeoPlayerRef.current) return;

    const paused = await vimeoPlayerRef.current.getPaused();
    if (paused) {
      try {
        await vimeoPlayerRef.current.setMuted(false);
        await vimeoPlayerRef.current.setVolume(1);
        await vimeoPlayerRef.current.play();
        playVideo(id);
      } catch (e) {
        console.warn('Vimeo play failed:', e);
      }
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
      const fsElement =
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement: Element })
          .webkitFullscreenElement;

      if (!fsElement) {
        // Try container fullscreen first (for custom controls)
        const element = containerRef.current as unknown as {
          requestFullscreen?: () => Promise<void>;
          webkitRequestFullscreen?: () => Promise<void>;
          mozRequestFullScreen?: () => Promise<void>;
          msRequestFullscreen?: () => Promise<void>;
        };

        const requestFS =
          element.requestFullscreen ||
          element.webkitRequestFullscreen ||
          element.mozRequestFullScreen ||
          element.msRequestFullscreen;

        if (requestFS) {
          requestFS
            .call(element)
            .catch((err: Error) =>
              console.error('Error enabling full-screen mode:', err)
            );
        } else {
          // Fallback to Vimeo native fullscreen (e.g. iOS Safari)
          if (vimeoPlayerRef.current) {
            vimeoPlayerRef.current.requestFullscreen().catch((e) => {
              console.warn('Vimeo fullscreen request failed:', e);
            });
          }
        }
      } else {
        // Exit fullscreen
        const doc = document as unknown as {
          exitFullscreen?: () => Promise<void>;
          webkitExitFullscreen?: () => Promise<void>;
          mozCancelFullScreen?: () => Promise<void>;
          msExitFullscreen?: () => Promise<void>;
        };

        const exitFS =
          doc.exitFullscreen ||
          doc.webkitExitFullscreen ||
          doc.mozCancelFullScreen ||
          doc.msExitFullscreen;

        if (exitFS) {
          exitFS.call(doc).catch((err: Error) => console.error(err));
        }
      }
    } else if (vimeoPlayerRef.current) {
      // Fallback if no container ref
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
        setTimeout(() => setIsLoaded(true), 0);
      }
    }
  }, [type]);

  useEffect(() => {
    if (type === 'vimeo' && vimeoIframe) {
      const player = new Player(vimeoIframe);
      vimeoPlayerRef.current = player;

      // Ensure state matches player
      player.on('play', () => {
        setIsPlaying(true);
        setHasStarted(true);
      });
      player.on('pause', () => setIsPlaying(false));
      player.on('timeupdate', (data) => setCurrentTime(data.seconds));
      player.on('durationchange', (data) => setDuration(data.duration));
      player.getDuration().then((d) => setDuration(d));
      player.getTextTracks().then((tracks) => {
        setHasCaptions(tracks && tracks.length > 0);
        setTextTracks(tracks || []);
      });

      // Initialize player and handle loading state
      const handleReady = () => {
        // Debounce or delay slightly to avoid sync updates during render phase of player
        setTimeout(() => setLoaded(), 0);
      };

      // Listen for the loaded event (normal flow)
      player.on('loaded', handleReady);
      // Also listen for play/timeupdate in case loaded doesn't fire but video starts
      player.on('play', handleReady);
      player.on('timeupdate', handleReady);

      // Attempt initialization
      player
        .ready()
        .then(() => {
          // Player is ready, try to get dimensions to set correct aspect ratio
          // But do NOT block showing the video on this
          Promise.all([player.getVideoWidth(), player.getVideoHeight()])
            .then(([w, h]) => {
              updateIframeDimensions(w, h);
            })
            .catch((e) => {
              console.warn('Failed to get Vimeo dimensions', e);
              updateIframeDimensions(16, 9);
            });
        })
        .catch((e) => {
          console.warn('Vimeo player failed to initialize:', e);
        });

      // Safety fallback: force show after 1.5 seconds to prevent "forever loading"
      // This is short enough to feel like a "long load" but not "broken"
      // We rely on this timer OR the loaded event OR the onLoad callback.
      const safetyTimer = setTimeout(() => {
        setIsLoaded(true);
      }, 1500);

      return () => {
        clearTimeout(safetyTimer);
        player.destroy();
      };
    }
  }, [type, url, updateIframeDimensions, vimeoIframe, setLoaded]);

  // Effect to trigger play when video is activated (user click)
  useEffect(() => {
    if (type === 'vimeo' && vimeoPlayerRef.current && videoActivated) {
      // Ensure volume is on (fallback if toggleVimeo didn't catch it)
      vimeoPlayerRef.current.setMuted(false).catch(() => {});
      vimeoPlayerRef.current.setVolume(1).catch(() => {});

      vimeoPlayerRef.current
        .play()
        .then(() => {
          playVideo(id);
        })
        .catch((e) => {
          console.warn('Auto-play failed:', e);
        });
    }
  }, [videoActivated, type, playVideo, id]);

  // Resize observer to update dimensions on window resize
  useEffect(() => {
    // Only needed for video types that use buttonConfig or iframe resizing
    if (type === 'image') return;

    if (containerRef.current) {
      const update = () => {
        if (containerRef.current) {
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          const minDim = Math.min(width, height);

          // Proportional calculation for Fullscreen Button: 15% of the shortest side
          // Clamped between 24px (small) and 48px (large)
          const size = Math.max(24, Math.min(48, minDim * 0.15));
          const padding = size * 0.25; // 25% of size
          const iconSize = size * 0.5; // 50% of size
          const offset = size * 0.25; // Offset from edge

          // Proportional calculation for Play Button: 25% of the shortest side
          // Clamped between 48px (small) and 96px (large)
          const playButtonSize = Math.max(48, Math.min(96, minDim * 0.25));
          const playIconSize = playButtonSize * 0.5; // 50% of button size

          setButtonConfig({
            size,
            padding,
            iconSize,
            offset,
            playButtonSize,
            playIconSize,
          });
        }

        if (type === 'vimeo' && vimeoPlayerRef.current) {
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
  }, [type, isFullscreen, updateIframeDimensions, setLoaded]); // Add isFullscreen dependency

  if (type === 'vimeo') {
    // Assuming url is a full vimeo url like https://vimeo.com/123456
    // We need to extract the ID for embedding
    const vimeoId = url.split('/').pop();

    const wrapperClasses = `relative ${fill ? 'w-full h-full' : ''} ${
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
        {!shouldLoad ? (
          <div className="absolute inset-0 bg-gray-200" />
        ) : (
          <>
            {(videoActivated || (shouldLoad && type === 'vimeo')) && (
              <div
                className={`absolute inset-0 transition-opacity duration-1500 ease-in-out ${activeClassName.replace(
                  'hover:',
                  'group-hover:'
                )} ${
                  isLoaded && videoActivated ? 'opacity-100' : 'opacity-0'
                } pointer-events-none`}
              >
                <iframe
                  ref={setVimeoIframe}
                  src={`https://player.vimeo.com/video/${vimeoId}?autoplay=0&loop=1&controls=0&muted=0&title=0&byline=0&portrait=0&playsinline=1`}
                  style={{
                    ...iframeStyle,
                    minWidth: '100%',
                    minHeight: '100%',
                    pointerEvents: 'none',
                  }}
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title={alt}
                  onLoad={setLoaded}
                />
              </div>
            )}

            {thumbnailUrl && (!videoActivated || !isLoaded) && (
              <div className="absolute inset-0 pointer-events-none">
                <Image
                  src={thumbnailUrl}
                  alt={alt}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Fullscreen Custom Controls */}
            {isFullscreen && (
              <div
                className={`fixed bottom-0 left-0 right-0 w-full z-50 px-4 md:px-8 py-6 bg-linear-to-t from-black/80 via-black/40 to-transparent flex items-center gap-4 transition-opacity duration-300 ${
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
                  <>
                    <button
                      onClick={toggleCaptions}
                      className={`flex-none focus:outline-none transition-transform hover:scale-110 flex items-center justify-center`}
                      aria-label="Toggle Captions"
                    >
                      <svg
                        width="26"
                        height="20"
                        viewBox="0 0 26 20"
                        className="block"
                      >
                        {captionsEnabled ? (
                          <>
                            <defs>
                              <mask id={maskId}>
                                <rect width="26" height="20" fill="white" />
                                <text
                                  x="50%"
                                  y="52%"
                                  dominantBaseline="central"
                                  textAnchor="middle"
                                  className="font-['Value_Sans'] font-bold text-[9px] tracking-tight"
                                  fill="black"
                                >
                                  CC
                                </text>
                              </mask>
                            </defs>
                            <rect
                              width="26"
                              height="20"
                              rx="3"
                              fill="white"
                              mask={`url(#${maskId})`}
                            />
                          </>
                        ) : (
                          <>
                            <rect
                              x="0.75"
                              y="0.75"
                              width="24.5"
                              height="18.5"
                              rx="2.25"
                              stroke="white"
                              strokeOpacity="0.6"
                              strokeWidth="1.5"
                              fill="none"
                            />
                            <text
                              x="50%"
                              y="52%"
                              dominantBaseline="central"
                              textAnchor="middle"
                              className="font-['Value_Sans'] font-bold text-[9px] tracking-tight"
                              fill="white"
                              fillOpacity="0.6"
                            >
                              CC
                            </text>
                          </>
                        )}
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
                  </>
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
              className={`absolute inset-0 flex items-center justify-center pointer-events-none ${
                !videoActivated ||
                (!isLoaded && videoActivated) ||
                (isLoaded &&
                  videoActivated &&
                  !isPlaying &&
                  hasStarted &&
                  !isFullscreen)
                  ? 'opacity-100'
                  : 'opacity-0'
              }`}
            >
              {videoActivated && !isLoaded ? (
                // Loading Indicator
                <div
                  className="rounded-full relative z-10 flex items-center justify-center"
                  style={{
                    width: `${buttonConfig.playButtonSize}px`,
                    height: `${buttonConfig.playButtonSize}px`,
                  }}
                >
                  <LoadingSpinner size={buttonConfig.playIconSize} />
                </div>
              ) : (
                <div
                  className="bg-black/30 rounded-full backdrop-blur-sm relative z-10 flex items-center justify-center"
                  style={{
                    width: `${buttonConfig.playButtonSize}px`,
                    height: `${buttonConfig.playButtonSize}px`,
                  }}
                >
                  {!isPlaying ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="white"
                      style={{
                        width: `${buttonConfig.playIconSize}px`,
                        height: `${buttonConfig.playIconSize}px`,
                      }}
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
                      style={{
                        width: `${buttonConfig.playIconSize}px`,
                        height: `${buttonConfig.playIconSize}px`,
                      }}
                    >
                      <path
                        fillRule="evenodd"
                        d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              )}
            </div>

            {/* Fullscreen Button - Only show if NOT fullscreen (as we have it in bar) */}
            {!isFullscreen && (
              <div
                className={`absolute z-30 transition-opacity duration-300 ${
                  isLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  bottom: `${buttonConfig.offset}px`,
                  right: `${buttonConfig.offset}px`,
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFullscreen();
                  }}
                  className={`bg-black/30 rounded-full backdrop-blur-sm hover:bg-black/50 transition-colors pointer-events-auto flex items-center justify-center`}
                  style={{
                    width: `${buttonConfig.size}px`,
                    height: `${buttonConfig.size}px`,
                    padding: `${buttonConfig.padding}px`,
                  }}
                  aria-label="Fullscreen"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="white"
                    style={{
                      width: `${buttonConfig.iconSize}px`,
                      height: `${buttonConfig.iconSize}px`,
                    }}
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
              className={`absolute inset-0 bg-gray-200 transition-opacity duration-1500 ease-in-out pointer-events-none ${
                isLoaded || thumbnailUrl ? 'opacity-0' : 'opacity-100'
              }`}
            />
          </>
        )}
      </div>
    );
  }

  if (type === 'video') {
    const wrapperClasses = `relative ${fill ? 'w-full h-full' : ''}`;
    const videoSrc = url.includes('#') ? url : `${url}#t=0.001`;

    return (
      <div
        ref={containerRef} // Add ref here so handleFullscreen works for video type
        className={`${wrapperClasses} bg-gray-100 overflow-hidden cursor-pointer group`}
        onClick={toggleVideo}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          className={`w-full h-full object-cover transition-opacity duration-1500 ease-in-out ${activeClassName.replace(
            'hover:',
            'group-hover:'
          )} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ objectFit: 'cover' }}
          loop
          playsInline
          preload="auto"
          onLoadedMetadata={() => setIsLoaded(true)}
          onLoadedData={() => setIsLoaded(true)}
          onCanPlay={() => setIsLoaded(true)}
          onPlay={() => {
            setIsPlaying(true);
            setHasStarted(true);
          }}
          onPause={() => setIsPlaying(false)}
        />

        {/* Play/Pause Overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center pointer-events-none ${
            !isPlaying && isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div
            className="bg-black/30 rounded-full backdrop-blur-sm flex items-center justify-center"
            style={{
              width: `${buttonConfig.playButtonSize}px`,
              height: `${buttonConfig.playButtonSize}px`,
            }}
          >
            {!isPlaying ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="white"
                style={{
                  width: `${buttonConfig.playIconSize}px`,
                  height: `${buttonConfig.playIconSize}px`,
                }}
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
                style={{
                  width: `${buttonConfig.playIconSize}px`,
                  height: `${buttonConfig.playIconSize}px`,
                }}
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
          className={`absolute inset-0 bg-gray-200 transition-opacity duration-1500 ease-in-out pointer-events-none ${
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
        className={`transition-opacity duration-1500 ease-in-out ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } object-cover`}
        onLoad={setLoaded}
        priority={priority}
        sizes={sizes}
      />
      {!isLoaded && (
        <div className={`absolute inset-0 bg-gray-200 animate-pulse`} />
      )}
    </div>
  );
}
