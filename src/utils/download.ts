import JSZip from 'jszip';
import type { ImageFileItem } from '../types';
import { extensionFor, resolveOutputFormat } from './grayscale';

export function outputName(item: ImageFileItem, selectedFormat: ImageFileItem['settings']['outputFormat']): string {
  const format = resolveOutputFormat(selectedFormat, item.type);
  const base = item.name.replace(/\.[^./\\]+$/, '');
  return `${base}.bw.${extensionFor(format)}`;
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadItem(item: ImageFileItem, selectedFormat: ImageFileItem['settings']['outputFormat']): void {
  if (!item.processedBlob) return;
  saveBlob(item.processedBlob, outputName(item, selectedFormat));
}

// One file when there is a single result, one zip when there are several, so a
// batch never triggers a stack of browser download prompts.
export async function downloadAll(
  items: ImageFileItem[],
  selectedFormat: ImageFileItem['settings']['outputFormat']
): Promise<void> {
  const ready = items.filter((item) => item.status === 'converted' && item.processedBlob);
  if (ready.length === 0) return;
  if (ready.length === 1) {
    downloadItem(ready[0], selectedFormat);
    return;
  }

  const zip = new JSZip();
  const used = new Set<string>();
  for (const item of ready) {
    let name = outputName(item, selectedFormat);
    let n = 2;
    while (used.has(name)) {
      name = name.replace(/(\.[^.]+)$/, `-${n}$1`);
      n += 1;
    }
    used.add(name);
    zip.file(name, item.processedBlob as Blob);
  }

  const zipped = await zip.generateAsync({ type: 'blob' });
  saveBlob(zipped, 'exist-bw.zip');
}
