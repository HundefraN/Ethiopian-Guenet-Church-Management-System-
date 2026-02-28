import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import en from '../locales/en.json';
import am from '../locales/am.json';
import { useAuth } from './AuthContext';
import { supabase } from '../supabaseClient';

type Language = 'en' | 'am';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => Promise<void>;
    t: (path: string, replacements?: Record<string, string>) => string;
}

const translations: Record<Language, any> = {
    en,
    am,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile } = useAuth();
    const [language, setLanguageState] = useState<Language>(() => {
        return (localStorage.getItem('guenet-language') as Language) || 'en';
    });

    useEffect(() => {
        if (profile?.language && profile.language !== language) {
            setLanguageState(profile.language as Language);
            localStorage.setItem('guenet-language', profile.language);
        }
    }, [profile?.language, language]);

    const setLanguage = async (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('guenet-language', lang);
        if (profile) {
            await supabase.from('profiles').update({ language: lang }).eq('id', profile.id);
        }
    };

    const t = useCallback((path: string, replacements?: Record<string, string>): string => {
        const keys = path.split('.');
        let result = translations[language];

        for (const key of keys) {
            if (result && result[key] === undefined) {
                console.warn(`Translation key not found: ${path} for language: ${language}`);
                return path;
            }
            result = result[key];
        }

        let translated = result as string;
        if (replacements && translated) {
            Object.entries(replacements).forEach(([key, value]) => {
                translated = translated.replace(`{{${key}}}`, value);
            });
        }

        return translated;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
