import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useI18n } from '../useI18n';
import type { Lang } from '../messages';

const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
];

export const LanguageMenu: React.FC = () => {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((item) => item.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('lang.label')}
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pr-2.5 pl-3 text-[13px] text-white/80 backdrop-blur-md transition-colors hover:border-white/20 hover:text-white"
      >
        <span className="font-mono text-[11px] tracking-widest">{current.code.toUpperCase()}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        role="listbox"
        className={`absolute right-0 z-50 mt-2 w-40 origin-top-right overflow-hidden rounded-xl border border-white/10 bg-black/80 shadow-2xl shadow-black/50 backdrop-blur-xl transition-all duration-200 ease-out ${
          open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-1 scale-95 opacity-0'
        }`}
      >
        {LANGUAGES.map((item) => {
          const active = item.code === lang;
          return (
            <button
              key={item.code}
              role="option"
              aria-selected={active}
              onClick={() => {
                setLang(item.code);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors ${
                active ? 'text-white' : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
              }`}
            >
              <span className="flex-1">{item.label}</span>
              <Check className={`h-3.5 w-3.5 transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-0'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
};
