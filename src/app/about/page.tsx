import React from 'react';
import Link from 'next/link';
import { getAboutUs, getContact } from '@/lib/contentful';
import AboutSlideOver from '@/components/AboutSlideOver';

export const revalidate = 3600; // Revalidate every hour

export default async function About() {
  const [aboutUs, contact] = await Promise.all([getAboutUs(), getContact()]);

  return (
    <div className="min-h-screen w-full bg-[#fcfcfc] px-8 py-8 md:px-16 md:py-12">
      {/* Logo */}
      <div className="mb-20">
        <Link
          href="/"
          className="text-4xl font-bold tracking-tighter text-[#0F2341]"
        >
          t.
        </Link>
      </div>

      <main className="mx-auto max-w-7xl">
        {/* Header Label */}
        <div className="mb-12 text-sm font-medium tracking-widest text-gray-400 uppercase">
          Who We Are / About Us
        </div>

        <div className="grid gap-16 md:grid-cols-12 md:gap-8">
          {/* Main Title Section */}
          <div className="md:col-span-8">
            <h1 className="mb-8 font-serif text-6xl font-medium leading-tight text-[#0F2341] md:text-7xl lg:text-8xl">
              {aboutUs?.slogan || 'tiny details matter.'}
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-[#0F2341] md:text-xl">
              {aboutUs?.firstParagraph ||
                'tinysotiny is a creative studio based in Hong Kong, specializing in digital advertising production.'}
            </p>
          </div>

          <div className="md:col-span-4"></div>

          {/* Spacer */}
          <div className="hidden md:col-span-5 md:block"></div>

          {/* Secondary Content Section */}
          <div className="md:col-span-7 md:pr-32 pl-12 md:pl-0">
            <h2 className="mb-6 font-serif text-3xl italic text-[#0F2341] md:text-4xl">
              {aboutUs?.header || 'From statics to dynamics.'}
            </h2>
            <p className="mb-12 max-w-2xl text-base leading-relaxed text-[#0F2341] md:text-lg">
              {aboutUs?.description2 ||
                'Our refined expertise lies in amplifying the core brand narrative, encompassing commercial photography & videography, branding & identity, social media & digital experiences, and motion graphics.'}
            </p>

            {/* Services List */}
            <div className="mb-20 grid grid-cols-2 gap-y-4 gap-x-12">
              {aboutUs?.categories?.map((category, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-[#0F2341]"></span>
                  <span className="text-sm font-semibold tracking-widest text-[#0F2341] uppercase">
                    {category}
                  </span>
                </div>
              ))}
              {!aboutUs?.categories?.length && (
                <>
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-[#0F2341]"></span>
                    <span className="text-sm font-semibold tracking-widest text-[#0F2341] uppercase">
                      Photography
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-[#0F2341]"></span>
                    <span className="text-sm font-semibold tracking-widest text-[#0F2341] uppercase">
                      Motion Graphics
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-[#0F2341]"></span>
                    <span className="text-sm font-semibold tracking-widest text-[#0F2341] uppercase">
                      Videography
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-[#0F2341]"></span>
                    <span className="text-sm font-semibold tracking-widest text-[#0F2341] uppercase">
                      Branding
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Footer Links */}
            <div className="flex flex-row gap-8 md:gap-24">
              <Link
                href={contact?.instagram || 'https://instagram.com'}
                className="text-sm font-bold tracking-widest text-[#0F2341] uppercase hover:opacity-70"
              >
                Instagram
              </Link>
              <Link
                href={`mailto:${contact?.email || 'hello@tinysotiny.com'}`}
                className="text-sm font-bold tracking-widest text-[#0F2341] uppercase hover:opacity-70"
              >
                Email
              </Link>
              <Link
                href={`tel:${contact?.phone || '+85212345678'}`}
                className="text-sm font-bold tracking-widest text-[#0F2341] uppercase hover:opacity-70"
              >
                Phone
              </Link>
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
