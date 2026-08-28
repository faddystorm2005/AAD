'use client';

import { useEffect, useState } from 'react';

/**
 * True once the site footer is on screen.
 *
 * The floating CTAs (Install app, bottom-left; Book Now, bottom-right) are
 * position:fixed, so at the bottom of a page they sat on top of footer
 * content. The install button covered the "Formerly Austin Auto Detail."
 * line, which is the one piece of footer text returning customers look for.
 *
 * Both CTAs hide while the footer is in view and come back on scroll up.
 * Falls back to "not in view" wherever IntersectionObserver is missing, so
 * the buttons behave exactly as before rather than vanishing.
 */
export function useFooterInView(): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const el = document.getElementById('site-footer');
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => setInView(entries.some((e) => e.isIntersecting)),
      // Fire as soon as any sliver of the footer is up, not once it is half read.
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return inView;
}
