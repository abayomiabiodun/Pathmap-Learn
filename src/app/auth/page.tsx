'use client';
import { useTranslations } from 'next-intl';
import { AuthForm } from '@/components/auth-form';
export default function Page() {
  const t = useTranslations();
  return (
    <div className="page-container narrow">
      <span className="eyebrow">{t('ui_a_place_to_keep_growing')}</span>
      <h1>{t('ui_your_journey_starts_here')}</h1>
      <AuthForm />
    </div>
  );
}
