import React from 'react';
import { ArrowDown } from 'lucide-react';
import { useI18n } from '../useI18n';

interface HeroProps {
  onGetStarted: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onGetStarted }) => {
  const { t } = useI18n();

  return (
    <section id="hero" className="relative flex flex-col items-center px-4 pb-16 pt-28 text-center md:pt-36">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[780px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),transparent_65%)]" />

      <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.28em] text-subtext">{t('hero.eyebrow')}</p>

      <h1 className="max-w-4xl text-5xl leading-[1.02] font-medium tracking-tight text-white sm:text-6xl md:text-7xl">
        {t('hero.title')}
        <span className="mt-1 block font-serif text-[1.08em] font-normal italic tracking-normal text-white/90">
          {t('hero.titleEmphasis')}
        </span>
      </h1>

      <p className="mt-7 max-w-md text-base leading-relaxed text-subtext">{t('hero.subtitle')}</p>

      <div className="mt-10 flex items-center gap-6">
        <button
          onClick={onGetStarted}
          className="group flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          {t('hero.cta')}
          <ArrowDown className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5" />
        </button>
        <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-muted sm:block">{t('hero.note')}</span>
      </div>
    </section>
  );
};
