'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { BookOpen, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import {
  courseProgress,
  emptyProgress,
  lessonIds,
  lessonKey,
  readProgress,
  type LearningProgress,
  type Lesson,
} from '@/lib/learning';
import { pathIds, pathNameKeys, type PathId } from '@/lib/quiz';
import { localeNames, type Locale } from '@/lib/preferences';

const storageKey = 'pathmap-learning-v1';
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedProgress = emptyProgress;
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}
function snapshot() {
  const raw = localStorage.getItem(storageKey);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedProgress = readProgress(raw);
  }
  return cachedProgress;
}
const serverSnapshot = () => emptyProgress;

export function Learning({
  path,
  initialLessons,
}: {
  path?: PathId;
  initialLessons?: Record<string, Lesson>;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const progress = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [catalog, setCatalog] = useState<{
    locale: string;
    lessons: Record<string, Lesson>;
  } | null>(initialLessons ? { locale: 'en', lessons: initialLessons } : null);
  const [failedLocale, setFailedLocale] = useState('');
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<'required' | 'incorrect' | 'success' | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // Save the public course document too: client navigation otherwise fetches only RSC.
    if (path) fetch(`/learn/${path}`, { headers: { Accept: 'text/html' } }).catch(() => {});
  }, [path]);
  useEffect(() => {
    if (!path || (locale === 'en' && initialLessons)) return;
    const controller = new AbortController();
    fetch(`/lessons/${locale}.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Unavailable');
        return response.json();
      })
      .then((lessons: Record<string, Lesson>) => {
        if (controller.signal.aborted) return;
        if (
          !Object.values(lessonIds)
            .flat()
            .every((id) => typeof lessons[id]?.body === 'string')
        )
          throw new Error('Invalid catalog');
        setCatalog({ locale, lessons });
        setFailedLocale('');
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailedLocale(locale);
      });
    return () => controller.abort();
  }, [path, locale, retry, initialLessons]);
  function save(next: LearningProgress) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setSaveFailed(false);
      listeners.forEach((listener) => listener());
      return true;
    } catch {
      setSaveFailed(true);
      return false;
    }
  }
  const summary = path ? courseProgress(path, progress) : null;
  const id = path ? (selected ?? summary!.next) : null;
  const key = path && id ? lessonKey(path, id) : '';
  const activeLessons =
    locale === 'en' && initialLessons
      ? initialLessons
      : catalog?.locale === locale
        ? catalog.lessons
        : undefined;
  const lesson = id ? activeLessons?.[id] : undefined;
  const draft = progress.lessons[key]?.draft ?? '';
  function openLesson(next: string) {
    setSelected(next);
    setAnswer(null);
    setFeedback(null);
    requestAnimationFrame(() => heading.current?.focus());
  }
  return (
    <div className="page-container learning">
      <div className="learning-header">
        <div>
          <span className="eyebrow">
            <BookOpen size={18} aria-hidden="true" /> {t('learn_foundations')}
          </span>
          <h1>{path ? t(pathNameKeys[path]) : t('learn_heading')}</h1>
          <p>{t(path ? 'learn_instructions' : 'learn_intro')}</p>
        </div>
        {path && (
          <Link href="/learn" prefetch={false} className="button button-outline">
            {t('learn_back')}
          </Link>
        )}
      </div>
      {!path ? (
        <>
          <p>{t('learn_scope')}</p>
          <div className="learning-grid">
            {pathIds.map((course) => {
              const status = courseProgress(course, progress);
              return (
                <article key={course} className="learning-card">
                  <h2>{t(pathNameKeys[course])}</h2>
                  <p>{t('learn_progress', status)}</p>
                  <progress
                    value={status.completed}
                    max={status.total}
                    aria-label={t(pathNameKeys[course])}
                  />
                  <Link
                    href={`/learn/${course}`}
                    prefetch={false}
                    className="button button-primary"
                  >
                    {t('learn_open')} <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <p>{t('learn_progress', summary!)}</p>
          <progress
            value={summary!.completed}
            max={summary!.total}
            aria-label={t('learn_outline')}
          />
          <p>
            {t('learn_language')}: {localeNames[locale]}
          </p>
          {summary!.completed === summary!.total && (
            <p className="learning-feedback">{t('learn_finished')}</p>
          )}
          {failedLocale === locale ? (
            <div role="alert">
              <p>{t('learn_load_error')}</p>
              <Button
                onClick={() => {
                  setFailedLocale('');
                  setRetry((value) => value + 1);
                }}
              >
                {t('learn_retry')}
              </Button>
            </div>
          ) : !lesson ? (
            <p role="status">{t('learn_loading')}</p>
          ) : (
            <div className="learning-workspace">
              <nav className="learning-outline" aria-label={t('learn_outline')}>
                {lessonIds[path].map((item, index) => (
                  <Button
                    key={item}
                    variant="outline"
                    aria-current={item === id ? 'step' : undefined}
                    onClick={() => openLesson(item)}
                  >
                    {progress.lessons[lessonKey(path, item)]?.completed && (
                      <CheckCircle2 size={18} aria-label={t('learn_done')} />
                    )}
                    {index + 1}. {activeLessons![item].title}
                  </Button>
                ))}
              </nav>
              <article className="learning-lesson">
                <span className="eyebrow">
                  {t('learn_step', {
                    current: lessonIds[path].indexOf(id!) + 1,
                    total: summary!.total,
                  })}
                </span>
                <h2 ref={heading} tabIndex={-1}>
                  {lesson.title}
                </h2>
                <p>{lesson.body}</p>
                {lesson.code && (
                  <>
                    <h3>{t('learn_example')}</h3>
                    <pre tabIndex={0} role="region" aria-label={t('learn_example')}>
                      <code>{lesson.code}</code>
                    </pre>
                  </>
                )}
                <h3>{t('learn_practice')}</h3>
                <p>{lesson.practice}</p>
                <label htmlFor="practice">{t('learn_notes')}</label>
                <p id="practice-help">{t('learn_notes_hint')}</p>
                <textarea
                  id="practice"
                  aria-describedby="practice-help"
                  value={draft}
                  maxLength={10000}
                  onChange={(event) => {
                    save({
                      ...progress,
                      lessons: {
                        ...progress.lessons,
                        [key]: {
                          draft: event.target.value,
                          completed: progress.lessons[key]?.completed ?? false,
                        },
                      },
                    });
                  }}
                />
                <fieldset>
                  <legend>
                    <strong>{t('learn_check')}</strong>
                  </legend>
                  <p>{lesson.statement}</p>
                  {[true, false].map((value) => (
                    <label key={String(value)}>
                      <input
                        type="radio"
                        name="check"
                        checked={answer === value}
                        onChange={() => {
                          setAnswer(value);
                          setFeedback(null);
                        }}
                      />
                      {t(value ? 'learn_true' : 'learn_false')}
                    </label>
                  ))}
                </fieldset>
                <Button
                  onClick={() => {
                    if (draft.trim().length < 20 || answer === null) {
                      setFeedback('required');
                      return;
                    }
                    if (answer !== lesson.answer) {
                      setFeedback('incorrect');
                      return;
                    }
                    setSelected(id);
                    if (
                      save({
                        ...progress,
                        lessons: { ...progress.lessons, [key]: { draft, completed: true } },
                      })
                    )
                      setFeedback('success');
                  }}
                >
                  {t('learn_complete')}
                </Button>
                <div role="status" aria-live="polite">
                  {feedback && <p className="learning-feedback">{t(`learn_${feedback}`)}</p>}
                </div>
                <div className="learning-actions">
                  {progress.lessons[key]?.completed &&
                    lessonIds[path].indexOf(id!) < summary!.total - 1 && (
                      <Button
                        onClick={() =>
                          openLesson(lessonIds[path][lessonIds[path].indexOf(id!) + 1])
                        }
                      >
                        {t('learn_next')} <ArrowRight size={18} aria-hidden="true" />
                      </Button>
                    )}
                  <Link href="/learn" prefetch={false} className="button button-outline">
                    {t('learn_back')}
                  </Link>
                </div>
              </article>
            </div>
          )}
        </>
      )}
      {saveFailed && (
        <p role="alert" className="form-error">
          {t('learn_save_error')}
        </p>
      )}
      <p>{t('learn_storage')}</p>
      {path && <p>{t('learn_offline')}</p>}
    </div>
  );
}
