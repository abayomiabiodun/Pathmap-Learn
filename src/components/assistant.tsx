'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePreferences } from './providers';
import { locales, localeNames, type Locale } from '@/lib/preferences';
import { courseOutline } from '@/lib/course-outline';
import { pathNameKeys, learningPathFromQuiz, type PathId } from '@/lib/quiz';
import { answerQuestion, lessonKnowledge, guides, type Knowledge } from '@/lib/assistant';
import type { Lesson } from '@/lib/learning';
import { SpeechInput, ReadAloud } from './assistant-speech';

type Turn = {
  question: string;
  sources: Knowledge[];
  followUp: boolean;
  locale: Locale;
  copy: { unknown: string; try: string; coach: string; source: string; mentor: string };
};
const subscribeQuiz = (listener: () => void) => {
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
};
const quizSnapshot = () => localStorage.getItem('pathmap-quiz-v1');
const noQuiz = () => null;
export function Assistant() {
  const t = useTranslations();
  const { preferences, update } = usePreferences();
  const locale = preferences.locale;
  const [catalog, setCatalog] = useState<{ locale: Locale; lessons: Record<string, Lesson> }>();
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [question, setQuestion] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceSession, setVoiceSession] = useState(0);
  const [chosenFocus, setPath] = useState<string>();
  const rawQuiz = useSyncExternalStore(subscribeQuiz, quizSnapshot, noQuiz);
  const path = chosenFocus ?? learningPathFromQuiz(rawQuiz) ?? '';
  const [turns, setTurns] = useState<Turn[]>([]);
  const [lastId, setLastId] = useState<string>();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/lessons/${locale}.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Unavailable');
        return response.json();
      })
      .then((lessons: Record<string, Lesson>) => {
        if (
          !Object.values(courseOutline)
            .flat()
            .every((id) => typeof lessons[id]?.body === 'string')
        )
          throw new Error('Invalid catalog');
        if (!controller.signal.aborted) {
          setCatalog({ locale, lessons });
          setFailed(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [locale, retry]);
  useEffect(() => {
    const container = end.current?.parentElement;
    const latest = end.current?.previousElementSibling;
    if (container && latest)
      container.scrollTop +=
        latest.getBoundingClientRect().top - container.getBoundingClientRect().top - 16;
  }, [turns]);
  const ready = catalog?.locale === locale;
  const conceptPrompt =
    path && ready && path in courseOutline
      ? catalog.lessons[courseOutline[path as PathId][0]].title
      : t('assistant_prompt_concept');
  function ask(value: string) {
    if (!ready || !value.trim()) return;
    const documents = [
      ...lessonKnowledge(catalog.lessons),
      ...guides.map(([id, href, key]) => ({
        id: `guide-${id}`,
        href,
        title: t(key),
        body: t(`assistant_guide_${id}`),
      })),
    ];
    const answer = answerQuestion(value.trim().slice(0, 600), documents, lastId, path);
    setTurns((current) => [
      ...current.slice(-19),
      {
        question: value.trim().slice(0, 600),
        ...answer,
        locale,
        copy: {
          unknown: t('assistant_unknown'),
          try: t('assistant_try'),
          coach: t('assistant_coach'),
          source: t('assistant_source'),
          mentor: t('comm_mentors'),
        },
      },
    ]);
    setLastId(answer.sources[0]?.id);
    setQuestion('');
  }
  return (
    <div className="page-container assistant-page">
      <span className="eyebrow">{t('assistant_label')}</span>
      <h1>{t('assistant_title')}</h1>
      <p className="assistant-intro">{t('assistant_intro')}</p>
      <div className="assistant-controls">
        <label>
          {t('language')}
          <select
            value={locale}
            onChange={(event) => update({ locale: event.target.value as Locale })}
          >
            {locales.map((value) => (
              <option key={value} value={value}>
                {localeNames[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('assistant_course')}
          <select
            value={path}
            onChange={(event) => {
              setPath(event.target.value);
              setLastId(undefined);
            }}
          >
            <option value="">{t('assistant_all')}</option>
            {Object.keys(courseOutline).map((value) => (
              <option key={value} value={value}>
                {t(pathNameKeys[value as PathId])}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button button-outline"
          onClick={() => {
            setTurns([]);
            setLastId(undefined);
            setQuestion('');
            setVoiceSession((value) => value + 1);
          }}
        >
          {t('assistant_clear')}
        </button>
      </div>
      <form
        className="assistant-composer"
        onSubmit={(event) => {
          event.preventDefault();
          ask(question);
        }}
      >
        <label htmlFor="assistant-question">{t('assistant_question')}</label>
        <textarea
          id="assistant-question"
          maxLength={600}
          rows={3}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={t('assistant_placeholder')}
          required
          disabled={listening}
        />
        <p className="assistant-footnote">{t('voice_notice')}</p>
        <SpeechInput
          key={`${locale}-${voiceSession}`}
          locale={locale}
          value={question}
          onChange={setQuestion}
          onListening={setListening}
        />
        <button
          className="button button-primary"
          disabled={!ready || !question.trim() || listening}
        >
          {t('assistant_send')}
        </button>
      </form>
      <div className="assistant-notice">
        {t('assistant_limits')}{' '}
        <Link prefetch={false} href="/circles/mentors">
          {t('comm_mentors')}
        </Link>
      </div>
      {!ready && (
        <p role="status">
          {failed ? t('assistant_failed') : t('assistant_loading')}
          {failed && (
            <button
              className="button button-outline"
              onClick={() => {
                setFailed(false);
                setRetry(retry + 1);
              }}
            >
              {t('assistant_retry')}
            </button>
          )}
        </p>
      )}
      <div className="assistant-prompts" aria-label={t('assistant_suggestions')}>
        {['navigation', 'concept', 'mentor'].map((key) => (
          <button
            className="button button-outline"
            key={key}
            disabled={!ready || listening}
            onClick={() => ask(key === 'concept' ? conceptPrompt : t(`assistant_prompt_${key}`))}
          >
            {key === 'concept' ? conceptPrompt : t(`assistant_prompt_${key}`)}
          </button>
        ))}
      </div>
      <div
        className="assistant-transcript"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={t('assistant_conversation')}
        tabIndex={0}
      >
        {turns.length === 0 && <p>{t('assistant_welcome')}</p>}
        {turns.map((turn, index) => (
          <article key={`${index}-${locale}`} lang={turn.locale}>
            <p className="assistant-question">
              <strong>{turn.question}</strong>
            </p>
            <div className="assistant-answer">
              <ReadAloud
                disabled={listening}
                locale={turn.locale}
                text={
                  turn.sources.length
                    ? turn.sources
                        .map((source) =>
                          [
                            source.title,
                            source.body,
                            source.practice,
                            source.practice && turn.copy.coach,
                          ]
                            .filter(Boolean)
                            .join('\n'),
                        )
                        .join('\n\n')
                    : turn.copy.unknown
                }
              />
              {!turn.sources.length ? (
                <>
                  <p>{turn.copy.unknown}</p>
                  <Link href="/circles/mentors" prefetch={false}>
                    {turn.copy.mentor}
                  </Link>
                </>
              ) : (
                turn.sources.map((source) => (
                  <section key={source.id}>
                    <h2>{source.title}</h2>
                    <p className="assistant-material">{source.body}</p>
                    {source.code && (
                      <pre tabIndex={0} aria-label={source.title}>
                        <code>{source.code}</code>
                      </pre>
                    )}
                    {source.practice && (
                      <>
                        <h3>{turn.copy.try}</h3>
                        <p>{source.practice}</p>
                        <p>{turn.copy.coach}</p>
                      </>
                    )}
                    <Link prefetch={false} href={source.href}>
                      {turn.copy.source}: {source.title}
                    </Link>
                  </section>
                ))
              )}
            </div>
          </article>
        ))}
        <div ref={end} />
      </div>
      <p className="assistant-footnote">{t('assistant_private')}</p>
    </div>
  );
}
