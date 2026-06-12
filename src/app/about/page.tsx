import React from 'react';
import Link from 'next/link';
import { getAboutUs, getContact } from '@/lib/contentful';
import AboutSlideOver from '@/components/AboutSlideOver';
import SloganHover from '@/components/SloganHover';

export const revalidate = 300; // Revalidate every 5 minutes

// theme-color is managed client-side by ThemeColorManager (single owner);
// viewport-fit=cover comes from the root layout's viewport export.

export default async function About() {
  const [aboutUs, contact] = await Promise.all([getAboutUs(), getContact()]);
  const whatsappHref = contact?.phone
    ? `https://wa.me/${contact.phone.replace(/\D/g, '')}`
    : null;

  return (
    <div className="relative w-full min-h-[100dvh] bg-[#fcfcfc] overflow-hidden">
      <div className="fixed inset-0 w-full h-[100dvh] overflow-y-auto z-30 bg-[#fcfcfc]">
        <main
          className="mx-auto max-w-7xl min-h-full px-8 md:px-16 pl-[calc(2rem+env(safe-area-inset-left))] pr-[calc(2rem+env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)] pt-[calc(6rem+env(safe-area-inset-top,0px))]"
        >
        {/* Header Label */}
        <div className="mb-[calc(3rem+100px)] md:mb-[calc(3rem+200px)] text-sm font-['Value_Sans'] font-normal tracking-widest text-[#B6B6B6] uppercase">
          Who We Are /{' '}
          <span className="font-['Value_Serif'] font-medium">About Us</span>
        </div>

        <div className="grid gap-6 md:grid-cols-12 md:gap-8">
          {/* Main Title Section */}
          <div className="md:col-span-9">
            <SloganHover
              slogan={aboutUs?.slogan || ''}
              images={aboutUs?.sloganImages}
            />
            <p className="max-w-xl text-base leading-[1.4] text-[#0F2341] font-['Value_Sans'] font-normal">
              {aboutUs?.firstParagraph}
            </p>
          </div>

          <div className="md:col-span-3"></div>

          {/* Spacer - Increased vertical separation */}
          <div className="hidden md:col-span-5 md:block h-32 md:h-0"></div>

          {/* Secondary Content Section */}
          <div className="md:col-span-7 md:pr-16 mt-8 md:mt-16">
            <h2 className="mb-2 md:mb-4 font-['Value_Sans'] font-medium italic text-2xl text-[#0F2341] md:text-3xl">
              {aboutUs?.header}
            </h2>
            <p className="mb-[30px] max-w-2xl text-base leading-[1.4] text-[#0F2341] font-['Value_Sans'] font-normal">
              {aboutUs?.description2}
            </p>

            {/* Services List */}
            <div className="mb-20 grid grid-cols-[repeat(2,minmax(min-content,0.45fr))] md:grid-cols-[repeat(2,minmax(min-content,0.25fr))] gap-y-1 md:gap-y-2 gap-x-2">
              {aboutUs?.categories?.map((category, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="h-2 w-2 min-w-2 md:h-3 md:w-3 shrink-0 rounded-full bg-[#0F2341]"></span>
                  <span className="text-xs leading-none font-['Value_Sans'] font-normal tracking-widest text-[#0F2341] uppercase whitespace-nowrap">
                    {category.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer Links */}
            <div className="flex flex-row justify-between items-center w-full max-w-[300px] md:max-w-lg md:mb-[150px]">
              {contact?.instagram && (
                <Link
                  href={contact.instagram}
                  className="text-xs md:text-sm font-['Value_Sans'] font-medium tracking-widest text-[#0F2341] uppercase hover:opacity-70"
                >
                  Instagram
                </Link>
              )}
              <div className="flex gap-8">
                {contact?.email && (
                  <Link
                    href={`mailto:${contact.email}`}
                    className="text-xs md:text-sm font-['Value_Sans'] font-medium tracking-widest text-[#0F2341] uppercase hover:opacity-70"
                  >
                    Email
                  </Link>
                )}
                {whatsappHref && (
                  <Link
                    href={whatsappHref}
                    className="text-xs md:text-sm font-['Value_Sans'] font-medium tracking-widest text-[#0F2341] uppercase hover:opacity-70"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Phone
                  </Link>
                )}
              </div>
            </div>
          </div>
          </div>
        </main>

        <AboutSlideOver
          founderImage={aboutUs?.founderImage}
          founders={aboutUs?.founders}
        />
      </div>
    </div>
  );
}
