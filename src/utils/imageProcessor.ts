import type { Adjustments, OutputFormat } from '../types';
import { mimeFor, resolveOutputFormat, toGrayscale } from './grayscale';

export interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The browser could not encode this image.'))),
      mime,
      quality
    );
  });
}

// JPEG has no alpha channel; composite onto black so transparent pixels do not
// come back as white from the browser encoder.
function flattenForJpeg(source: HTMLCanvasElement): HTMLCanvasElement {
  const flat = document.createElement('canvas');
  flat.width = source.width;
  flat.height = source.height;
  const ctx = flat.getContext('2d');
  if (!ctx) return source;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, flat.width, flat.height);
  ctx.drawImage(source, 0, 0);
  return flat;
}

export async function renderGrayscale(
  source: CanvasImageSource,
  width: number,
  height: number,
  adjustments: Adjustments,
  format: Exclude<OutputFormat, 'original'>
): Promise<ProcessedImage> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get a canvas context.');

  ctx.drawImage(source, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  toGrayscale(imageData, adjustments);
  ctx.putImageData(imageData, 0, 0);

  const mime = mimeFor(format);
  const target = format === 'jpeg' ? flattenForJpeg(canvas) : canvas;
  const blob = await canvasToBlob(target, mime, adjustments.quality);
  return { blob, width, height };
  }

  function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The browser could not decode this image.'));
    img.src = url;
  });
}

export async function processStillImage(
  file: File,
  previewUrl: string,
  adjustments: Adjustments,
  selectedFormat: OutputFormat
): Promise<ProcessedImage> {
  const format = resolveOutputFormat(selectedFormat, file.type);
  const img = await loadImageElement(previewUrl);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) throw new Error('The image has no readable dimensions.');
  return renderGrayscale(img, width, height, adjustments, format);
}

// Decode a TIFF (utif) into a PNG blob the browser can preview and re-process.
export async function decodeTiffToPng(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const UTIF = await import('utif');
  const buffer = await file.arrayBuffer();
  const ifds = UTIF.decode(buffer);
  if (!ifds.length) throw new Error('No image found inside this TIFF.');
  const page = ifds[0];
  UTIF.decodeImage(buffer, page);
  const rgba = UTIF.toRGBA8(page);
  const width = page.width;
  const height = page.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get a canvas context.');
  ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);

  const blob = await canvasToBlob(canvas, 'image/png', 1);
  return { blob, width, height };
}

// Decode a HEIC/HEIF (libheif via heic2any) into a PNG blob.
export async function decodeHeicToPng(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const heic2any = (await import('heic2any')).default;
  const converted = await heic2any({ blob: file, toType: 'image/png', quality: 1 });
  const blob = Array.isArray(converted) ? converted[0] : converted;

  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImageElement(url);
    return { blob, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const TIFF_TYPES = ['image/tiff', 'image/tif'];
const HEIC_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];

export function needsSoftwareDecode(mime: string): 'tiff' | 'heic' | null {
  const type = mime.toLowerCase();
  if (TIFF_TYPES.includes(type)) return 'tiff';
  if (HEIC_TYPES.includes(type)) return 'heic';
  return null;
}
