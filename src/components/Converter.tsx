import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Download, ImagePlus, Loader2, RotateCcw, X } from 'lucide-react';
import type { ImageFileItem, OutputFormat, ProcessingMode } from '../types';
import { formatFileSize, resolveOutputFormat } from '../utils/grayscale';
import { decodeHeicToPng, decodeTiffToPng, needsSoftwareDecode, processStillImage } from '../utils/imageProcessor';
import { analyzeGif, convertAnimatedGif } from '../utils/gif';
import { downloadAll, downloadItem } from '../utils/download';
import { CompareSlider } from './CompareSlider';
import { useI18n } from '../useI18n';
import type { MessageKey } from '../messages';

const MODES: { id: ProcessingMode; key: MessageKey }[] = [
 { id: 'standard', key: 'mode.standard' },
 { id: 'soft', key: 'mode.soft' },
 { id: 'high-contrast', key: 'mode.high-contrast' },
 { id: 'cinematic', key: 'mode.cinematic' },
];

const FORMATS: { id: OutputFormat; label: string }[] = [
 { id: 'original', label: '' },
 { id: 'png', label: 'PNG' },
 { id: 'jpeg', label: 'JPEG' },
 { id: 'webp', label: 'WebP' },
 { id: 'gif', label: 'GIF' },
];

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/tiff,image/avif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,.avif,.heic,.heif';

let itemSeq = 0;
const nextId = () => `img-${Date.now().toString(36)}-${(itemSeq += 1)}`;

interface Controls {
  mode: ProcessingMode;
  brightness: number;
  contrast: number;
  exposure: number;
  quality: number;
  outputFormat: OutputFormat;
}

const INITIAL_CONTROLS: Controls = {
  mode: 'standard',
  brightness: 0,
  contrast: 0,
  exposure: 0,
  quality: 0.92,
  outputFormat: 'original',
};

interface ConverterProps {
  onImageProcessed?: (item: ImageFileItem) => void;
}

