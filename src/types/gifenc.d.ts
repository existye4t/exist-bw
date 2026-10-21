declare module 'gifenc' {
  export interface FrameOptions {
    palette?: number[][];
    delay?: number;
    transparent?: boolean;
    transparentIndex?: number;
    dispose?: number;
    repeat?: number;
    first?: boolean;
    colorDepth?: number;
  }

  export interface GIFEncoder {
    writeFrame(index: Uint8Array, width: number, height: number, options?: FrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
  }

  export function GIFEncoder(opts?: { auto?: boolean }): GIFEncoder;

  export function quantize(
    data: Uint8Array,
    maxColors: number,
    options?: { format?: 'rgb565' | 'rgb444' | 'rgba4444' }
  ): number[][];

  export function applyPalette(
    data: Uint8Array,
    palette: number[][],
    format?: 'rgb565' | 'rgb444' | 'rgba4444'
  ): Uint8Array;
}

declare module 'utif' {
  interface IFD {
    width: number;
    height: number;
    [key: string]: unknown;
  }

  export function decode(buffer: ArrayBuffer): IFD[];
  export function decodeImage(buffer: ArrayBuffer, ifd: IFD): void;
  export function toRGBA8(ifd: IFD): Uint8Array;
}
