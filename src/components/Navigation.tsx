'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Glass Hamburger Button */}
      <button
        onClick={toggleMenu}
        className={`fixed top-8 right-8 z-50 flex h-20 w-20 items-center justify-center rounded-full border border-white/40 bg-white/10 backdrop-blur-xl transition-all hover:bg-white/20 shadow-lg ${
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="Open Menu"
      >
        <div className="flex flex-col gap-[6px]">
          <span className="h-0.5 w-8 bg-black rounded-full" />
          <span className="h-0.5 w-8 bg-black rounded-full" />
          <span className="h-0.5 w-8 bg-black rounded-full" />
        </div>
      </button>

      {/* Menu Overlay */}
      <div
        className={`fixed inset-y-0 right-0 z-50 h-full bg-white shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } w-full md:w-[40%] md:max-w-xl flex flex-col`}
      >
        {/* Close Button */}
        <div className="flex justify-end p-8">
          <button
            onClick={toggleMenu}
            className="flex h-16 w-16 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close Menu"
          >
             <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 6L6 18"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 6L18 18"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex flex-1 flex-col justify-center px-16 md:px-24">
          <nav className="flex flex-col gap-8">
            {['HOME', 'ABOUT', 'CLIENT', 'DAILY'].map((item) => (
              <Link
                key={item}
                href={`/${item.toLowerCase() === 'home' ? '' : item.toLowerCase()}`}
                className="text-4xl font-bold tracking-wider text-black transition-colors hover:text-gray-500 md:text-5xl"
                onClick={toggleMenu}
              >
                {item}
              </Link>
            ))}
          </nav>
        </div>

        {/* Footer Items */}
        <div className="flex justify-between px-16 pb-16 md:px-24">
          {['INSTAGRAM', 'EMAIL', 'PHONE'].map((item) => (
            <button
              key={item}
              className="text-sm font-semibold tracking-widest text-gray-400 hover:text-black transition-colors uppercase"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      
      {/* Backdrop for mobile/desktop to close when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity"
          onClick={toggleMenu}
        />
      )}
    </>
  );
}

