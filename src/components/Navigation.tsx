'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ContactData } from '@/types/about';

interface NavigationProps {
  contact?: ContactData | null;
}

export default function Navigation({ contact }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isDarkPage = pathname === '/play';

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Glass Hamburger Button */}
      <button
        onClick={toggleMenu}
        style={{ top: '3rem', right: '1.5rem', height: '3rem', width: '3rem' }}
        className={`fixed z-50 flex items-center justify-center rounded-full border border-white/40 bg-white/10 backdrop-blur-xl transition-all hover:bg-white/20 shadow-lg ${
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="Open Menu"
      >
        <div className="flex flex-col" style={{ gap: '4px' }}>
          <span
            className={`h-0.5 w-5 rounded-full transition-colors ${
              isDarkPage ? 'bg-white' : 'bg-black'
            }`}
          />
          <span
            className={`h-0.5 w-5 rounded-full transition-colors ${
              isDarkPage ? 'bg-white' : 'bg-black'
            }`}
          />
        </div>
      </button>

      {/* Menu Overlay */}
      <div
        className={`fixed inset-y-0 right-0 z-50 h-full bg-white shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } w-full md:w-[40%] md:max-w-xl flex flex-col`}
      >
        {/* Close Button */}
        <div
          className="flex justify-end pb-8 pl-8"
          style={{ paddingTop: '3.5rem', paddingRight: '1rem' }}
        >
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
                href={`/${
                  item.toLowerCase() === 'home' ? '' : item.toLowerCase()
                }`}
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
          <Link
            href={contact?.instagram || 'https://instagram.com'}
            className="text-sm font-semibold tracking-widest text-gray-400 hover:text-black transition-colors uppercase"
            target="_blank"
            rel="noopener noreferrer"
          >
            INSTAGRAM
          </Link>
          <Link
            href={`mailto:${contact?.email || 'hello@tinysotiny.com'}`}
            className="text-sm font-semibold tracking-widest text-gray-400 hover:text-black transition-colors uppercase"
          >
            EMAIL
          </Link>
          <Link
            href={`tel:${contact?.phone || '+85212345678'}`}
            className="text-sm font-semibold tracking-widest text-gray-400 hover:text-black transition-colors uppercase"
          >
            PHONE
          </Link>
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
