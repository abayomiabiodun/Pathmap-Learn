'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { useLearningProgress } from './learning-progress';
import {
  learningStats,
  readVisibility,
  visibilityFromQuiz,
  visibilitySchema,
  type Visibility,
  type LearnerCard,
} from '@/lib/engagement';
import { pathIds, pathNameKeys, type PathId } from '@/lib/quiz';
import { locales, localeNames } from '@/lib/preferences';
import {
  loadCommunity,
  saveVisibility,
  applyRecruiter,
  searchLearners,
  requestContact,
  respondContact,
  type CloudState,
} from '@/lib/supabase/engagement';

const emptyCloud: CloudState = { status: 'unconfigured', account: null, board: [] };
function useCommunity() {
  const [cloud, setCloud] = useState(emptyCloud);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  function refresh() {
    return loadCommunity()
      .then((next) => {
        setCloud(next);
        setError(false);
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }
  useEffect(() => {
    void refresh();
    const recorded = () => {
      void refresh();
    };
    window.addEventListener('pathmap-learning-recorded', recorded);
    return () => window.removeEventListener('pathmap-learning-recorded', recorded);
  }, []);
  return { cloud, loading, error, refresh };
}
function Navigation() {
  const t = useTranslations();
  return (
    <nav className="eng-nav" aria-label={t('eng_navigation')}>
      <Link prefetch={false} href="/dashboard">
        {t('eng_dashboard')}
      </Link>
      <Link prefetch={false} href="/learn">
        {t('eng_continue')}
      </Link>
      <Link prefetch={false} href="/recruiter">
        {t('eng_recruiter')}
      </Link>
    </nav>
  );
}
const subscribeStorage = (listener: () => void) => {
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
};
function useStored(key: string) {
  return useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
}
function Metrics({
  values,
}: {
  values: { streak: number; active_days: number; completed: number; xp: number };
}) {
  const t = useTranslations();
  return (
    <div className="eng-metrics">
      {(['streak', 'active_days', 'completed', 'xp'] as const).map((key) => (
        <div key={key}>
          <strong>{values[key]}</strong>
          {t(`eng_${key}`)}
        </div>
      ))}
    </div>
  );
}
function Status({
  cloud,
  loading,
  error,
  refresh,
}: {
  cloud: CloudState;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}) {
  const t = useTranslations();
  return (
    <p className="eng-status" role="status">
      {t(
        error
          ? 'eng_error'
          : loading
            ? 'eng_loading'
            : cloud.status === 'unconfigured'
              ? 'eng_unconfigured'
              : cloud.status === 'guest'
                ? 'eng_guest'
                : 'eng_connected',
      )}
      {!loading && cloud.status !== 'signed-in' && (
        <>
          <br />
          <Link prefetch={false} href="/auth">
            {t('signIn')}
          </Link>
        </>
      )}
      {error && (
        <button className="eng-button" onClick={() => void refresh()}>
          {t('ui_try_again')}
        </button>
      )}
    </p>
  );
}
export function Dashboard() {
  const t = useTranslations();
  const { progress } = useLearningProgress();
  const stats = learningStats(progress);
  const community = useCommunity();
  const { cloud } = community;
  const storedProfile = useStored('pathmap-visibility-v1');
  const quizProfile = visibilityFromQuiz(useStored('pathmap-quiz-v1'));
  const storedGoal = Number(useStored('pathmap-weekly-goal'));
  const [draftProfile, setProfile] = useState<Visibility | null>(null);
  const profile =
    draftProfile ??
    cloud.account?.profile ??
    (storedProfile ? readVisibility(storedProfile) : quizProfile);
  const [draftGoal, setGoal] = useState<number | null>(null);
  const goal =
    draftGoal ??
    (Number.isInteger(storedGoal) && storedGoal >= 1 && storedGoal <= 7 ? storedGoal : 3);
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<Record<string, string>>({});
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (community.loading || community.error) {
      setFeedback('eng_error');
      return;
    }
    const parsed = visibilitySchema.safeParse({
      ...profile,
      nickname: profile.nickname.trim(),
      location: profile.location.trim(),
    });
    if (!parsed.success) {
      setFeedback('eng_invalid');
      return;
    }
    setBusy(true);
    try {
      if (cloud.status === 'signed-in') await saveVisibility(parsed.data);
      localStorage.setItem('pathmap-visibility-v1', JSON.stringify(parsed.data));
      setFeedback(cloud.status === 'signed-in' ? 'eng_saved' : 'eng_local_saved');
      await community.refresh();
    } catch {
      setFeedback('eng_error');
    } finally {
      setBusy(false);
    }
  }
  async function respond(id: string, accepted: boolean) {
    setBusy(true);
    try {
      await respondContact(id, accepted, reply[id] ?? '');
      await community.refresh();
      setFeedback('eng_saved');
    } catch {
      setFeedback('eng_error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="engagement">
      <Navigation />
      <p>{t('eng_eyebrow')}</p>
      <h1>{t('eng_dashboard')}</h1>
      <p>{t('eng_intro')}</p>
      <Metrics
        values={{
          streak: stats.current,
          active_days: stats.active30,
          completed: stats.completed,
          xp: stats.xp,
        }}
      />
      <div className="eng-grid">
        <section className="eng-card">
          <h2>{t('eng_weekly')}</h2>
          <p>{t('eng_week_progress', { days: stats.week, goal })}</p>
          <div
            className="eng-goal-ring"
            aria-hidden="true"
            style={{
              background: `conic-gradient(var(--green) ${Math.min(stats.week / goal, 1) * 100}%, var(--border) 0)`,
            }}
          >
            <strong>
              {stats.week}/{goal}
            </strong>
          </div>
          <progress
            className="sr-only"
            value={Math.min(stats.week, goal)}
            max={goal}
            aria-label={t('eng_weekly')}
          />
          <label>
            {t('eng_goal')}
            <select
              value={goal}
              onChange={(event) => {
                const next = Number(event.target.value);
                setGoal(next);
                try {
                  localStorage.setItem('pathmap-weekly-goal', String(next));
                } catch {
                  setFeedback('eng_error');
                }
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <p>{t('eng_freeze')}</p>
          <p>
            {t('eng_best', { days: stats.best })} {stats.freezeUsed && t('eng_freeze_used')}
          </p>
          <Link className="eng-button" prefetch={false} href={`/learn/${profile.path}`}>
            {t('eng_continue')}
          </Link>
        </section>
        <section className="eng-card">
          <h2>{t('eng_top')}</h2>
          <p>{t('eng_ranking')}</p>
          <Status {...community} />
          {cloud.board.length ? (
            <ol className="eng-ranks">
              {cloud.board.map((row, index) => (
                <li key={row.id}>
                  <span className="rank">{index + 1}</span>
                  <div>
                    <strong>{row.nickname}</strong>
                    <span>{t(pathNameKeys[row.path])}</span>
                    <br />
                    <small>
                      {t('eng_rank_detail', {
                        days: row.active_days,
                        lessons: row.completed,
                        streak: row.streak,
                      })}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            !community.loading && <p>{t('eng_empty')}</p>
          )}
          <p>{t('eng_evidence')}</p>
        </section>
      </div>
      {cloud.account && (
        <section className="eng-card">
          <h2>{t('eng_verified')}</h2>
          <Metrics values={cloud.account.stats} />
          <p>{t('eng_verification')}</p>
        </section>
      )}
      <div className="eng-grid">
        <section className="eng-card">
          <h2>{t('eng_visibility')}</h2>
          <p>{t('eng_consent')}</p>
          <form onSubmit={save}>
            <label>
              {t('eng_nickname')}
              <input
                value={profile.nickname}
                minLength={2}
                maxLength={30}
                required
                onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
              />
            </label>
            <label>
              {t('eng_path')}
              <select
                value={profile.path}
                onChange={(e) => setProfile({ ...profile, path: e.target.value as PathId })}
              >
                {pathIds.map((path) => (
                  <option key={path} value={path}>
                    {t(pathNameKeys[path])}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('eng_level')}
              <select
                value={profile.level}
                onChange={(e) =>
                  setProfile({ ...profile, level: e.target.value as Visibility['level'] })
                }
              >
                {(['new', 'basics', 'built'] as const).map((level) => (
                  <option key={level} value={level}>
                    {t(`quiz_level_${level}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('language')}
              <select
                value={profile.language}
                onChange={(e) =>
                  setProfile({ ...profile, language: e.target.value as Visibility['language'] })
                }
              >
                {locales.map((lang) => (
                  <option key={lang} value={lang}>
                    {localeNames[lang]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('eng_location')}
              <input
                value={profile.location}
                maxLength={80}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              />
            </label>
            <label>
              {t('eng_opportunity')}
              <select
                value={profile.opportunity}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    opportunity: e.target.value as Visibility['opportunity'],
                  })
                }
              >
                {(['internship', 'job', 'both'] as const).map((kind) => (
                  <option key={kind} value={kind}>
                    {t(`eng_${kind}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="eng-check">
              <input
                type="checkbox"
                checked={profile.leaderboard}
                onChange={(e) => setProfile({ ...profile, leaderboard: e.target.checked })}
              />
              {t('eng_public_consent')}
            </label>
            <label className="eng-check">
              <input
                type="checkbox"
                checked={profile.recruiter}
                onChange={(e) => setProfile({ ...profile, recruiter: e.target.checked })}
              />
              {t('eng_recruiter_consent')}
            </label>
            <button className="eng-button" disabled={busy || community.loading || community.error}>
              {t('eng_save')}
            </button>
          </form>
        </section>
        <section className="eng-card">
          <h2>{t('eng_inbox')}</h2>
          <p>{t('eng_contact_control')}</p>
          {cloud.account?.requests.length ? (
            cloud.account.requests.map((request) => (
              <article key={request.id}>
                <h3>{request.company}</h3>
                <p>{request.message}</p>
                <p>{t(`eng_${request.status}`)}</p>
                {request.status === 'pending' && (
                  <>
                    <label>
                      {t('eng_reply')}
                      <textarea
                        maxLength={500}
                        value={reply[request.id] ?? ''}
                        onChange={(e) => setReply({ ...reply, [request.id]: e.target.value })}
                      />
                    </label>
                    <button
                      className="eng-button"
                      disabled={busy}
                      onClick={() => void respond(request.id, true)}
                    >
                      {t('eng_accept')}
                    </button>
                    <button
                      className="eng-button secondary"
                      disabled={busy}
                      onClick={() => void respond(request.id, false)}
                    >
                      {t('eng_decline')}
                    </button>
                  </>
                )}
              </article>
            ))
          ) : (
            <p>{t('eng_no_requests')}</p>
          )}
        </section>
      </div>
      {feedback && (
        <p className="eng-status" role="status">
          {t(feedback)}
        </p>
      )}
    </div>
  );
}
export function Recruiter() {
  const t = useTranslations();
  const community = useCommunity();
  const [company, setCompany] = useState('');
  const [filters, setFilters] = useState({
    path: '',
    language: '',
    level: '',
    location: '',
    opportunity: '',
  });
  const [learners, setLearners] = useState<LearnerCard[]>([]);
  const [searched, setSearched] = useState(false);
  const [target, setTarget] = useState('');
  const messageInput = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!target) return;
    messageInput.current?.focus();
    return () => {
      document.getElementById(`contact-${target}`)?.focus();
    };
  }, [target]);
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const approved = community.cloud.account?.recruiter?.approved;
  async function apply(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await applyRecruiter(company.trim());
      await community.refresh();
      setFeedback('eng_pending');
    } catch {
      setFeedback('eng_error');
    } finally {
      setBusy(false);
    }
  }
  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      setLearners(await searchLearners(filters));
      setSearched(true);
      setFeedback('');
    } catch {
      setLearners([]);
      setFeedback('eng_error');
    } finally {
      setBusy(false);
    }
  }
  async function contact(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await requestContact(target, message.trim());
      await community.refresh();
      setTarget('');
      setMessage('');
      setFeedback('eng_request_sent');
    } catch {
      setFeedback('eng_error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="engagement">
      <Navigation />
      <h1>{t('eng_recruiter')}</h1>
      <p>{t('eng_recruiter_intro')}</p>
      <Status {...community} />
      {community.cloud.status === 'signed-in' && !approved && (
        <section className="eng-card">
          <h2>{t('eng_approval')}</h2>
          <p>{t('eng_approval_detail')}</p>
          {community.cloud.account?.recruiter ? (
            <p>{t('eng_pending')}</p>
          ) : (
            <form onSubmit={apply}>
              <label>
                {t('eng_company')}
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </label>
              <button disabled={busy} className="eng-button">
                {t('eng_apply')}
              </button>
            </form>
          )}
        </section>
      )}
      {approved && (
        <>
          <form className="eng-card" onSubmit={search}>
            <h2>{t('eng_find')}</h2>
            <div className="eng-grid">
              <label>
                {t('eng_path')}
                <select
                  value={filters.path}
                  onChange={(e) => setFilters({ ...filters, path: e.target.value })}
                >
                  <option value="">{t('eng_all')}</option>
                  {pathIds.map((path) => (
                    <option key={path} value={path}>
                      {t(pathNameKeys[path])}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('language')}
                <select
                  value={filters.language}
                  onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                >
                  <option value="">{t('eng_all')}</option>
                  {locales.map((lang) => (
                    <option key={lang} value={lang}>
                      {localeNames[lang]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('eng_level')}
                <select
                  value={filters.level}
                  onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                >
                  <option value="">{t('eng_all')}</option>
                  {['new', 'basics', 'built'].map((level) => (
                    <option key={level} value={level}>
                      {t(`quiz_level_${level}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('eng_opportunity')}
                <select
                  value={filters.opportunity}
                  onChange={(e) => setFilters({ ...filters, opportunity: e.target.value })}
                >
                  <option value="">{t('eng_all')}</option>
                  {['internship', 'job'].map((kind) => (
                    <option key={kind} value={kind}>
                      {t(`eng_${kind}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('eng_location')}
                <input
                  maxLength={80}
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                />
              </label>
            </div>
            <button className="eng-button" disabled={busy}>
              {t('eng_search')}
            </button>
          </form>
          <p>{t('eng_evidence')}</p>
          <section className="eng-card">
            <h2>{t('eng_sent_requests')}</h2>
            {community.cloud.account?.sent.length ? (
              community.cloud.account.sent.map((request) => (
                <article key={request.id}>
                  <h3>{request.company}</h3>
                  <p>{request.message}</p>
                  <p>{t(`eng_${request.status}`)}</p>
                  {request.reply && <p>{request.reply}</p>}
                </article>
              ))
            ) : (
              <p>{t('eng_no_requests')}</p>
            )}
          </section>
          <div className="eng-grid">
            {learners.map((learner) => (
              <article className="eng-card" key={learner.id}>
                <h2>{learner.nickname}</h2>
                <p>
                  {t(pathNameKeys[learner.path])} · {t(`quiz_level_${learner.level}`)}
                </p>
                <p>
                  {localeNames[learner.language]} · {learner.location} ·{' '}
                  {t(`eng_${learner.opportunity}`)}
                </p>
                <Metrics values={learner} />
                <button
                  id={`contact-${learner.id}`}
                  className="eng-button"
                  disabled={busy || target === learner.id}
                  aria-expanded={target === learner.id}
                  onClick={() => {
                    setTarget(learner.id);
                    setMessage('');
                  }}
                >
                  {t('eng_request')}
                </button>
                {target === learner.id && (
                  <form onSubmit={contact}>
                    <h3>{t('eng_request')}</h3>
                    <label>
                      {t('eng_message')}
                      <textarea
                        ref={messageInput}
                        required
                        minLength={10}
                        maxLength={500}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                    </label>
                    <button className="eng-button" disabled={busy}>
                      {t('eng_send')}
                    </button>
                    <button
                      type="button"
                      className="eng-button secondary"
                      disabled={busy}
                      onClick={() => setTarget('')}
                    >
                      {t('eng_cancel')}
                    </button>
                  </form>
                )}
              </article>
            ))}
          </div>
          {searched && !learners.length && <p>{t('eng_empty_candidates')}</p>}
        </>
      )}
      {feedback && (
        <p className="eng-status" role="status">
          {t(feedback)}
        </p>
      )}
    </div>
  );
}
