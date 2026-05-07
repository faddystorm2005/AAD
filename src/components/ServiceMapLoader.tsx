'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const ServiceMap = dynamic(() => import('./ServiceMap'), {
  ssr: false,
  loading: () => (
    <div className="h-80 w-full animate-pulse rounded-2xl border border-white/10 bg-zinc-900 sm:h-96" />
  ),
});

/**
 * Defers mounting ServiceMap (Leaflet + ~20 World Imagery map tiles)
 * until the contact section scrolls within 200px of the viewport.
 *
 * Previously the map dynamic-imported on hydration, which immediately
 * fired ~20 map-tile fetches that competed with the hero image for
 * mobile bandwidth. Lighthouse measured LCP at 8.8s and the network
 * waterfall showed tiles fighting the LCP candidate. Wrapping the
 * dynamic import in an IntersectionObserver lets the hero load
 * unimpeded; the map starts loading only when the user is about to
 * see it.
 */
export default function ServiceMapLoader() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setShouldMount(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldMount(true);
          obs.disconnect();
        }
      },
      { rootMargin: '200px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (shouldMount) return <ServiceMap />;

  // Same skeleton dimensions as the dynamic loading state above so there's
  // no layout shift when the map mounts.
  return (
    <div
      ref={sentinelRef}
      className="h-80 w-full animate-pulse rounded-2xl border border-white/10 bg-zinc-900 sm:h-96"
      aria-label="Service area map loading"
    />
  );
}
