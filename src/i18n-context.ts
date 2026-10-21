import { createContext } from 'react';
import type { Lang, MessageKey } from './messages';

export interface I18nValue {
 lang: Lang;
 setLang: (lang: Lang) => void;
 t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nValue | null>(null);
