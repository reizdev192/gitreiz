import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { t as translate, type Locale, type TranslationKey } from './translations';

interface I18nContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
    locale: 'en',
    setLocale: () => { },
    t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(() => {
        const saved = localStorage.getItem('deploy-locale');
        return (saved as Locale) || 'en';
    });

    const setLocale = useCallback((l: Locale) => {
        setLocaleState(l);
        localStorage.setItem('deploy-locale', l);
    }, []);

    const t = useCallback((key: TranslationKey) => translate(key, locale), [locale]);

    return (
        <I18nContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    return useContext(I18nContext);
}
