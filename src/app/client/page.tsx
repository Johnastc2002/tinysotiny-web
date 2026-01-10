import React from 'react';
// import Link from 'next/link';
import { getAllClients } from '@/lib/contentful';
import ClientList from '@/components/ClientList';

export const revalidate = 3600; // Revalidate every hour

export default async function Client() {
  const clients = await getAllClients();

  return (
    <div className="min-h-screen w-full bg-[#fcfcfc] px-8 py-8 md:px-16 md:py-12 flex flex-col">
      {/* Logo */}
      <div className="mb-20">
        {/* <Link
          href="/"
          className="text-4xl font-bold tracking-tighter text-[#0F2341]"
        >
          t.
        </Link> */}
      </div>

      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col">
        {/* Header Label */}
        <div className="text-sm font-medium tracking-widest text-[#B6B6B6] uppercase">
          Who We Serve / Client
        </div>

        {/* Vertical Spacer (~1/3 screen height) */}
        <div className="min-h-[200px] w-full h-[33vh]" aria-hidden="true" />

        {/* Client List */}
        <div className="flex-1 w-full flex items-start justify-start">
          <div className="w-full max-w-6xl text-left">
            <ClientList clients={clients} />
          </div>
        </div>
      </div>
    </div>
  );
}
