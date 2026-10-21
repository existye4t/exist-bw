import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../useI18n';

interface CompareSliderProps {
  beforeUrl: string;
  afterUrl?: string;
  alt: string;
}

// Drag the divider to reveal the original against the black and white result.
// The converted image is rendered full width and clipped, so both sides stay
// pixel-aligned no matter where the divider sits.
export const CompareSlider: React.FC<CompareSliderProps> = ({ beforeUrl, afterUrl, alt }) => {
 const { t } = useI18n();
 const frameRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [frameWidth, setFrameWidth] = useState(0);
  const dragging = useRef(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => setFrameWidth(frame.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const updateFromPointer = useCallback((clientX: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    if (rect.width === 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, next)));
  }, []);

  useEffect(() => {
    const stop = () => {
      dragging.current = false;
    };
    const move = (event: PointerEvent) => {
      if (dragging.current) updateFromPointer(event.clientX);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
  }, [updateFromPointer]);

  return (
    <div
      ref={frameRef}
      className="relative w-full cursor-ew-resize overflow-hidden rounded-2xl bg-secondary select-none touch-none"
      style={{ aspectRatio: '16 / 10' }}
      onPointerDown={(event) => {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        updateFromPointer(event.clientX);
      }}
    >
      {beforeUrl && (
        <img src={beforeUrl} alt="" className="absolute inset-0 h-full w-full object-contain" draggable={false} />
      )}

      {afterUrl && (
        <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${position}%` }}>
          <img
            src={afterUrl}
            alt={alt}
            className="absolute inset-y-0 left-0 h-full max-w-none object-contain"
            style={{ width: frameWidth || undefined }}
            draggable={false}
          />
        </div>
      )}

      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${position}%` }}>
        <div className="absolute inset-y-0 -translate-x-1/2 w-px bg-white/80" />
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/70 text-white backdrop-blur-sm">
          <span className="text-xs tracking-tighter">‹ ›</span>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-white/70">
      {t('compare.original')}
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-white/70">
      {t('compare.result')}
      </div>
    </div>
  );
};
