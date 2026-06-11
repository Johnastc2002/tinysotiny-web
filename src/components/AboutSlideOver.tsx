'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Founder } from '@/types/about';

interface AboutSlideOverProps {
  founderImage?: string;
  founders?: Founder[];
}

export default function AboutSlideOver({
  founderImage,
  founders,
}: AboutSlideOverProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Backdrop - Only visible when open AND on desktop */}
      <div
        className={`fixed inset-0 bg-black/60 z-30 transition-opacity duration-700 hidden md:block ${
          isOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Card Container */}
      <div
        onClick={() => !isOpen && window.innerWidth >= 768 && setIsOpen(true)}
        className={`
            md:fixed md:top-1/2 md:right-0 md:-translate-y-1/2 z-40
            relative mt-16 mb-[50px] md:mt-0 md:mb-0 mx-auto
            w-[85vw] aspect-2/3 md:aspect-auto md:w-[85vw] md:max-w-none md:h-[85vh]
            bg-white rounded-3xl overflow-hidden
            flex flex-col md:flex-row
            transition-transform duration-700 ease-in-out
            ${
              isOpen
                ? 'md:translate-x-[calc(50%-50vw)]'
                : 'md:translate-x-[calc(100%-60px)] md:hover:translate-x-[calc(100%-70px)]'
            }
        `}
      >
        {/* Close Button - Visible when open (Desktop only) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
          className={`hidden md:block absolute top-6 right-6 z-50 text-white/80 hover:text-white transition-opacity duration-300 p-2 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Left Side - Image/Grey Area */}
        <div className="w-full md:w-1/2 flex-1 md:flex-none h-auto md:h-full relative bg-gray-200 min-h-0">
          {founderImage ? (
            <Image
              src={founderImage}
              alt="Founders"
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span
                className={`text-[#B6B6B6] font-medium transition-opacity duration-500 opacity-100 md:opacity-0 ${
                  isOpen ? 'md:opacity-100' : ''
                }`}
              >
                Founder Image
              </span>
            </div>
          )}
        </div>

        {/* Right Side - Info */}
        <div className="w-full md:w-1/2 h-auto md:h-full shrink-0 md:shrink-0 bg-[#0F2341] text-white p-6 pt-[50px] md:px-16 md:py-8 flex flex-col justify-center md:justify-start relative">
          {/* Desktop/tablet: free space splits ~3.6:1 above/below the text group
              (matching the design reference) and collapses before text can clip */}
          <div
            className="hidden md:block grow-[3.6] shrink basis-0 max-h-[400px]"
            aria-hidden="true"
          />
          <div
            className={`shrink-0 space-y-8 md:space-y-16 transition-opacity duration-700 delay-100 opacity-100 md:opacity-0 ${
              isOpen ? 'md:opacity-100' : ''
            }`}
          >
            <div className="text-xs md:text-sm font-medium tracking-[0.2em] uppercase opacity-70">
              <span className="font-['Value_Sans'] font-normal">
                Founder /{' '}
              </span>
              <span className="font-['Value_Serif'] font-medium">About Us</span>
            </div>

            <div className="space-y-2 md:space-y-5">
              {founders?.map((founder, index) => (
                <div key={index}>
                  <h3 className="font-['Value_Serif'] font-medium text-2xl md:text-[min(38px,4.8vh)] mb-1 md:mb-2 text-white">
                    {founder.name}
                  </h3>
                  <p className="text-xs md:text-base font-['Value_Sans'] font-normal opacity-80 tracking-wide">
                    {founder.role}
                  </p>
                </div>
              ))}

              {!founders?.length && (
                <>
                  <div>
                    <h3 className="font-['Value_Serif'] font-medium text-xl md:text-[min(38px,4.8vh)] mb-1 md:mb-2 text-white">
                      eddie li
                    </h3>
                    <p className="text-xs md:text-base font-['Value_Sans'] font-normal opacity-80 tracking-wide">
                      co-founder & photographer
                    </p>
                  </div>
                  <div>
                    <h3 className="font-['Value_Serif'] font-medium text-xl md:text-[min(38px,4.8vh)] mb-1 md:mb-2 text-white">
                      yin ip
                    </h3>
                    <p className="text-xs md:text-base font-['Value_Sans'] font-normal opacity-80 tracking-wide">
                      co-founder & art director
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Bottom share of the free space (~22%, per design reference) */}
          <div
            className="hidden md:block grow shrink basis-0"
            aria-hidden="true"
          />
        </div>
      </div>
    </>
  );
}
