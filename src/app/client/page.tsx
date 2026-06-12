import React from 'react';
// import Link from 'next/link';
import { getClientPageClients } from '@/lib/contentful';
import ClientList from '@/components/ClientList';

export const revalidate = 300; // Revalidate every 5 minutes

// theme-color is managed client-side by ThemeColorManager (single owner);
// viewport-fit=cover comes from the root layout's viewport export.

export default async function Client() {
  const clients = await getClientPageClients();

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

        {/* Vertical Spacer (~1/3 screen height, pulled up per design feedback) */}
        <div
          className="w-full h-[max(24px,calc(33vh-130px))] md:h-[max(24px,calc(33vh-250px))]"
          aria-hidden="true"
        />

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
