'use client';
import { useTranslations } from 'next-intl';
export default function Loading() {
  const t = useTranslations();
  return (
    <div
      className="page-container loading-grid"
      role="status"
      aria-label={t('ui_loading_your_learning_space')}
    >
      <span className="sr-only">{t('ui_loading')}</span>
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
