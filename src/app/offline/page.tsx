'use client';
import { useTranslations } from 'next-intl';
import { WifiOff } from 'lucide-react';
export default function Page() {
  const t = useTranslations();
  return (
    <div className="page-container empty-state">
      <WifiOff size={40} />
      <h1>{t('ui_a_pause_in_connection_keep_your_momentum')}</h1>
      <p>
        {t(
          'ui_this_page_needs_a_connection_you_can_return_to_the_cached_home_page_while_you_reconnect',
        )}
      </p>
      {/* A document navigation lets the service worker serve cached HTML while offline. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="button button-primary">
        {t('ui_back_to_home')}
      </a>
    </div>
  );
}
