'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
const destinations = [
  ['join', 'comm_join', 'comm_consent'],
  ['check-in', 'comm_checkin', 'comm_prompt'],
  ['mentors', 'comm_mentors', 'comm_mentor_intro'],
  ['become-mentor', 'comm_become_mentor', 'comm_apply_hint'],
] as const;
export function CommunityHub() {
  const t = useTranslations();
  return (
    <div className="engagement community">
      <nav className="eng-nav" aria-label={t('eng_navigation')}>
        <Link prefetch={false} href="/dashboard">
          {t('eng_dashboard')}
        </Link>
        <Link prefetch={false} href="/learn">
          {t('eng_continue')}
        </Link>
      </nav>
      <span className="eyebrow">{t('comm_eyebrow')}</span>
      <h1>{t('comm_title')}</h1>
      <p>{t('comm_intro')}</p>
      <div className="eng-grid community-hub">
        {destinations.map(([page, title, description]) => (
          <Link
            prefetch={false}
            className="eng-card community-destination"
            href={`/circles/${page}`}
            aria-label={t(title)}
            key={page}
          >
            <h2>{t(title)}</h2>
            <p>{t(description)}</p>
            <span aria-hidden="true">→</span>
          </Link>
        ))}
        <Link
          prefetch={false}
          href="/showcase"
          aria-label={t('show_title')}
          className="eng-card community-destination"
        >
          <h2>{t('show_title')}</h2>
          <p>{t('show_intro')}</p>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
