'use client';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
export default function Error({ reset }: { reset: () => void }) {
  const t = useTranslations();
  return (
    <div className="page-container empty-state">
      <h1>{t('ui_let_s_try_that_again')}</h1>
      <p>{t('ui_something_interrupted_this_page_your_progress_is_still_saved')}</p>
      <Button onClick={reset}>{t('ui_try_again')}</Button>
    </div>
  );
}
