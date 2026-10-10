'use client';
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import type en from '../../messages/en.json';
import { readPreferences, shouldSuggestLite, type Preferences } from '@/lib/preferences';
const loadMessages = {
  pcm: () => import('../../messages/pcm.json').then((module) => module.default),
  yo: () => import('../../messages/yo.json').then((module) => module.default),
  ha: () => import('../../messages/ha.json').then((module) => module.default),
  ig: () => import('../../messages/ig.json').then((module) => module.default),
  fr: () => import('../../messages/fr.json').then((module) => module.default),
};
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
export function Providers({
  children,
  initialMessages,
}: {
  children: React.ReactNode;
  initialMessages: typeof en;
}) {
  const preferences = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const suggestLite = useSyncExternalStore(subscribe, connectionSnapshot, noSuggestion);
  const [translation, setTranslation] = useState({
    locale: defaults.locale,
    messages: initialMessages,
  });
  useEffect(() => {
    let active = true;
    const messagesPromise =
      preferences.locale === 'en'
        ? Promise.resolve(initialMessages)
        : loadMessages[preferences.locale]();
    messagesPromise.then((messages) => {
      if (active) setTranslation({ locale: preferences.locale, messages });
    });
    return () => {
      active = false;
    };
  }, [preferences.locale, initialMessages]);
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.dark ? 'dark' : 'light';
    document.documentElement.dataset.lite = String(preferences.lite);
    document.documentElement.lang = translation.locale;
    document.title = `PathMap Learn — ${translation.messages.start}`;
  }, [preferences, translation]);
  const update = (next: Partial<Preferences>) => {
    localStorage.setItem('pathmap-preferences', JSON.stringify({ ...preferences, ...next }));
    listeners.forEach((listener) => listener());
  };
  return (
    <Context.Provider value={{ preferences, update, suggestLite }}>
      <NextIntlClientProvider
        locale={translation.locale}
        messages={translation.messages}
        timeZone="Africa/Lagos"
      >
        {children}
      </NextIntlClientProvider>
    </Context.Provider>
  );
}
