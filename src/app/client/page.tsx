import React from 'react';
import Link from 'next/link';
import { getAllClients } from '@/lib/contentful';
import ClientList from '@/components/ClientList';

export const revalidate = 3600; // Revalidate every hour

export default async function Client() {
  const clients = await getAllClients();

  return (
    <div className="min-h-screen w-full bg-[#fcfcfc] px-8 py-8 md:px-16 md:py-12 flex flex-col">
      {/* Logo */}
      <div className="mb-20">
        <Link
          href="/"
          className="text-4xl font-bold tracking-tighter text-[#0F2341]"
        >
          t.
        </Link>
      </div>

      <main className="w-full max-w-7xl mx-auto flex-1 flex flex-col">
        {/* Header Label */}
        <div className="mb-12 text-sm font-medium tracking-widest text-gray-400 uppercase">
          Who We Serve / Client
        </div>

        {/* Client List */}
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-6xl text-center">
            <ClientList clients={clients} />
          </div>
        </div>
      </main>
    </div>
  );
}
