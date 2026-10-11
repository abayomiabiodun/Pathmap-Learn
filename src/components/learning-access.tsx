'use client';
import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { learningPathFromQuiz, pathNameKeys, type PathId } from '@/lib/quiz';
import { courseProgress, type Lesson } from '@/lib/learning';
import { useLearningProgress } from './learning-progress';
import { Learning } from './learning';
function subscribe(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener('focus', listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener('focus', listener);
  };
}
function snapshot() {
  try {
    return localStorage.getItem('pathmap-quiz-v1') ?? '';
  } catch {
    return '';
  }
}
export function LearningAccess({
  path,
  initialLessons,
}: {
  path?: PathId;
  initialLessons?: Record<string, Lesson>;
}) {
  const t = useTranslations();
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  const assigned = learningPathFromQuiz(raw);
  const { progress } = useLearningProgress();
  // The early path check reveals only the matching static tree before hydration.
  if (path && (raw === null || path === assigned))
    return (
      <>
        {raw === null && (
          <p className="learning-access-pending" data-course={path} role="status">
            {t('learn_loading')}
          </p>
        )}
        <div className="learning-access-course" data-course={path} data-ready={raw !== null}>
          <Learning key={path} path={path} initialLessons={initialLessons} />
        </div>
      </>
    );
  const status = assigned ? courseProgress(assigned, progress) : null;
  return (
    <div className="page-container learning">
      <div className="learning-header">
        <div>
          <h1>{t('learn_heading')}</h1>
          <p>{t('learn_focused')}</p>
        </div>
      </div>
      {raw === null ? (
        <p role="status">{t('learn_loading')}</p>
      ) : assigned ? (
        <article className="learning-card">
          <h2>{t(pathNameKeys[assigned])}</h2>
          {path && path !== assigned && <p role="status">{t('learn_matched_only')}</p>}
          <p>{t('learn_progress', status!)}</p>
          <progress
            value={status!.completed}
            max={status!.total}
            aria-label={t(pathNameKeys[assigned])}
          />
          <Link className="button button-primary" prefetch={false} href={`/learn/${assigned}`}>
            {t('eng_continue')}
          </Link>
          <Link className="button button-outline" prefetch={false} href="/taster">
            {t('taster_try')}
          </Link>
        </article>
      ) : (
        <div className="learning-card">
          <p>{t('learn_assess_first')}</p>
          <Link className="button button-primary" prefetch={false} href="/quiz">
            {t('start')}
          </Link>
        </div>
      )}
    </div>
  );
}
