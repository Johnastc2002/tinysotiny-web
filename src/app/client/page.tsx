import type { Viewport } from 'next';
import React from 'react';
// import Link from 'next/link';
import { getAllClients } from '@/lib/contentful';
import ClientList from '@/components/ClientList';

export const revalidate = 3600; // Revalidate every hour

export const viewport: Viewport = {
  themeColor: '#fcfcfc',
};

export default async function Client() {
  const clients = await getAllClients();

  return (
    <div className="min-h-screen w-full bg-[#fcfcfc] px-8 py-8 md:px-16 md:py-12 flex flex-col overflow-hidden pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] pl-[calc(2rem+env(safe-area-inset-left))] pr-[calc(2rem+env(safe-area-inset-right))] md:pt-[calc(3rem+env(safe-area-inset-top))]">
      {/* Logo Spacer */}
      <div className="mb-20"></div>

      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col">
        {/* Header Label */}
        <div className="text-sm font-['Value_Sans'] font-normal tracking-widest text-[#B6B6B6] uppercase">
          Who We Serve /{' '}
          <span className="font-['Value_Serif'] font-medium">Client</span>
        </div>

        {/* Vertical Spacer (~1/3 screen height) */}
        <div className="min-h-[200px] w-full h-[33vh]" aria-hidden="true" />

        {/* Client List */}
        <div className="flex-1 w-full flex items-start justify-start">
          <div className="w-full text-left">
            <ClientList clients={clients} />
          </div>
        </div>
      </div>
    </div>
  );
}
