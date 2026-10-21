import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { FormatsSection } from './components/FormatsSection';
import { Converter } from './components/Converter';
import { PresenceCard } from './components/PresenceCard';
import { I18nProvider } from './i18n';
import { useI18n } from './useI18n';

const scrollTo = (sectionId: string) => {
 const target = document.getElementById(sectionId);
 if (!target) return;
 const top = target.getBoundingClientRect().top + window.scrollY - 88;
 window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
};

export const App: React.FC = () => (
  <I18nProvider>
    <Shell />
  </I18nProvider>
);

const Shell: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar onNavigate={scrollTo} />

      <main>
        <Hero onGetStarted={() => scrollTo('dropzone')} />
        <Converter />
        <HowItWorks />
        <FormatsSection />
        <Privacy />
        <PresenceCard />
      </main>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-subtext sm:flex-row sm:px-6 lg:px-8">
          <span className="font-mono text-[11px] uppercase tracking-[0.28em]">Exist · B&W</span>
          <span>{t('footer.note')}</span>
        </div>
      </footer>
    </div>
  );
};

const Privacy: React.FC = () => {
  const { t } = useI18n();

  return (
    <section id="privacy" className="scroll-mt-20 border-t border-white/10 py-24">
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-subtext">{t('privacy.eyebrow')}</span>
        <h2 className="mt-4 text-4xl font-medium tracking-tight text-white sm:text-5xl">
          {t('privacy.title')} <span className="font-serif font-normal italic">{t('privacy.titleEmphasis')}</span>
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-subtext sm:text-base">{t('privacy.body')}</p>
      </div>
    </section>
  );
};
