'use client';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export default function Page() {
  const t = useTranslations();
  return (
    <div className="page-container empty-state">
      <BookOpen size={40} aria-hidden="true" />
      <h1>{t('ui_your_learning_library_is_coming_soon')}</h1>
      <p>
        {t(
          'ui_resource_recommendations_and_saved_lessons_are_not_available_in_this_build_yet_explore_the_learning_paths_to_find_a_direction_that_interests_you',
        )}
      </p>
      <Link href="/paths" prefetch={false} className="button button-primary">
        {t('ui_explore_learning_paths')}
      </Link>
    </div>
  );
}
