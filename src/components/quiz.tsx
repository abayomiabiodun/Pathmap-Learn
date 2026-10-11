'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Check, Compass, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { usePreferences } from './providers';
import { localeNames, type Locale } from '@/lib/preferences';
import {
  answerOptions,
  answersSchema,
  completeQuiz,
  completeKnownPath,
  knownPathSchema,
  emptyQuiz,
  pathIds,
  pathNameKeys,
  questionIds,
  readQuiz,
  scoreQuiz,
  type QuestionId,
  type QuizStorage,
} from '@/lib/quiz';

const storageKey = 'pathmap-quiz-v1';
const listeners = new Set<() => void>();
let rawCache: string | null | undefined;
let stateCache = emptyQuiz;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
};
const snapshot = () => {
  let raw: string | null;
  try {
    raw = localStorage.getItem(storageKey);
  } catch {
    raw = null;
  }
  if (raw !== rawCache) {
    rawCache = raw;
    stateCache = readQuiz(raw);
  }
  return stateCache;
};
const serverSnapshot = () => emptyQuiz;
export function useQuizStorage() {
  const state = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [saveFailed, setSaveFailed] = useState(false);
  const save = (next: QuizStorage) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setSaveFailed(false);
      listeners.forEach((listener) => listener());
      return true;
    } catch {
      setSaveFailed(true);
      return false;
    }
  };
  return { state, save, saveFailed };
}
function optionKey(question: QuestionId, option: string) {
  return `quiz_${question}_${option}`;
}
export function Quiz() {
  const t = useTranslations();
  const router = useRouter();
  const { state, save, saveFailed } = useQuizStorage();
  const [position, setPosition] = useState<number | null>(null);
  const nextUnanswered = questionIds.findIndex((id) => !state.draft[id]);
  const index = position ?? (nextUnanswered < 0 ? questionIds.length - 1 : nextUnanswered);
  const question = questionIds[index];
  const selected = state.draft[question];
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [index]);
  function next() {
    if (index < questionIds.length - 1) {
      setPosition(index + 1);
      return;
    }
    const parsed = answersSchema.safeParse(state.draft);
    if (!parsed.success) {
      setPosition(questionIds.findIndex((id) => !state.draft[id]));
      return;
    }
    if (save(completeQuiz(state, parsed.data, new Date().toISOString()))) {
      if (!navigator.onLine) {
        // Offline navigation needs cached HTML; the worker excludes Next.js RSC requests.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign('/quiz/results');
      } else router.push('/quiz/results');
    }
  }
  return (
    <div className="page-container quiz-container">
      <span className="eyebrow">{t('quiz_eyebrow')}</span>
      <div className="quiz-progress-label">
        <span>{t('quiz_question_count', { current: index + 1, total: questionIds.length })}</span>
        {!saveFailed && <span>{t('quiz_saved')}</span>}
      </div>
      <progress
        className="quiz-progress"
        value={index + 1}
        max={questionIds.length}
        aria-label={t('quiz_progress')}
      />
      <h1 ref={heading} tabIndex={-1}>
        {t(`quiz_question_${question}`)}
      </h1>
      <p>
        {t(
          question === 'interest' || question === 'strength'
            ? 'quiz_choose_hint'
            : 'quiz_tailoring_hint',
        )}
      </p>
      <fieldset className="quiz-options" key={question}>
        <legend className="sr-only">{t(`quiz_question_${question}`)}</legend>
        {answerOptions[question].map((option) => {
          const label =
            question === 'language'
              ? localeNames[option as Locale]
              : t(optionKey(question, option));
          return (
            <label className={`quiz-option ${selected === option ? 'selected' : ''}`} key={option}>
              <input
                type="radio"
                name={question}
                value={option}
                checked={selected === option}
                onChange={() => {
                  setPosition(index);
                  save({ ...state, draft: { ...state.draft, [question]: option } });
                }}
              />
              <span>{label}</span>
              {selected === option && <Check size={20} aria-hidden="true" />}
            </label>
          );
        })}
      </fieldset>
      {saveFailed && (
        <p role="alert" className="form-error">
          {t('quiz_save_error')}
        </p>
      )}
      <div className="quiz-actions">
        <Button variant="outline" disabled={index === 0} onClick={() => setPosition(index - 1)}>
          <ArrowLeft size={18} />
          {t('quiz_back')}
        </Button>
        <Button disabled={!selected} onClick={next}>
          {t(index === questionIds.length - 1 ? 'quiz_show_results' : 'quiz_next')}
          <ArrowRight size={18} />
        </Button>
      </div>
      <p className="quiz-note">{t('quiz_privacy')}</p>
    </div>
  );
}

