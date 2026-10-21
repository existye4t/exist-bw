import React, { useState } from 'react';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { useI18n } from '../useI18n';
import { LanguageMenu } from './LanguageMenu';

interface NavbarProps {
  onNavigate: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
 const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
 const { t } = useI18n();

 const links: { id: string; label: string }[] = [
 { id: 'converter', label: t('nav.converter') },
 { id: 'how-it-works', label: t('nav.how') },
 { id: 'formats', label: t('nav.formats') },
 { id: 'privacy', label: t('nav.privacy') },
 ];

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-black/60 backdrop-blur-xl">
    <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex cursor-pointer items-baseline gap-2" onClick={() => handleNavClick('hero')}>
        <span className="text-[15px] font-medium tracking-tight text-white">Exist</span>
        <span className="font-serif text-[15px] italic text-white/50">B&W</span>
        </div>

        {/* Center Nav (Desktop) */}
        <nav className="hidden items-center gap-7 text-[13px] text-subtext md:flex">
        {links.map((link) => (
        <button key={link.id} onClick={() => handleNavClick(link.id)} className="transition-colors hover:text-white">
        {link.label}
        </button>
        ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
        <LanguageMenu />
        <button
        onClick={() => handleNavClick('dropzone')}
        className="group flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-black transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
        <span>{t('nav.upload')}</span>
        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
        </button>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-subtext hover:text-white"
          aria-label={t('nav.menu')}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div
      className={`overflow-hidden border-b border-white/10 bg-black/90 backdrop-blur-xl transition-all duration-300 ease-out md:hidden ${
      mobileMenuOpen ? 'max-h-96 opacity-100' : 'pointer-events-none max-h-0 opacity-0'
      }`}
      >
      <div className="space-y-1 px-4 pt-2 pb-5">
      {links.map((link) => (
      <button
      key={link.id}
      onClick={() => handleNavClick(link.id)}
      className="block w-full rounded-lg py-2 text-left text-sm text-subtext transition-colors hover:bg-white/[0.04] hover:text-white"
      >
      {link.label}
      </button>
      ))}
      <div className="flex items-center justify-between pt-3">
      <LanguageMenu />
      <button
      onClick={() => handleNavClick('dropzone')}
      className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-black"
      >
      <span>{t('nav.upload')}</span>
      <ArrowUpRight className="h-4 w-4" />
      </button>
      </div>
      </div>
      </div>
    </header>
  );
};