export const Converter: React.FC<ConverterProps> = ({ onImageProcessed }) => {
 const { t } = useI18n();
 const [items, setItems] = useState<ImageFileItem[]>([]);
  const [controls, setControls] = useState<Controls>(INITIAL_CONTROLS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [zipping, setZipping] = useState(false);

  const itemsRef = useRef<ImageFileItem[]>([]);
  const urlsRef = useRef<Set<string>>(new Set());
  const runToken = useRef(0);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const track = useCallback((url: string) => {
    urlsRef.current.add(url);
    return url;
  }, []);

  const patch = useCallback((id: string, changes: Partial<ImageFileItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }, []);

  const convertOne = useCallback(
    async (item: ImageFileItem, applied: Controls, token: number): Promise<void> => {
      patch(item.id, { status: 'processing', errorMessage: undefined });
      try {
        const format = resolveOutputFormat(applied.outputFormat, item.type);
        const animated = item.isAnimated && item.type === 'image/gif' && format === 'gif';

        const result = animated
          ? {
              blob: await convertAnimatedGif(await item.file.arrayBuffer(), applied),
              width: item.originalWidth,
              height: item.originalHeight,
            }
          : await processStillImage(item.file, item.originalUrl, applied, applied.outputFormat);

        if (token !== runToken.current) return;

        const processedUrl = track(URL.createObjectURL(result.blob));
        const done: Partial<ImageFileItem> = {
          status: 'converted',
          processedBlob: result.blob,
          processedUrl,
          processedSize: result.blob.size,
          originalWidth: result.width,
          originalHeight: result.height,
        };
        patch(item.id, done);
        onImageProcessed?.({ ...item, ...done, settings: { ...applied } } as ImageFileItem);
      } catch (err) {
        if (token !== runToken.current) return;
        patch(item.id, {
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Could not process this image.',
        });
      }
    },
    [onImageProcessed, patch, track]
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        if (!file.type.startsWith('image/') && !/\.(heic|heif|tif|tiff|avif)$/i.test(file.name)) continue;

        const id = nextId();
        const placeholder: ImageFileItem = {
          id,
          file,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          originalWidth: 0,
          originalHeight: 0,
          originalUrl: '',
          previewUrl: '',
          status: 'processing',
          isAnimated: false,
          settings: { ...controls },
        };
        setItems((prev) => [...prev, placeholder]);
        setActiveId((current) => current ?? id);

        try {
          let source = file;
          const software = needsSoftwareDecode(file.type) ?? needsSoftwareDecode(guessMime(file.name));
          if (software === 'tiff') {
            const decoded = await decodeTiffToPng(file);
            source = new File([decoded.blob], file.name, { type: 'image/png' });
          } else if (software === 'heic') {
            const decoded = await decodeHeicToPng(file);
            source = new File([decoded.blob], file.name, { type: 'image/png' });
          }

          const originalUrl = track(URL.createObjectURL(source));
          let isAnimated = false;
          let frameCount: number | undefined;

          if (source.type === 'image/gif') {
            const info = await analyzeGif(await source.arrayBuffer());
            isAnimated = info.isAnimated;
            frameCount = info.frameCount;
          }

          const ready: ImageFileItem = {
            ...placeholder,
            file: source,
            type: source.type,
            originalUrl,
            previewUrl: originalUrl,
            isAnimated,
            frameCount,
            status: 'ready',
          };
          patch(id, ready);

          const token = runToken.current;
          await convertOne({ ...ready, settings: { ...controls } }, controls, token);
        } catch (err) {
          patch(id, {
            status: 'error',
            errorMessage: err instanceof Error ? err.message : 'Could not read this file.',
          });
        }
      }
    },
    [controls, convertOne, patch, track]
    );

    const firstRun = useRef(true);
  const controlsKey = `${controls.mode}|${controls.brightness}|${controls.contrast}|${controls.exposure}|${controls.outputFormat}`;
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const pending = itemsRef.current.filter((item) => item.originalUrl && item.status !== 'processing');
    if (pending.length === 0) return;

    const token = (runToken.current += 1);
    const handle = setTimeout(() => {
      for (const item of pending) void convertOne(item, controls, token);
    }, 150);
    return () => clearTimeout(handle);
    // convertOne is stable; controls is read fresh inside the timeout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlsKey]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setActiveId((current) => (current === id ? null : current));
  }, []);

  const clearAll = useCallback(() => {
    runToken.current += 1;
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current.clear();
    setItems([]);
    setActiveId(null);
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(false);
      void addFiles(Array.from(event.dataTransfer.files));
    },
    [addFiles]
  );

  const active = items.find((item) => item.id === activeId) ?? items[0];
  const convertedCount = items.filter((item) => item.status === 'converted').length;
  const busyCount = items.filter((item) => item.status === 'processing').length;

  const handleDownloadAll = useCallback(async () => {
    setZipping(true);
    try {
      await downloadAll(itemsRef.current, controls.outputFormat);
    } finally {
      setZipping(false);
    }
  }, [controls.outputFormat]);

  return (
    <section id="converter" className="pb-16">
    <div id="dropzone" className="scroll-mt-20 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <DropZone
          dragOver={dragOver}
          hasItems={items.length > 0}
          onBrowse={(files) => void addFiles(files)}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        />

        {items.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              {active && (
                <CompareSlider beforeUrl={active.originalUrl} adjustments={controls} alt={active.name} />
              )}

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="truncate text-sm text-subtext">
                  {active ? active.name : ''}
                  {active?.isAnimated && active.frameCount ? ` · ${t('frames', { n: active.frameCount })}` : ''}
                </p>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => active && downloadItem(active, controls.outputFormat)}
                    disabled={!active || active.status !== 'converted'}
                    className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                  >
                    <Download className="mr-1.5 inline h-3.5 w-3.5" />
                    {t('action.download')}
                  </button>
                  <button
                    onClick={() => void handleDownloadAll()}
                    disabled={convertedCount === 0 || zipping}
                    className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-white/30 disabled:cursor-not-allowed disabled:text-white/30"
                  >
                    {zipping ? t('action.zipping') : `${t('action.downloadAll')}${convertedCount > 1 ? ` (${convertedCount})` : ''}`}
                  </button>
                </div>
              </div>

              <Queue
              items={items}
              activeId={active?.id ?? null}
              onSelect={setActiveId}
              onRemove={removeItem}
              onClear={clearAll}
              label={t}
              />
            </div>

            <ControlsPanel
            controls={controls}
            busy={busyCount > 0}
            label={t}
            onChange={(changes) => setControls((prev) => ({ ...prev, ...changes }))}
            />
          </div>
        )}
      </div>
    </section>
  );
};