export function KnownPath() {
  const t = useTranslations();
  const { update } = usePreferences();
  const { state, save, saveFailed } = useQuizStorage();
  const [position, setPosition] = useState<number | null>(null);
  const steps = ['interest', 'level', 'language'] as const;
  const latest = state.selections.at(-1);
  const ready = position === null && !!latest && Object.keys(state.knownDraft).length === 0;
  const unanswered = steps.findIndex((key) => !state.knownDraft[key]);
  const index = position ?? (unanswered < 0 ? steps.length - 1 : unanswered);
  const question = steps[index];
  const selected = state.knownDraft[question];
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [index, ready]);
  function next() {
    if (index < 2) {
      setPosition(index + 1);
      return;
    }
    const parsed = knownPathSchema.safeParse(state.knownDraft);
    if (parsed.success && save(completeKnownPath(state, parsed.data, new Date().toISOString())))
      setPosition(null);
  }
  return (
    <div className="page-container quiz-container">
      <span className="eyebrow">{t('known_eyebrow')}</span>
      {ready ? (
        <>
          <h1 ref={heading} tabIndex={-1}>
            {t('known_ready_heading')}
          </h1>
          <p>{t('known_ready_intro')}</p>
          <section className="quiz-strength">
            <h2>{t(pathNameKeys[latest!.path])}</h2>
            <p>
              {t('known_summary', {
                level: t(optionKey('level', latest!.level)),
                language: localeNames[latest!.language],
              })}
            </p>
            <h3>{t('quiz_next_step')}</h3>
            <p>{t(`quiz_first_step_${latest!.path}`)}</p>
          </section>
          <div className="quiz-actions">
            <Link
              href="/taster"
              prefetch={false}
              onClick={() => update({ locale: latest!.language })}
              className="button button-primary"
            >
              {t('taster_try')}
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                if (
                  save({
                    ...state,
                    knownDraft: {
                      interest: latest!.path,
                      level: latest!.level,
                      language: latest!.language,
                    },
                  })
                )
                  setPosition(0);
              }}
            >
              {t('known_edit')}
            </Button>
            <Link
              href={`/learn/${latest!.path}`}
              prefetch={false}
              onClick={() => update({ locale: latest!.language })}
              className="button button-primary"
            >
              {t('learn_start')}
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="quiz-progress-label">
            <span>{t('known_count', { current: index + 1, total: steps.length })}</span>
            {!saveFailed && <span>{t('quiz_saved')}</span>}
          </div>
          <progress
            className="quiz-progress"
            value={index + 1}
            max={steps.length}
            aria-label={t('quiz_progress')}
          />
          <h1 ref={heading} tabIndex={-1}>
            {t(question === 'interest' ? 'known_question' : `quiz_question_${question}`)}
          </h1>
          <p>{t('known_intro')}</p>
          <fieldset className="quiz-options" key={question}>
            <legend className="sr-only">
              {t(question === 'interest' ? 'known_question' : `quiz_question_${question}`)}
            </legend>
            {answerOptions[question].map((option) => (
              <label
                className={`quiz-option ${selected === option ? 'selected' : ''}`}
                key={option}
              >
                <input
                  type="radio"
                  name={question}
                  checked={selected === option}
                  value={option}
                  onChange={() => {
                    setPosition(index);
                    save({ ...state, knownDraft: { ...state.knownDraft, [question]: option } });
                  }}
                />
                <span>
                  {question === 'interest'
                    ? t(pathNameKeys[option as keyof typeof pathNameKeys])
                    : question === 'language'
                      ? localeNames[option as Locale]
                      : t(optionKey(question, option))}
                </span>
                {selected === option && <Check size={20} aria-hidden="true" />}
              </label>
            ))}
          </fieldset>
          <div className="quiz-actions">
            <Button variant="outline" disabled={index === 0} onClick={() => setPosition(index - 1)}>
              <ArrowLeft size={18} />
              {t('quiz_back')}
            </Button>
            <Button disabled={!selected} onClick={next}>
              {t(index === 2 ? 'known_finish' : 'quiz_next')}
              <ArrowRight size={18} />
            </Button>
          </div>
        </>
      )}
      {saveFailed && (
        <p role="alert" className="form-error">
          {t('quiz_save_error')}
        </p>
      )}
      <p className="quiz-note">{t('known_privacy')}</p>
    </div>
  );
}

