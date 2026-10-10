'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  BookOpen,
  Compass,
  Leaf,
  Map,
  Users,
  Sun,
  Moon,
  ArrowUpRight,
  WifiOff,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePreferences } from './providers';
import { locales, localeNames, type Locale } from '@/lib/preferences';
export function Shell({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const { preferences, update, suggestLite } = usePreferences();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);
  const nav = [
    { href: '/', key: 'home', icon: Compass },
    { href: '/library', key: 'library', icon: BookOpen },
    { href: '/roadmap', key: 'roadmap', icon: Map },
    { href: '/circles', key: 'community', icon: Users },
  ];
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="header">
        <Link prefetch={false} href="/" className="brand" aria-label="PathMap Learn home">
          <span className="brand-icon">
            <Map size={23} />
          </span>
          <span>
            pathmap<span className="brand-sub">LEARN</span>
          </span>
        </Link>
        <nav aria-label="Main navigation" className="desktop-nav">
          {nav.map(({ href, key }) => (
            <Link
              prefetch={false}
              key={key}
              href={href}
              className={pathname === href ? 'active' : ''}
            >
              {t(key)}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="lite-toggle"
            aria-pressed={preferences.lite}
            onClick={() => update({ lite: !preferences.lite })}
          >
            <Leaf size={16} />
            <span>{t('lite')}</span>
            <span className="toggle-track">
              <span />
            </span>
          </button>
          <button
            className="icon-button theme-toggle"
            aria-label={preferences.dark ? 'Use light mode' : 'Use dark mode'}
            onClick={() => update({ dark: !preferences.dark })}
          >
            {preferences.dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <Link prefetch={false} href="/auth" className="signin">
            {t('signIn')}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </header>
      {offline && (
        <div className="notice" role="status">
          <WifiOff size={17} />
          {t('offline')}
        </div>
      )}
      {suggestLite && !preferences.lite && (
        <div className="notice">
          <Leaf size={17} />
          {t('slow')}
          <button onClick={() => update({ lite: true })}>{t('enableLite')}</button>
        </div>
      )}
      <main id="main">{children}</main>
      <footer className="footer">
        <span>Made for your pace. Built for your possibilities.</span>
        <div>
          <label className="sr-only" htmlFor="locale">
            {t('language')}
          </label>
          <select
            id="locale"
            value={preferences.locale}
            onChange={(e) => update({ locale: e.target.value as Locale })}
          >
            {locales.map((locale) => (
              <option key={locale} value={locale}>
                {localeNames[locale]}
              </option>
            ))}
          </select>
          <Link prefetch={false} href="/privacy">
            {t('privacy')}
          </Link>
          <span>© {new Date().getFullYear()} PathMap Learn</span>
        </div>
      </footer>
      <nav aria-label="Mobile navigation" className="mobile-nav">
        {nav.map(({ href, key, icon: Icon }) => (
          <Link
            prefetch={false}
            key={key}
            href={href}
            aria-current={pathname === href ? 'page' : undefined}
          >
            <Icon size={20} />
            <span>{t(key)}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
