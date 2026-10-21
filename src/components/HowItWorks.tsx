import React from 'react';
import { useI18n } from '../useI18n';

export const HowItWorks: React.FC = () => {
  const { t } = useI18n();

  const steps = [
    { number: '01', title: t('how.step1.title'), description: t('how.step1.body') },
    { number: '02', title: t('how.step2.title'), description: t('how.step2.body') },
    { number: '03', title: t('how.step3.title'), description: t('how.step3.body') },
  ];

  return (
    <section id="how-it-works" className="scroll-mt-20 py-24 border-t border-white/10 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-subtext">{t('how.eyebrow')}</span>
        <h2 className="mt-4 text-4xl font-medium tracking-tight text-white sm:text-5xl">
        {t('how.title')} <span className="font-serif font-normal italic">{t('how.titleEmphasis')}</span>
        </h2>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
        {steps.map((step) => (
        <div key={step.number} className="bg-background p-8">
        <div className="font-serif text-3xl italic text-white/30">{step.number}</div>
        <h3 className="mt-6 text-lg font-medium text-white">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-subtext">{step.description}</p>
        </div>
        ))}
        </div>
      </div>
    </section>
  );
};
