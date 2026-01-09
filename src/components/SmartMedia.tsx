import React, { useState } from 'react';
import Image from 'next/image';

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

  if (type === 'vimeo') {
    // Assuming url is a full vimeo url like https://vimeo.com/123456
    // We need to extract the ID for embedding
    const vimeoId = url.split('/').pop();
    
    const wrapperClasses = `relative ${className} ${fill ? 'w-full h-full' : ''}`;

    return (
      <div className={`${wrapperClasses} bg-black overflow-hidden`}>
        <div className="absolute top-1/2 left-1/2 w-[300%] h-[300%] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&loop=1&background=1&muted=1`}
            className="w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={alt}
            onLoad={() => setIsLoaded(true)}
          />
        </div>
        {!isLoaded && (
          <div className={`absolute inset-0 bg-gray-200 animate-pulse`} />
        )}
      </div>
    );
  }

  if (type === 'video') {
    const wrapperClasses = `relative ${className} ${fill ? 'w-full h-full' : ''}`;
    return (
      <div className={`${wrapperClasses} bg-gray-100 overflow-hidden`}>
        <video
          src={url}
          className="w-full h-full object-cover"
          style={{ objectFit: 'cover' }}
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setIsLoaded(true)}
        />
        {!isLoaded && (
          <div className={`absolute inset-0 bg-gray-200 animate-pulse`} />
        )}
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