export function QuizResults() {
  const t = useTranslations();
  const { update } = usePreferences();
  const router = useRouter();
  const { state, save, saveFailed } = useQuizStorage();
  const attempt = state.attempts.at(-1);
  if (!attempt)
    return (
      <div className="page-container empty-state">
        <Compass size={40} aria-hidden="true" />
        <h1>{t('quiz_no_results')}</h1>
        <p>{t('quiz_no_results_text')}</p>
        <Link href="/quiz" className="button button-primary">
          {t('start')}
        </Link>
      </div>
    );
  const result = scoreQuiz(attempt.answers);
  const primary = result.scores.find((item) => item.path === attempt.chosenPath)!;
  const other = result.scores.find((item) => item.path !== primary.path)!;
  function choose(path: (typeof pathIds)[number]) {
    const attempts = [...state.attempts];
    attempts[attempts.length - 1] = { ...attempt!, chosenPath: path };
    save({ ...state, attempts });
  }
  return (
    <div className="page-container quiz-container quiz-results">
      <span className="eyebrow">
        <Sparkles size={18} aria-hidden="true" />
        {t('quiz_results_eyebrow')}
      </span>
      <h1>{t('quiz_results_heading')}</h1>
      <p>{t('quiz_results_intro')}</p>
      <section className="quiz-strength" aria-labelledby="strength-heading">
        <h2 id="strength-heading">{t('quiz_strength_heading')}</h2>
        <h3>{t(`quiz_strength_${result.strength}`)}</h3>
        <p>{t(`quiz_strength_description_${result.strength}`)}</p>
      </section>
      <div className="quiz-result-grid">
        {[primary, other].map((item, index) => (
          <section className={`quiz-result-card ${index === 0 ? 'primary' : ''}`} key={item.path}>
            <span className="eyebrow">
              {t(index === 0 ? 'quiz_chosen_path' : 'quiz_alternative')}
            </span>
            <h2>{t(pathNameKeys[item.path])}</h2>
            <p className="quiz-match">{t('quiz_match', { percent: item.match })}</p>
            <h3>{t('quiz_why')}</h3>
            <ul>
              {item.contributions.map((item) => (
                <li key={item.question}>
                  {t(`quiz_reason_${item.question}`, {
                    answer: t(optionKey(item.question, item.option)),
                  })}
                </li>
              ))}
            </ul>
            {index === 1 && (
              <Button variant="outline" onClick={() => choose(item.path)}>
                {t('quiz_choose_alternative')}
              </Button>
            )}
          </section>
        ))}
      </div>
      <section aria-labelledby="breakdown-heading">
        <h2 id="breakdown-heading">{t('quiz_breakdown')}</h2>
        <p>{t('quiz_match_note')}</p>
        <div className="quiz-breakdown">
          {result.scores.map((item) => (
            <div key={item.path}>
              <div className="quiz-progress-label">
                <span>{t(pathNameKeys[item.path])}</span>
                <strong>{t('quiz_percent', { percent: item.match })}</strong>
              </div>
              <progress
                className="quiz-progress"
                value={item.match}
                max={100}
                aria-label={t(pathNameKeys[item.path])}
              />
            </div>
          ))}
        </div>
      </section>
      <section className="quiz-strength">
        <h2>{t('quiz_next_step')}</h2>
        <p>{t(`quiz_first_step_${attempt.chosenPath}`)}</p>
        <p>
          {t('quiz_tailoring_summary', {
            level: t(optionKey('level', attempt.answers.level)),
            language: localeNames[attempt.answers.language],
            style: t(optionKey('style', attempt.answers.style)),
            time: t(optionKey('time', attempt.answers.time)),
          })}
        </p>
      </section>
      {saveFailed && (
        <p role="alert" className="form-error">
          {t('quiz_save_error')}
        </p>
      )}
      <div className="quiz-actions">
        <Link
          href="/taster"
          prefetch={false}
          onClick={() => update({ locale: attempt.answers.language })}
          className="button button-primary"
        >
          {t('taster_try')}
        </Link>
        <Button
          variant="outline"
          onClick={() => {
            if (save({ ...state, draft: {} })) router.push('/quiz');
          }}
        >
          {t('quiz_retake')}
        </Button>
        <Link href="/paths" prefetch={false} className="button button-outline">
          {t('ui_explore_all_10_paths')}
          <ArrowRight size={18} />
        </Link>
      </div>
      <p className="quiz-note">{t('quiz_privacy')}</p>
    </div>
  );
}
