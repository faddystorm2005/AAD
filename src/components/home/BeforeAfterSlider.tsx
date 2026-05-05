'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface BeforeAfterSliderProps {
  /**
   * Source path for the side-by-side composite image (before is on one half,
   * after is on the other). The slider crops the same image twice and
   * reveals more of one side as the user drags.
   */
  src: string;
  /** Caption shown beneath the slider, e.g. "Black hood, paint correction". */
  caption?: string;
  /**
   * Which half of the composite is the AFTER. Default 'right' (left=before,
   * right=after). Set 'left' for composites where the after is on the left
   * (e.g., the ceramic-coating water-beading shot where the protected side
   * is on the left).
   */
  afterSide?: 'left' | 'right';
  /** Aspect ratio of EACH half of the composite. Default 4/3. */
  aspect?: string;
}

/**
 * Drag the divider to reveal more before or more after. Built for
 * composite images that already contain both halves side by side: the
 * component crops the same image twice (once to each half) and animates
 * a clip-path on the after layer so the divider acts as a wipe.
 *
 * Pointer events handle mouse + touch in one path. touch-action: pan-y
 * on the slider keeps vertical scroll working when the user drags
 * horizontally on a phone.
 */
export default function BeforeAfterSlider({
  src,
  caption,
  afterSide = 'right',
  aspect = '4/3',
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const dragging = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPos(pct);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      updateFromClientX(e.clientX);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [updateFromClientX]);

  // Keyboard support: focus the handle and use arrow keys to nudge.
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      setPos((p) => Math.max(0, p - 5));
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      setPos((p) => Math.min(100, p + 5));
      e.preventDefault();
    }
  };

  // For composites where the AFTER is on the LEFT half, swap the layers
  // so the user's "drag right to reveal more" gesture still uncovers the
  // after. We do this by flipping which half each layer shows.
  const beforeBgPos = afterSide === 'right' ? '0% 50%' : '100% 50%';
  const afterBgPos = afterSide === 'right' ? '100% 50%' : '0% 50%';

  return (
    <figure className="ba-slider">
      <div
        ref={containerRef}
        className="ba-frame relative w-full select-none overflow-hidden rounded-2xl border border-white/10 bg-zinc-900"
        style={{ aspectRatio: aspect, touchAction: 'pan-y' }}
      >
        {/* Before layer: shows one half of the composite, full width. */}
        <div
          className="absolute inset-0 bg-no-repeat"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: '200% 100%',
            backgroundPosition: beforeBgPos,
          }}
          aria-hidden
        />
        {/* After layer: shows the other half, clipped to right of the
            slider position so the user reveals it by dragging. */}
        <div
          className="absolute inset-0 bg-no-repeat"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: '200% 100%',
            backgroundPosition: afterBgPos,
            clipPath: `inset(0 0 0 ${pos}%)`,
          }}
          aria-hidden
        />
        {/* Divider line + drag handle. role=slider so screen readers
            understand it; arrow keys nudge by 5%. */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Drag to compare before and after"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          onKeyDown={onKey}
          onPointerDown={(e) => {
            dragging.current = true;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            updateFromClientX(e.clientX);
          }}
          className="absolute top-0 z-10 h-full w-0.5 cursor-ew-resize bg-white shadow-[0_0_18px_rgba(214,32,48,0.55)]"
          style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-red-600 text-white shadow-[0_4px_18px_rgba(214,32,48,0.55)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 6l-6 6 6 6" />
              <path d="M15 6l6 6-6 6" />
            </svg>
          </div>
        </div>
        {/* Corner labels: Before is always left of the divider, After always right. */}
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
          Before
        </span>
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
          After
        </span>
      </div>
      {caption && (
        <figcaption className="mt-3 text-center text-sm text-gray-300">{caption}</figcaption>
      )}
    </figure>
  );
}
