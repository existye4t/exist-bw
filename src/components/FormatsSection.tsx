import React from 'react';
import { useI18n } from '../useI18n';
import type { MessageKey } from '../messages';

const FORMATS: { name: string; key: MessageKey }[] = [
  { name: 'JPG', key: 'fmt.jpg' },
  { name: 'JPEG', key: 'fmt.jpeg' },
  { name: 'PNG', key: 'fmt.png' },
  { name: 'WEBP', key: 'fmt.webp' },
  { name: 'GIF', key: 'fmt.gif' },
  { name: 'BMP', key: 'fmt.bmp' },
  { name: 'TIFF', key: 'fmt.tiff' },
  { name: 'AVIF', key: 'fmt.avif' },
];

export const FormatsSection: React.FC = () => {
  const { t } = useI18n();

  return (
    <section id="formats" className="scroll-mt-20 py-24 border-t border-white/10 bg-secondary/50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-subtext">{t('formats.eyebrow')}</span>
        <h2 className="mt-4 text-4xl font-medium tracking-tight text-white sm:text-5xl">
        {t('formats.title')} <span className="font-serif font-normal italic">{t('formats.titleEmphasis')}</span>
        </h2>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
        {FORMATS.map((fmt) => (
        <div key={fmt.name} className="bg-card p-6">
        <div className="font-mono text-lg font-medium tracking-tight text-white">{fmt.name}</div>
        <div className="mt-1.5 text-xs text-subtext">{t(fmt.key)}</div>
        </div>
        ))}
        </div>
      </div>
    </section>
  );
};
