export type ProcessingMode = 'standard' | 'soft' | 'high-contrast' | 'cinematic';

export type OutputFormat = 'original' | 'png' | 'jpeg' | 'webp' | 'gif';

export type ItemStatus = 'ready' | 'processing' | 'converted' | 'error';

export interface Adjustments {
  mode: ProcessingMode;
  brightness: number;
  contrast: number;
  exposure: number;
  quality: number;
}

export interface ImageFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  originalWidth: number;
  originalHeight: number;
  originalUrl: string;
  previewUrl: string;
  status: ItemStatus;
  errorMessage?: string;
  isAnimated: boolean;
  frameCount?: number;
  settings: Adjustments & { outputFormat: OutputFormat };
  processedBlob?: Blob;
  processedUrl?: string;
  processedSize?: number;
}