function guessMime(name: string): string {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (ext === 'tif' || ext === 'tiff') return 'image/tiff';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  if (ext === 'avif') return 'image/avif';
  return '';
}

interface DropZoneProps {
 dragOver: boolean;
 hasItems: boolean;
 onBrowse: (files: File[]) => void;
 onDragOver: (event: React.DragEvent) => void;
 onDragLeave: () => void;
 onDrop: (event: React.DragEvent) => void;
}

const DropZone: React.FC<DropZoneProps> = ({ dragOver, hasItems, onBrowse, onDragOver, onDragLeave, onDrop }) => {
 const { t } = useI18n();

 return (
 <div
 onDragOver={onDragOver}
 onDragLeave={onDragLeave}
 onDrop={onDrop}
 className={`relative cursor-pointer rounded-2xl border bg-card text-center transition-colors ${
 dragOver ? 'border-white/40 bg-white/[0.03]' : 'border-white/10 hover:border-white/20'
 } ${hasItems ? 'px-6 py-5' : 'px-6 py-16'}`}
 >
 <input
 id="file-input"
 type="file"
 multiple
 accept={ACCEPT}
 className="hidden"
 onChange={(event) => {
 const input = event.target;
 if (input.files) onBrowse(Array.from(input.files));
 input.value = '';
 }}
 />
 {!hasItems && <ImagePlus className="mx-auto mb-4 h-10 w-10 text-white/40" />}
 <p className="text-sm text-white/80">{hasItems ? t('drop.more') : t('drop.idle')}</p>
 <p className="mt-1 text-xs text-subtext">{t('drop.hint')}</p>
 <button
 onClick={() => document.getElementById('file-input')?.click()}
 className="mt-4 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90"
 >
 {t('drop.browse')}
 </button>
 </div>
 );
};

