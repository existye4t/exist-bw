import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../useI18n';
import { toGrayscale } from '../utils/grayscale';
import type { Adjustments } from '../types';

interface CompareSliderProps {
  beforeUrl: string;
  adjustments: Adjustments;
  alt: string;
}

// The original sits on the left of the divider, the adjusted result on the
// right. The result is painted straight onto a canvas from cached pixels, so a
// slider move shows up on the same frame instead of waiting for an encode.
export const CompareSlider: React.FC<CompareSliderProps> = ({ beforeUrl, adjustments, alt }) => {
  const { t } = useI18n();
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<ImageData | null>(null);
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

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const maxEdge = 1400;
      const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
      const width = Math.max(1, Math.round(img.naturalWidth * scale));
      const height = Math.max(1, Math.round(img.naturalHeight * scale));
      const scratch = document.createElement('canvas');
      scratch.width = width;
      scratch.height = height;
      const ctx = scratch.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, width, height);
      sourceRef.current = ctx.getImageData(0, 0, width, height);
      paint(adjustments);
    };
    img.src = beforeUrl;
    return () => {
      cancelled = true;
    };
    // The pixels are read once per image; adjustments repaint below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beforeUrl]);

  const paint = useCallback((applied: Adjustments) => {
    const source = sourceRef.current;
    const canvas = canvasRef.current;
    if (!source || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (canvas.width !== source.width) canvas.width = source.width;
    if (canvas.height !== source.height) canvas.height = source.height;
    const frame = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);
    toGrayscale(frame, applied);
    ctx.putImageData(frame, 0, 0);
  }, []);

  useEffect(() => {
    paint(adjustments);
  }, [adjustments, paint]);

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
        <img src={beforeUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-contain" draggable={false} />
      )}

      <div className="absolute inset-y-0 right-0 overflow-hidden" style={{ width: `${100 - position}%` }}>
        <canvas
          ref={canvasRef}
          aria-label={alt}
          className="absolute inset-y-0 right-0 h-full max-w-none object-contain"
          style={{ width: frameWidth || undefined }}
        />
      </div>

      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${position}%` }}>
        <div className="absolute inset-y-0 -translate-x-1/2 w-px bg-white/80" />
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/70 text-white backdrop-blur-sm">
          <span className="text-xs tracking-tighter">‹ ›</span>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 font-mono text-[10px] tracking-widest text-white/70 uppercase">
        {t('compare.original')}
      </div>
      <div className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1 font-mono text-[10px] tracking-widest text-white/70 uppercase">
        {t('compare.result')}
      </div>
    </div>
  );
};
