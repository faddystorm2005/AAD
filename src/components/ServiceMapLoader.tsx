'use client';

import dynamic from 'next/dynamic';

const ServiceMap = dynamic(() => import('./ServiceMap'), {
  ssr: false,
  loading: () => (
    <div className="h-80 w-full animate-pulse rounded-2xl border border-white/10 bg-zinc-900 sm:h-96" />
  ),
});

export default function ServiceMapLoader() {
  return <ServiceMap />;
}