interface QueueProps {
 items: ImageFileItem[];
 activeId: string | null;
 onSelect: (id: string) => void;
 onRemove: (id: string) => void;
 onClear: () => void;
 label: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const STATUS_KEY: Record<ImageFileItem['status'], MessageKey> = {
 ready: 'status.ready',
 processing: 'status.processing',
 converted: 'status.converted',
 error: 'status.error',
};

const Queue: React.FC<QueueProps> = ({ items, activeId, onSelect, onRemove, onClear, label }) => (
 <div className="mt-6">
 <div className="mb-3 flex items-center justify-between">
 <span className="font-mono text-xs tracking-widest text-subtext uppercase">{label('queue.count', { n: items.length })}</span>
 <button onClick={onClear} className="text-xs text-subtext transition-colors hover:text-white">
 {label('queue.clear')}
 </button>
 </div>
 <ul className="flex gap-3 overflow-x-auto pb-2">
 {items.map((item) => (
 <li key={item.id} className="relative w-24 shrink-0">
 <button
 onClick={() => onSelect(item.id)}
 className={`block w-full overflow-hidden rounded-xl border bg-secondary ${
 item.id === activeId ? 'border-white/50' : 'border-white/10'
 }`}
 >
 <span className="flex aspect-square items-center justify-center">
 {item.originalUrl ? (
 <img src={item.processedUrl ?? item.originalUrl} alt="" className="h-full w-full object-cover" />
 ) : (
 <Loader2 className="h-4 w-4 animate-spin text-white/40" />
 )}
 </span>
 </button>
 <button
 onClick={() => onRemove(item.id)}
 aria-label={label('queue.remove', { name: item.name })}
 className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5 text-white/70 hover:text-white"
 >
 <X className="h-3 w-3" />
 </button>
 <div className="mt-1 flex items-center gap-1 text-[10px] text-subtext">
 <StatusIcon status={item.status} />
 <span className="truncate">{label(STATUS_KEY[item.status])}</span>
 </div>
 {item.status === 'error' && item.errorMessage && (
 <p className="text-[10px] leading-tight text-red-400" title={item.errorMessage}>
 {item.errorMessage}
 </p>
 )}
 {item.processedSize !== undefined && item.status === 'converted' && (
 <p className="text-[10px] text-subtext">{formatFileSize(item.processedSize)}</p>
 )}
 </li>
 ))}
 </ul>
 </div>
);

const StatusIcon: React.FC<{ status: ImageFileItem['status'] }> = ({ status }) => {
  if (status === 'processing') return <Loader2 className="h-3 w-3 animate-spin" />;
  if (status === 'converted') return <Check className="h-3 w-3 text-white" />;
  if (status === 'error') return <AlertCircle className="h-3 w-3 text-red-400" />;
  return <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/30" />;
};

interface ControlsPanelProps {
 controls: Controls;
 busy: boolean;
 label: (key: MessageKey) => string;
 onChange: (changes: Partial<Controls>) => void;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({ controls, busy, label, onChange }) => (
 <aside className="h-fit rounded-2xl border border-white/10 bg-card p-5 lg:sticky lg:top-24">
 <div className="mb-5 flex items-center justify-between">
 <h2 className="text-sm font-medium text-white">{label('controls.title')}</h2>
 {busy && (
 <span className="flex items-center gap-1.5 text-xs text-subtext">
 <Loader2 className="h-3 w-3 animate-spin" /> {label('controls.rendering')}
 </span>
 )}
 </div>

 <p className="mb-2 text-xs text-subtext">{label('controls.mode')}</p>
 <div className="mb-5 grid grid-cols-2 gap-2">
 {MODES.map((mode) => (
 <button
 key={mode.id}
 onClick={() => onChange({ mode: mode.id })}
 className={`rounded-full px-3 py-2 text-xs font-medium transition-colors ${
 controls.mode === mode.id ? 'bg-white text-black' : 'text-white/70 hover:bg-white/10'
 }`}
 >
 {label(mode.key)}
 </button>
 ))}
 </div>

 <Slider label={label('controls.brightness')} value={controls.brightness} onChange={(brightness) => onChange({ brightness })} />
 <Slider label={label('controls.contrast')} value={controls.contrast} onChange={(contrast) => onChange({ contrast })} />
 <Slider label={label('controls.exposure')} value={controls.exposure} onChange={(exposure) => onChange({ exposure })} />

 <button
 onClick={() => onChange({ brightness: 0, contrast: 0, exposure: 0 })}
 disabled={controls.brightness === 0 && controls.contrast === 0 && controls.exposure === 0}
 className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-white/15 py-2 text-xs font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:border-white/5 disabled:text-white/20"
 >
 <RotateCcw className="h-3.5 w-3.5" />
 {label('controls.reset')}
 </button>

 <div className="mt-5 border-t border-white/10 pt-5">
 <p className="mb-2 text-xs text-subtext">{label('controls.output')}</p>
      <div className="flex flex-wrap gap-2">
        {FORMATS.map((format) => (
          <button
            key={format.id}
            onClick={() => onChange({ outputFormat: format.id })}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              controls.outputFormat === format.id ? 'bg-white text-black' : 'text-white/70 hover:bg-white/10'
            }`}
          >
            {format.id === 'original' ? label('format.original') : format.label}
          </button>
        ))}
      </div>
    </div>
  </aside>
);

const Slider: React.FC<{ label: string; value: number; onChange: (value: number) => void }> = ({
  label,
  value,
  onChange,
}) => (
  <label className="mb-4 block">
    <span className="flex items-center justify-between text-xs text-subtext">
      {label}
      <span className="font-mono text-white/70">{value > 0 ? `+${value}` : value}</span>
    </span>
    <input
      type="range"
      min={-100}
      max={100}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="mt-2 w-full cursor-pointer accent-white"
    />
  </label>
);
