'use client';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from './ui/button';
import { useQuizStorage } from './quiz';
import { pathNameKeys, type PathId } from '@/lib/quiz';
import { lessonIds, type Lesson } from '@/lib/learning';
import { acceptTaster, readTaster, tasterChoices, tasterRatings } from '@/lib/taster';
import './taster.css';

export function Taster() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { state, save, saveFailed } = useQuizStorage();
  const choice = tasterChoices(JSON.stringify(state));
  const [preview, setPreview] = useState<PathId | null>(null);
  const path = preview ?? choice?.path;
  const [catalog, setCatalog] = useState<{
    locale: string;
    lessons: Record<string, Lesson>;
  } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [practice, setPractice] = useState('');
  const [rating, setRating] = useState<(typeof tasterRatings)[number] | null>(null);
  const [writeError, setWriteError] = useState(false);
  const [finished, setFinished] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    fetch(`/lessons/${locale}.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Unavailable');
        return response.json();
      })
      .then((lessons: Record<string, Lesson>) => {
        if (controller.signal.aborted) return;
        if (
          !lessonIds[path].every(
            (id) =>
              typeof lessons[id]?.body === 'string' && typeof lessons[id]?.answer === 'boolean',
          )
        )
          throw new Error('Invalid catalog');
        setCatalog({ locale, lessons });
        setLoadError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
      });
    return () => controller.abort();
  }, [path, locale, retry]);
  const lessons =
    catalog?.locale === locale && path
      ? lessonIds[path].slice(0, 3).map((id) => catalog.lessons[id])
      : null;
  const lesson = lessons?.[Math.min(round, 2)];
  function focusTitle() {
    requestAnimationFrame(() => title.current?.focus());
  }
  function reset(next: PathId) {
    setPreview(next);
    setStarted(false);
    setRound(0);
    setSolved(false);
    setWrong(false);
    setAttempts(0);
    setPractice('');
    setRating(null);
    setWriteError(false);
    setFinished(false);
    focusTitle();
  }
  function rate(value: (typeof tasterRatings)[number]) {
    if (!path || !choice || practice.trim().length < 20) return;
    try {
      const at = new Date().toISOString();
      const previous = readTaster(localStorage.getItem('pathmap-taster-v1'));
      localStorage.setItem(
        'pathmap-taster-v1',
        JSON.stringify({
          version: 1,
          sessions: [
            ...previous.sessions,
            { path, rating: value, completedAt: at, practice, attempts },
          ].slice(-25),
        }),
      );
      if (value !== 'not-for-me' && !save(acceptTaster(state, path, at))) {
        setWriteError(true);
        return;
      }
      setRating(value);
      setWriteError(false);
      setFinished(true);
      focusTitle();
    } catch {
      setWriteError(true);
    }
  }
  return (
    <div className="page-container taster">
      <span className="eyebrow">{t('taster_eyebrow')}</span>
      <h1 ref={title} tabIndex={-1}>
        {t('taster_title')}
      </h1>
      <p>{t('taster_intro')}</p>
      <Link href="/quiz" prefetch={false} className="button button-outline">
        {t('taster_quiz')}
      </Link>
      {!choice || !path ? (
        <section className="taster-panel">
          <h2>{t('taster_need_quiz')}</h2>
          <p>{t('learn_assess_first')}</p>
          <Link href="/quiz" className="button button-primary">
            {t('quiz_eyebrow')}
          </Link>
        </section>
      ) : (
        <section className="taster-panel" aria-label={t(pathNameKeys[path])}>
          <h2>{t(pathNameKeys[path])}</h2>
          {finished ? (
            <>
              <h3>{t(rating === 'not-for-me' ? 'taster_no_fit' : 'taster_ready')}</h3>
              <p>{t(`taster_result_${rating}`)}</p>
              {rating !== 'not-for-me' ? (
                <Link href="/learn" prefetch={false} className="button button-primary">
                  {t('taster_continue')}
                </Link>
              ) : (
                <>
                  {choice.alternative && choice.alternative !== path ? (
                    <>
                      <p>{t('taster_second', { path: t(pathNameKeys[choice.alternative]) })}</p>
                      <Button onClick={() => reset(choice.alternative!)}>
                        {t('taster_try_second')}
                      </Button>
                    </>
                  ) : (
                    <p>{t('taster_reassess')}</p>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (save({ ...state, draft: {} })) router.push('/quiz');
                    }}
                  >
                    {t('quiz_retake')}
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => reset(path)}>
                {t('taster_replay')}
              </Button>
            </>
          ) : loadError ? (
            <>
              <p role="alert">{t('learn_load_error')}</p>
              <Button
                onClick={() => {
                  setLoadError(false);
                  setRetry((value) => value + 1);
                }}
              >
                {t('learn_retry')}
              </Button>
            </>
          ) : !lessons || !lesson ? (
            <p role="status">{t('learn_loading')}</p>
          ) : !started ? (
            <>
              <p>{t('taster_plan')}</p>
              <p>{t('taster_rules')}</p>
              <Button
                onClick={() => {
                  setStarted(true);
                  focusTitle();
                }}
              >
                {t('taster_begin')}
              </Button>
            </>
          ) : (
            <>
              <p>{t('taster_round', { current: Math.min(round + 1, 3), total: 3 })}</p>
              <progress
                value={round + (solved ? 1 : 0)}
                max={3}
                aria-label={t('taster_progress')}
              />
              <p className="taster-stars" aria-hidden="true">
                {'★'.repeat(round + (solved ? 1 : 0))}
                {'☆'.repeat(3 - round - (solved ? 1 : 0))}
              </p>
              {round < 3 ? (
                <>
                  <h3>{lesson.title}</h3>
                  <p>{lesson.body}</p>
                  {lesson.code && (
                    <pre tabIndex={0} role="region" aria-label={t('learn_example')}>
                      <code>{lesson.code}</code>
                    </pre>
                  )}
                  <fieldset disabled={solved}>
                    <legend>{t('taster_challenge')}</legend>
                    <p>{lesson.statement}</p>
                    <div className="taster-actions">
                      {[true, false].map((value) => (
                        <Button
                          key={String(value)}
                          variant="outline"
                          onClick={() => {
                            setAttempts((count) => count + 1);
                            setSolved(value === lesson.answer);
                            setWrong(value !== lesson.answer);
                          }}
                        >
                          {t(value ? 'learn_true' : 'learn_false')}
                        </Button>
                      ))}
                    </div>
                  </fieldset>
                  <div role="status" aria-live="polite">
                    {wrong && <p>{t('taster_wrong')}</p>}
                    {solved && <p>{t('taster_correct')}</p>}
                  </div>
                  {solved && (
                    <Button
                      onClick={() => {
                        setRound((value) => value + 1);
                        setSolved(false);
                        setWrong(false);
                        focusTitle();
                      }}
                    >
                      {t(round === 2 ? 'taster_build' : 'taster_next')}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <h3>{t('taster_build')}</h3>
                  <p>{lessons[0].practice}</p>
                  <label htmlFor="taster-practice">{t('learn_notes')}</label>
                  <p id="taster-hint">{t('taster_practice_hint')}</p>
                  <textarea
                    id="taster-practice"
                    value={practice}
                    maxLength={10000}
                    aria-describedby="taster-hint"
                    onChange={(event) => setPractice(event.target.value)}
                  />
                  <fieldset disabled={practice.trim().length < 20}>
                    <legend>{t('taster_rate')}</legend>
                    <div className="taster-actions">
                      {tasterRatings.map((value) => (
                        <Button key={value} variant="outline" onClick={() => rate(value)}>
                          {t(`taster_rating_${value}`)}
                        </Button>
                      ))}
                    </div>
                  </fieldset>
                </>
              )}
            </>
          )}
        </section>
      )}
      {(saveFailed || writeError) && <p role="alert">{t('learn_save_error')}</p>}
      <p className="taster-note">{t('taster_storage')}</p>
    </div>
  );
}
