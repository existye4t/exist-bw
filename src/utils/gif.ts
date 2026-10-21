// Animated GIF: decode every frame (gifuct-js), composite them the way a viewer
// would, convert each to grayscale, and re-encode (gifenc) keeping timing and loop.

import type { Adjustments } from '../types';
import { toGrayscale } from './grayscale';

export async function analyzeGif(buffer: ArrayBuffer): Promise<{ frameCount: number; isAnimated: boolean }> {
  try {
    const gifuct = await import('gifuct-js');
    const gif = gifuct.parseGIF(buffer);
    const frames = gifuct.decompressFrames(gif, false);
    const frameCount = frames?.length ?? 0;
    return { frameCount, isAnimated: frameCount > 1 };
  } catch {
    return { frameCount: 0, isAnimated: false };
  }
}

// Netscape loop count: 0 means forever. Absent extension also means forever.
function readLoopCount(buffer: ArrayBuffer): number {
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length - 19; i++) {
    const isNetscape =
      bytes[i] === 0x21 && bytes[i + 1] === 0xff && bytes[i + 2] === 0x0b &&
      bytes[i + 3] === 0x4e && bytes[i + 4] === 0x45 && bytes[i + 5] === 0x54 &&
      bytes[i + 6] === 0x53 && bytes[i + 7] === 0x43 && bytes[i + 8] === 0x41 &&
      bytes[i + 9] === 0x50 && bytes[i + 10] === 0x45;
    if (isNetscape && bytes[i + 13] === 0x03) {
      return bytes[i + 14] | (bytes[i + 15] << 8);
    }
  }
  return 0;
}

interface GifFrame {
  dims: { width: number; height: number; left: number; top: number };
  patch: Uint8ClampedArray;
  delay: number;
  disposalType: number;
  transparentIndex: number | null;
}

export async function convertAnimatedGif(
  buffer: ArrayBuffer,
  adjustments: Adjustments,
  onProgress?: (done: number, total: number) => void
): Promise<Blob> {
  const gifuct = await import('gifuct-js');
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');

  const gif = gifuct.parseGIF(buffer);
  const frames = gifuct.decompressFrames(gif, true) as GifFrame[];
  if (!frames?.length) throw new Error('No frames could be decoded from this GIF.');

  const width = gif.lsd.width;
  const height = gif.lsd.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get a canvas context.');

  // Snapshot taken before drawing a frame, restored when that frame disposes
  // back to the previous state (disposal type 3).
  let previous: ImageData | null = null;

  // Gray ramp plus one transparent entry. Index 0 stays the transparent color,
  // matching gifenc's default transparentIndex.
  const grayRamp: [number, number, number][] = [[0, 0, 0]];
  for (let i = 0; i < 255; i++) grayRamp.push([i, i, i]);

  const encode = GIFEncoder();

  for (let f = 0; f < frames.length; f++) {
    const frame = frames[f];
    const { width: fw, height: fh, left, top } = frame.dims;

    if (frame.disposalType === 3) previous = ctx.getImageData(0, 0, width, height);

    ctx.putImageData(new ImageData(new Uint8ClampedArray(frame.patch), fw, fh), left, top);

    const composed = ctx.getImageData(0, 0, width, height);
    toGrayscale(composed, adjustments);
    ctx.putImageData(composed, 0, 0);

    const pixels = new Uint8Array(composed.data.buffer);
    const palette = quantize(pixels, 256, { format: 'rgba4444' });
    const index = applyPalette(pixels, palette, 'rgba4444');

    encode.writeFrame(index, width, height, {
      palette: f === 0 ? grayRamp : palette,
      delay: (frame.delay || 10) * 10,
      dispose: frame.disposalType === 3 ? 3 : 1,
      transparent: frame.transparentIndex !== null,
      repeat: f === 0 ? readLoopCount(buffer) : undefined,
    });

    if (frame.disposalType === 2) ctx.clearRect(left, top, fw, fh);
    else if (frame.disposalType === 3 && previous) ctx.putImageData(previous, 0, 0);

    onProgress?.(f + 1, frames.length);
  }

  encode.finish();
  return new Blob([encode.bytes().buffer as ArrayBuffer], { type: 'image/gif' });
}
