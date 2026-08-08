'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { useIsHydrated, usePrefersReducedMotion } from '@/lib/useBrowserState';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function TiltCard({ children, className = '', style }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Both hooks must be called unconditionally, so read them into locals
  // rather than short-circuiting with &&.
  const hydrated = useIsHydrated();
  const reducedMotion = usePrefersReducedMotion();
  // Stays off during SSR and for anyone who asked for reduced motion. Now
  // reacts if that OS setting is toggled while the page is open.
  const enabled = hydrated && !reducedMotion;

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * 20;
      const rotateX = (0.5 - py) * 20;
      el.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const onLeave = () => {
      el.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)';
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [enabled]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: enabled ? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
        willChange: enabled ? 'transform' : 'auto',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
