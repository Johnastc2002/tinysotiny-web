import React from 'react';
import Link from 'next/link';
import { getAboutUs, getContact } from '@/lib/contentful';
import AboutSlideOver from '@/components/AboutSlideOver';
import SloganHover from '@/components/SloganHover';

export const revalidate = 3600; // Revalidate every hour

export default async function About() {
  const [aboutUs, contact] = await Promise.all([getAboutUs(), getContact()]);

  return (
    <div className="min-h-screen w-full bg-[#fcfcfc] px-8 py-8 md:px-16 md:py-12">
      {/* Logo Spacer */}
      <div className="mb-20"></div>

      <main className="mx-auto max-w-7xl">
        {/* Header Label */}
        <div className="mb-12 text-sm font-['Value_Sans'] font-normal tracking-widest text-[#B6B6B6] uppercase">
          Who We Are /{' '}
          <span className="font-['Value_Serif'] font-medium">About Us</span>
        </div>

        <div className="grid gap-16 md:grid-cols-12 md:gap-8">
          {/* Main Title Section */}
          <div className="md:col-span-9">
            <SloganHover
              slogan={aboutUs?.slogan || ''}
              images={aboutUs?.sloganImages}
            />
            <p className="max-w-xl text-lg leading-relaxed text-[#0F2341] md:text-xl font-['Value_Sans'] font-normal">
              {aboutUs?.firstParagraph}
            </p>
          </div>

          <div className="md:col-span-3"></div>

          {/* Spacer - Increased vertical separation */}
          <div className="hidden md:col-span-5 md:block h-32 md:h-0"></div>

          {/* Secondary Content Section */}
          <div className="md:col-span-7 md:pr-16 pl-6 md:pl-0 mt-16 md:mt-32">
            <h2 className="mb-6 font-['Value_Sans'] font-medium italic text-3xl text-[#0F2341] md:text-4xl">
              {aboutUs?.header}
            </h2>
            <p className="mb-12 max-w-2xl text-base leading-relaxed text-[#0F2341] md:text-lg font-['Value_Sans'] font-normal">
              {aboutUs?.description2}
            </p>

            {/* Services List */}
            <div className="mb-20 grid grid-cols-2 gap-y-4 gap-x-8 md:gap-x-12">
              {aboutUs?.categories?.map((category, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="h-2 w-2 min-w-2 md:h-3 md:w-3 shrink-0 rounded-full bg-[#0F2341]"></span>
                  <span className="text-xs md:text-sm font-['Value_Sans'] font-normal tracking-widest text-[#0F2341] uppercase whitespace-nowrap">
                    {category}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer Links */}
            <div className="flex flex-row justify-between items-center w-full max-w-lg">
              {contact?.instagram && (
                <Link
                  href={contact.instagram}
                  className="text-sm font-['Value_Sans'] font-medium tracking-widest text-[#0F2341] uppercase hover:opacity-70"
                >
                  Instagram
                </Link>
              )}
              <div className="flex gap-8">
                {contact?.email && (
                  <Link
                    href={`mailto:${contact.email}`}
                    className="text-sm font-['Value_Sans'] font-medium tracking-widest text-[#0F2341] uppercase hover:opacity-70"
                  >
                    Email
                  </Link>
                )}
                {contact?.phone && (
                  <Link
                    href={`tel:${contact.phone}`}
                    className="text-sm font-['Value_Sans'] font-medium tracking-widest text-[#0F2341] uppercase hover:opacity-70"
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
  );
}
