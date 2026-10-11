'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { BookOpen, Compass, Leaf, Map, Users, ArrowUpRight, WifiOff } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePreferences } from './providers';
import { locales, localeNames, type Locale } from '@/lib/preferences';
const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
export function Shell({
  children,
  features = [],
  menuIcon,
  closeIcon,
  themeIcon,
}: {
  children: React.ReactNode;
  features?: readonly (readonly [string, string])[];
  menuIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
  themeIcon?: React.ReactNode;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  const { preferences, update, suggestLite } = usePreferences();
  const [offline, setOffline] = useState(false);
  const [menuReady, setMenuReady] = useState(false);
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
    { href: '/learn', key: 'eng_continue', icon: Map },
    { href: '/circles', key: 'community', icon: Users },
  ];
  return (
    <>
      <a className="skip-link" href="#main">
        {t('ui_skip_to_content')}
      </a>
      <header className="header">
        <Link prefetch={false} href="/" className="brand" aria-label={t('ui_pathmap_learn_home')}>
          <span className="brand-icon">
            <Map size={23} />
          </span>
          <span>
            pathmap<span className="brand-sub">LEARN</span>
          </span>
        </Link>
        <nav aria-label={t('ui_main_navigation')} className="desktop-nav">
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
            aria-label={t('lite')}
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
            aria-label={preferences.dark ? t('ui_use_light_mode') : t('ui_use_dark_mode')}
            onClick={() => update({ dark: !preferences.dark })}
          >
            {themeIcon}
          </button>
          <Link prefetch={false} href="/auth" className="signin">
            {t('signIn')}
            <ArrowUpRight size={16} />
          </Link>
          <button
            type="button"
            className="icon-button menu-toggle"
            popoverTarget="feature-menu"
            aria-controls="feature-menu"
            aria-label={t('nav_menu')}
            onClick={() => setMenuReady(true)}
          >
            {menuIcon}
          </button>
        </div>
      </header>
      <nav
        id="feature-menu"
        popover="auto"
        className="feature-menu"
        style={{ display: 'none' }}
        aria-label={t('nav_menu')}
      >
        <div className="feature-menu-heading">
          <strong>{t('nav_menu')}</strong>
          <button
            type="button"
            className="icon-button"
            popoverTarget="feature-menu"
            popoverTargetAction="hide"
            aria-label={t('nav_close')}
          >
            {closeIcon}
          </button>
        </div>
        {menuReady &&
          features.map(([href, key]) => (
            <Link
              key={href}
              href={href}
              prefetch={false}
              aria-current={href !== '/quiz' && pathname === href ? 'page' : undefined}
              onClick={(event) =>
                event.currentTarget.closest<HTMLElement>('#feature-menu')?.hidePopover()
              }
            >
              {t(key)}
            </Link>
          ))}
      </nav>
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
        <span>{t('ui_made_for_your_pace_built_for_your_possibilities')}</span>
        <div>
          <label className="sr-only" htmlFor="locale">
            {t('language')}
          </label>
          <select
            id="locale"
            disabled={!ready}
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
      <nav aria-label={t('ui_mobile_navigation')} className="mobile-nav">
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
