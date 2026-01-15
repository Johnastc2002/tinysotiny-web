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
            relative mt-16 md:mt-0
            w-full md:max-w-6xl h-auto md:h-[85vh]
            bg-white rounded-3xl shadow-lg overflow-hidden
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
        <div className="w-full md:w-1/2 h-[400px] md:h-full relative bg-gray-200">
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
        <div className="w-full md:w-1/2 h-auto md:h-full bg-[#0F2341] text-white p-8 md:p-16 flex flex-col justify-center relative">
          <div
            className={`space-y-8 md:space-y-16 transition-opacity duration-700 delay-100 opacity-100 md:opacity-0 ${
              isOpen ? 'md:opacity-100' : ''
            }`}
          >
            <div className="text-xs font-medium tracking-[0.2em] uppercase opacity-70">
              <span className="font-['Value_Sans'] font-normal">
                Founder /{' '}
              </span>
              <span className="font-['Value_Serif'] font-medium">About Us</span>
            </div>

            <div className="space-y-8 md:space-y-12">
              {founders?.map((founder, index) => (
                <div key={index}>
                  <h3 className="font-['Value_Serif'] font-medium text-3xl md:text-6xl mb-2 md:mb-3 text-white">
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
                    <h3 className="font-['Value_Serif'] font-medium text-3xl md:text-6xl mb-2 md:mb-3 text-white">
                      eddie li
                    </h3>
                    <p className="text-xs md:text-base font-['Value_Sans'] font-normal opacity-80 tracking-wide">
                      co-founder & photographer
                    </p>
                  </div>
                  <div>
                    <h3 className="font-['Value_Serif'] font-medium text-3xl md:text-6xl mb-2 md:mb-3 text-white">
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
        </div>
      </div>
    </>
  );
}
