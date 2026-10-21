import type { Adjustments, OutputFormat, ProcessingMode } from '../types';

// Rec. 709 luma. Perceived brightness, not a flat average of the channels.
export function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function clampByte(v: number): number {
  const rounded = Math.round(v);
  return rounded < 0 ? 0 : rounded > 255 ? 255 : rounded;
}

export function applyMode(gray: number, mode: ProcessingMode): number {
  if (mode === 'soft') return gray * 0.9 + 25;
  if (mode === 'high-contrast') {
    const pushed = gray < 128 ? gray * 0.75 : gray * 1.25 + 20;
    return clampByte(pushed);
  }
  if (mode === 'cinematic') {
    const n = gray / 255;
    const curved = n < 0.5 ? 2 * n * n : 1 - Math.pow(-2 * n + 2, 2) / 2;
    return Math.max(0, curved * 255 - 8);
  }
  return gray;
}

// Brightness shifts, contrast pivots around mid-gray, exposure scales in stops.
export function toneMap(gray: number, a: Adjustments): number {
  const base = applyMode(gray, a.mode);
  const contrastIn = (a.contrast / 100) * 255;
  const contrastFactor = (259 * (contrastIn + 255)) / (255 * (259 - contrastIn));
  const exposureFactor = Math.pow(2, a.exposure / 50);
  let v = base + (a.brightness / 100) * 255;
  v = contrastFactor * (v - 128) + 128;
  v = v * exposureFactor;
  return clampByte(v);
}

export function toGrayscale(imageData: ImageData, a: Adjustments): void {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const v = toneMap(luma(data[i], data[i + 1], data[i + 2]), a);
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
}

const MIME: Record<Exclude<OutputFormat, 'original'>, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export function mimeFor(format: Exclude<OutputFormat, 'original'>): string {
  return MIME[format];
}

const EXT: Record<Exclude<OutputFormat, 'original'>, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  gif: 'gif',
};

export function extensionFor(format: Exclude<OutputFormat, 'original'>): string {
  return EXT[format];
}

// What the file should actually be saved as. "original" keeps the source
// container when the browser can encode it, otherwise falls back to PNG.
export function resolveOutputFormat(
  selected: OutputFormat,
  sourceMime: string
): Exclude<OutputFormat, 'original'> {
  if (selected !== 'original') return selected;
  const type = sourceMime.toLowerCase();
  if (type === 'image/jpeg' || type === 'image/jpg') return 'jpeg';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  return 'png';
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 Bytes';
  const units = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
