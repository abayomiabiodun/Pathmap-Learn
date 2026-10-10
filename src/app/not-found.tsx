'use client';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Compass } from 'lucide-react';
export default function NotFound() {
  const t = useTranslations();
  return (
    <div className="page-container empty-state">
      <Compass size={42} />
      <h1>{t('ui_a_little_off_the_path')}</h1>
      <p>{t('ui_we_couldn_t_find_this_page_let_s_get_you_back_to_your_journey')}</p>
      <Link className="button button-primary" href="/">
        {t('ui_back_to_home')}
      </Link>
    </div>
  );
}
