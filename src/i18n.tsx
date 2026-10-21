import React, { useCallback, useEffect, useState } from 'react';
import type { Lang, MessageKey } from './messages';
import { STRINGS } from './messages';
import { I18nContext } from './i18n-context';

export type { Lang, MessageKey };

const STORAGE_KEY = 'exist-bw-lang';

function readLang(): Lang {
 if (typeof localStorage === 'undefined') return 'en';
 const stored = localStorage.getItem(STORAGE_KEY);
 if (stored === 'en' || stored === 'tr') return stored;
 return navigator.language.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const [lang, setLangState] = useState<Lang>(readLang);

 useEffect(() => {
 document.documentElement.lang = lang;
 }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => {
      let text: string = STRINGS[lang][key];
      if (vars) {
        for (const [name, value] of Object.entries(vars)) text = text.replace(`{${name}}`, String(value));
      }
      return text;
    },
    [lang]
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
};

