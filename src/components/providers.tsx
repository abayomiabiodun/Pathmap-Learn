'use client';
import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../messages/en.json';
import pcm from '../../messages/pcm.json';
import yo from '../../messages/yo.json';
import ha from '../../messages/ha.json';
import ig from '../../messages/ig.json';
import fr from '../../messages/fr.json';
import {
  readPreferences,
  shouldSuggestLite,
  type Preferences,
  type Locale,
} from '@/lib/preferences';
const translations = { en, pcm, yo, ha, ig, fr };
const defaults: Preferences = { locale: 'en', lite: false, dark: false };
const Context = createContext<{
  preferences: Preferences;
  update: (next: Partial<Preferences>) => void;
  suggestLite: boolean;
}>({ preferences: defaults, update: () => {}, suggestLite: false });
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedPreferences = defaults;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
};
const snapshot = () => {
  const raw = localStorage.getItem('pathmap-preferences');
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedPreferences = readPreferences(raw);
  }
  return cachedPreferences;
};
const serverSnapshot = () => defaults;
const connectionSnapshot = () =>
  shouldSuggestLite(
    (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection,
  );
const noSuggestion = () => false;
export const usePreferences = () => useContext(Context);
export function Providers({ children }: { children: React.ReactNode }) {
  const preferences = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const suggestLite = useSyncExternalStore(subscribe, connectionSnapshot, noSuggestion);
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.dark ? 'dark' : 'light';
    document.documentElement.dataset.lite = String(preferences.lite);
    document.documentElement.lang = preferences.locale;
  }, [preferences]);
  const update = (next: Partial<Preferences>) => {
    localStorage.setItem('pathmap-preferences', JSON.stringify({ ...preferences, ...next }));
    listeners.forEach((listener) => listener());
  };
  const messages = { ...en, ...translations[preferences.locale as Locale] };
  return (
    <Context.Provider value={{ preferences, update, suggestLite }}>
      <NextIntlClientProvider
        locale={preferences.locale}
        messages={messages}
        timeZone="Africa/Lagos"
      >
        {children}
      </NextIntlClientProvider>
    </Context.Provider>
  );
}
