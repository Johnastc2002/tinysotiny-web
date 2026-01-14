'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ContactData } from '@/types/about';

interface NavigationProps {
  contact?: ContactData | null;
}

interface NavigationItemProps {
  item: string;
  href: string;
  isActive: boolean;
  isHome: boolean;
  toggleMenu: () => void;
  pathname: string;
}

function NavigationItem({
  item,
  href,
  isActive,
  isHome,
  toggleMenu,
  pathname,
}: NavigationItemProps) {
  // Initialize expanded state to false to prevent auto-expansion
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (isHome) {
      e.preventDefault();
      // Always toggle expansion for home
      setIsExpanded(!isExpanded);
    } else {
      toggleMenu();
    }
  };

  // Only show submenu if expanded.
  const showSubmenu = isHome && isExpanded;

  return (
    <div className="flex flex-col landscape:flex-row lg:[@media(min-height:720px)]:flex-col landscape:items-baseline lg:[@media(min-height:720px)]:items-start items-start w-fit">
      <div className="relative">
        {isHome ? (
          <button
            onClick={handleClick}
            className={`text-4xl font-bold tracking-wider text-[#0F2341] transition-colors hover:text-gray-500 md:text-5xl landscape:text-3xl lg:[@media(min-height:720px)]:text-5xl! ${
              isActive ? 'font-serif' : ''
            }`}
            style={{
              fontFamily: isActive
                ? "'Value Serif', serif"
                : "'Value Sans', sans-serif",
              fontWeight: 500, // Medium weight
            }}
          >
            {item}
          </button>
        ) : (
          <Link
            href={href}
            className={`text-4xl font-bold tracking-wider text-[#0F2341] transition-colors hover:text-gray-500 md:text-5xl landscape:text-3xl lg:[@media(min-height:720px)]:text-5xl! ${
              isActive ? 'font-serif' : ''
            }`}
            onClick={toggleMenu}
            style={{
              fontFamily: isActive
                ? "'Value Serif', serif"
                : "'Value Sans', sans-serif",
              fontWeight: 500, // Medium weight
            }}
          >
            {item}
          </Link>
        )}

        {isActive && (
          <span className="absolute -top-2 -right-3 h-1.5 w-1.5 rounded-full bg-[#0F2341] lg:[@media(min-height:720px)]:-top-2 lg:[@media(min-height:720px)]:-right-4" />
        )}
      </div>

      {isHome && (
        <div
          className={`flex flex-col landscape:flex-row lg:[@media(min-height:720px)]:flex-col gap-2 landscape:gap-8 lg:[@media(min-height:720px)]:gap-2 pl-1 landscape:pl-12 lg:[@media(min-height:720px)]:pl-1 transition-all duration-300 ease-in-out overflow-hidden landscape:items-baseline lg:[@media(min-height:720px)]:items-start ${
            showSubmenu
              ? 'max-h-40 opacity-100 mt-4 landscape:mt-0 lg:[@media(min-height:720px)]:mt-4 landscape:max-w-[500px] lg:[@media(min-height:720px)]:max-w-none landscape:opacity-100 landscape:max-h-20 lg:[@media(min-height:720px)]:max-h-40'
              : 'max-h-0 opacity-0 mt-0 landscape:max-w-0 lg:[@media(min-height:720px)]:max-w-none landscape:max-h-20 lg:[@media(min-height:720px)]:max-h-0'
          }`}
        >
          {['work', 'play'].map((subItem) => {
            const isSubActive = pathname.startsWith(`/${subItem}`);
            return (
              <Link
                key={subItem}
                href={`/${subItem}`}
                onClick={toggleMenu}
                className={`text-2xl font-bold tracking-wider text-[#0F2341] transition-colors hover:text-gray-500 md:text-3xl landscape:text-xl lg:[@media(min-height:720px)]:text-3xl! ${
                  isSubActive ? 'font-serif' : ''
                }`}
                style={{
                  fontFamily: isSubActive
                    ? "'Value Serif', serif"
                    : "'Value Sans', sans-serif",
                  fontWeight: 500,
                }}
              >
                {subItem}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Navigation({ contact }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDarkPage = pathname === '/play' || pathname?.startsWith('/play/');

  // If we are on a project detail page (has ?project=...), we should NOT be in dark mode
  // The project detail page is always light/white background.
  // The 'isDarkPage' check above catches /play/* routes, but if the detail page is rendered via query params
  // on /play (e.g. /play?project=123), we need to override it.
  // Assuming the project detail view is rendered when 'project' param is present.
  const isProjectDetail = searchParams?.has('project');
  const shouldBeDark = isDarkPage && !isProjectDetail;

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Logo */}
      <Link
        href="/"
        className={`fixed z-[100] transition-all duration-300 ${
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{
          top: '2rem',
          left: '1.5rem',
          height: '3rem',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <img
          src="/logo.png"
          alt="Logo"
          style={{
            height: '38px',
            width: 'auto',
            filter: shouldBeDark ? 'brightness(0) invert(1)' : 'none',
          }}
        />
      </Link>

      {/* Glass Hamburger Button */}
      <button
        onClick={toggleMenu}
        style={{
          top: '2rem',
          right: '1.5rem',
          height: '3rem',
          width: '3rem',
        }}
        className={`fixed z-50 flex items-center justify-center rounded-full border border-white/40 bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20 shadow-lg ${
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="Open Menu"
      >
        <div className="flex flex-col" style={{ gap: '4px' }}>
          <span
            className={`h-0.5 w-5 rounded-full transition-colors ${
              shouldBeDark ? 'bg-white' : 'bg-[#B6B6B6]'
            }`}
          />
          <span
            className={`h-0.5 w-5 rounded-full transition-colors ${
              shouldBeDark ? 'bg-white' : 'bg-[#B6B6B6]'
            }`}
          />
        </div>
      </button>

      {/* Menu Overlay */}
      <div
        className={`fixed z-50 bg-white shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col ${
          isOpen
            ? 'translate-x-0'
            : 'translate-x-full landscape:translate-x-[calc(100%+2rem)] lg:[@media(min-height:720px)]:translate-x-[calc(100%+2rem)]'
        } inset-y-0 right-0 h-full w-full 
        landscape:top-4 landscape:bottom-4 landscape:right-4 landscape:left-4 landscape:w-auto landscape:h-auto landscape:rounded-3xl
        lg:[@media(min-height:720px)]:top-6! lg:[@media(min-height:720px)]:bottom-6! lg:[@media(min-height:720px)]:right-6! lg:[@media(min-height:720px)]:left-auto! lg:[@media(min-height:720px)]:w-[60%]! lg:[@media(min-height:720px)]:rounded-3xl! 
        overflow-hidden`}
      >
        {/* Close Button - Fixed relative to card */}
        <div
          className="absolute z-50 flex items-center justify-center 
          top-8 right-6
          lg:[@media(min-height:720px)]:top-8! lg:[@media(min-height:720px)]:right-6!"
        >
          <button
            onClick={toggleMenu}
            style={{
              height: '3rem',
              width: '3rem',
            }}
            className="flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors lg:[@media(min-height:720px)]:h-12! lg:[@media(min-height:720px)]:w-12!"
            aria-label="Close Menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="lg:[@media(min-height:720px)]:w-8! lg:[@media(min-height:720px)]:h-8!"
            >
              <path
                d="M18 6L6 18"
                stroke="#B6B6B6"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 6L18 18"
                stroke="#B6B6B6"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable Content Wrapper */}
        <div className="w-full h-full overflow-y-auto overflow-x-hidden relative flex flex-col">
          {/* Menu Items */}
          <div className="flex min-h-full flex-col justify-center landscape:justify-start landscape:pt-12 px-12 md:px-24 landscape:px-16 landscape:w-auto lg:[@media(min-height:720px)]:flex-none lg:[@media(min-height:720px)]:justify-center lg:[@media(min-height:720px)]:pt-0 lg:[@media(min-height:720px)]:w-full pb-16 landscape:pb-12 lg:[@media(min-height:720px)]:px-24! lg:[@media(min-height:720px)]:pb-24!">
            <nav className="flex flex-col gap-6 landscape:gap-4 lg:[@media(min-height:720px)]:gap-8!">
              {['HOME', 'ABOUT', 'CLIENT', 'DAILY'].map((item) => {
                const isHome = item === 'HOME';
                const href = isHome ? '/' : `/${item.toLowerCase()}`;
                const isHomeActive = ['/', '/work', '/play'].includes(pathname);
                const isActive = isHome
                  ? isHomeActive
                  : pathname.startsWith(href);

                return (
                  <NavigationItem
                    key={`${item}-${pathname}`}
                    item={item}
                    href={href}
                    isActive={isActive}
                    isHome={isHome}
                    toggleMenu={toggleMenu}
                    pathname={pathname}
                  />
                );
              })}
            </nav>
          </div>

          {/* Footer Items */}
          <div className="absolute bottom-0 left-0 w-full flex justify-between landscape:justify-end lg:[@media(min-height:720px)]:justify-between px-12 pb-12 md:px-24 landscape:px-16 landscape:pb-8 lg:[@media(min-height:720px)]:px-24! lg:[@media(min-height:720px)]:pb-16!">
            <Link
              href={contact?.instagram || 'https://instagram.com'}
              className="text-xs font-semibold tracking-widest text-[#B6B6B6] hover:text-[#0F2341] transition-colors uppercase landscape:absolute landscape:left-[40%] lg:[@media(min-height:720px)]:static lg:[@media(min-height:720px)]:ml-0 lg:[@media(min-height:720px)]:text-sm!"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "'Value Sans', sans-serif",
                fontWeight: 500,
              }}
            >
              INSTAGRAM
            </Link>
            <div className="flex gap-6 lg:gap-8">
              <Link
                href={`mailto:${contact?.email || 'hello@tinysotiny.com'}`}
                className="text-xs font-semibold tracking-widest text-[#B6B6B6] hover:text-[#0F2341] transition-colors uppercase lg:[@media(min-height:720px)]:text-sm!"
                style={{
                  fontFamily: "'Value Sans', sans-serif",
                  fontWeight: 500,
                }}
              >
                EMAIL
              </Link>
              <Link
                href={`tel:${contact?.phone || '+85212345678'}`}
                className="text-xs font-semibold tracking-widest text-[#B6B6B6] hover:text-[#0F2341] transition-colors uppercase lg:[@media(min-height:720px)]:text-sm!"
                style={{
                  fontFamily: "'Value Sans', sans-serif",
                  fontWeight: 500,
                }}
              >
                PHONE
              </Link>
            </div>
          </div>
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
