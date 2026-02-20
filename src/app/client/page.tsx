import type { Viewport } from 'next';
import React from 'react';
// import Link from 'next/link';
import { getAllClients } from '@/lib/contentful';
import ClientList from '@/components/ClientList';

export const revalidate = 3600; // Revalidate every hour

export const viewport: Viewport = {
  themeColor: '#fcfcfc',
  viewportFit: 'cover',
};

export default async function Client() {
  const clients = await getAllClients();

  return (
    <div className="relative w-full min-h-[100dvh] bg-[#fcfcfc] overflow-hidden">
      <div className="fixed inset-0 w-full h-[100dvh] overflow-y-auto z-30 bg-[#fcfcfc]">
        <div
          className="w-full max-w-7xl mx-auto min-h-full flex flex-col px-8 md:px-16 pl-[calc(2rem+env(safe-area-inset-left))] pr-[calc(2rem+env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)]"
          style={{
            paddingTop: 'calc(6rem + env(safe-area-inset-top, 0px))',
          }}
        >
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
    </div>
  );
}
