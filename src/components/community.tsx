'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { pathIds, pathNameKeys, type PathId } from '@/lib/quiz';
import { locales, localeNames } from '@/lib/preferences';
import { visibilityFromQuiz } from '@/lib/engagement';
import {
  communityProfileSchema,
  mentorBioSchema,
  validMessage,
  readCommunityDraft,
  sessionDate,
  type CommunityProfile,
} from '@/lib/community';
import {
  loadCircles,
  emptyCircleState,
  joinCircle,
  leaveCircle,
  postMessage,
  removePost,
  reportPost,
  mentorDirectory,
  applyMentor,
  requestGuidance,
  sendGuidance,
  proposeSession,
  confirmSession,
  closeGuidance,
  type CircleState,
  type Mentor,
  type Guidance,
} from '@/lib/supabase/community';

const storageSubscribe = (listener: () => void) => {
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
};
function useStored(key: string) {
  return useSyncExternalStore(
    storageSubscribe,
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
function useDraft(key: string) {
  const saved = useStored(key);
  const [edited, setEdited] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  const value = edited ?? readCommunityDraft(saved);
  function update(next: string) {
    setEdited(next);
    try {
      localStorage.setItem(key, next);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  return { value, update, storageError };
}
async function fetchCommunity() {
  const data = await loadCircles();
  const mentors =
    data.status === 'signed-in' && data.profile && data.circle
      ? await mentorDirectory(data.profile.path, data.profile.language)
      : [];
  return { data, mentors };
}
type Action = (work: () => Promise<unknown>, done?: () => void) => Promise<void>;
function GuidanceCard({ item, busy, act }: { item: Guidance; busy: boolean; act: Action }) {
  const t = useTranslations();
  const format = useFormatter();
  const [body, setBody] = useState('');
  const [date, setDate] = useState('');
  const [invalid, setInvalid] = useState(false);
  const closed = item.status === 'closed';
  return (
    <article className="eng-card guidance-card">
      <h3>{item.nickname}</h3>
      <p className="community-text">{item.question}</p>
      <p className="community-badge">{t(`comm_status_${item.status}`)}</p>
      {item.session_at && (
        <p>
          {t('comm_session_at', {
            date: format.dateTime(new Date(item.session_at), {
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
          })}{' '}
          <span>{t('comm_lagos')}</span>
        </p>
      )}
      <ul className="community-messages" aria-label={t('comm_conversation')}>
        {item.messages.map((message) => (
          <li key={message.id}>
            <strong>{message.own ? t('comm_you') : item.nickname}</strong>
            <p className="community-text">{message.body}</p>
            <time dateTime={message.created_at}>
              {format.dateTime(new Date(message.created_at), {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </time>
          </li>
        ))}
      </ul>
      {!closed && (
        <>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!validMessage(body)) {
                setInvalid(true);
                return;
              }
              setInvalid(false);
              void act(
                () => sendGuidance(item.id, body.trim()),
                () => setBody(''),
              );
            }}
          >
            <label htmlFor={`guidance-${item.id}`}>{t('comm_private_reply')}</label>
            <textarea
              id={`guidance-${item.id}`}
              value={body}
              maxLength={2000}
              onChange={(event) => setBody(event.target.value)}
              required
              aria-describedby={`guidance-hint-${item.id}`}
            />
            <p id={`guidance-hint-${item.id}`}>{t('comm_length')}</p>
            <button className="eng-button" disabled={busy}>
              {t('comm_send_reply')}
            </button>
          </form>
          {item.mentor_side ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const iso = sessionDate(date);
                if (!iso) {
                  setInvalid(true);
                  return;
                }
                setInvalid(false);
                void act(
                  () => proposeSession(item.id, iso),
                  () => setDate(''),
                );
              }}
            >
              <label htmlFor={`session-${item.id}`}>{t('comm_propose')}</label>
              <input
                id={`session-${item.id}`}
                type="datetime-local"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
              <p>{t('comm_session_hint')}</p>
              <button className="eng-button secondary" disabled={busy}>
                {t('comm_propose')}
              </button>
            </form>
          ) : (
            item.status === 'proposed' && (
              <button
                className="eng-button"
                disabled={busy}
                onClick={() => void act(() => confirmSession(item.id))}
              >
                {t('comm_confirm')}
              </button>
            )
          )}
          <button
            className="eng-button secondary"
            disabled={busy}
            onClick={() => void act(() => closeGuidance(item.id))}
          >
            {t('comm_close')}
          </button>
        </>
      )}
      {invalid && <p role="alert">{t('comm_invalid')}</p>}
    </article>
  );
}
export type CommunityView = 'all' | 'join' | 'check-in' | 'mentors' | 'become-mentor';
const pageTitles = {
  join: 'comm_join',
  'check-in': 'comm_checkin',
  mentors: 'comm_mentors',
  'become-mentor': 'comm_become_mentor',
} as const;
export function Community({ view }: { view: CommunityView }) {
  const t = useTranslations();
  const format = useFormatter();
  const quizProfile = visibilityFromQuiz(useStored('pathmap-quiz-v1'));
  const [data, setData] = useState<CircleState>(emptyCircleState);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [editedProfile, setEditedProfile] = useState<CommunityProfile | null>(null);
  const profile = editedProfile ?? data.profile ?? quizProfile;
  const post = useDraft('pathmap-circle-draft');
  const question = useDraft('pathmap-guidance-draft');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [mentorId, setMentorId] = useState('');
  const [bio, setBio] = useState('');
  const [report, setReport] = useState<string | null>(null);
  const [reason, setReason] = useState('spam');
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (replyTo) textarea.current?.focus();
  }, [replyTo]);
  useEffect(() => {
    let active = true;
    fetchCommunity()
      .then((next) => {
        if (active) {
          setData(next.data);
          setMentors(next.mentors);
        }
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function refresh() {
    try {
      const next = await fetchCommunity();
      setData(next.data);
      setMentors(next.mentors);
      setError(false);
      return true;
    } catch {
      setError(true);
      return false;
    }
  }
  const act: Action = async (work, done) => {
    if (busy || loading || error || data.status !== 'signed-in') return;
    setBusy(true);
    setFeedback('');
    try {
      await work();
      done?.();
      if (await refresh()) setFeedback('comm_saved');
      else setFeedback('eng_error');
    } catch {
      setFeedback('eng_error');
    } finally {
      setBusy(false);
    }
  };
  const connected = data.status === 'signed-in' && !loading && !error;
  const disabled = !connected || busy;
  function updateProfile(key: keyof CommunityProfile, value: string) {
    setEditedProfile({ ...profile, [key]: value });
  }
  const roots = data.posts
    .filter((item) => !item.parent)
    .slice(-30)
    .reverse();
  const selectedMentor = mentors.find((item) => item.id === mentorId);
  return (
    <div className="engagement community">
      <nav className="eng-nav" aria-label={t('eng_navigation')}>
        <Link prefetch={false} href="/learn">
          {t('eng_continue')}
        </Link>
        <Link prefetch={false} href="/circles">
          {t('comm_title')}
        </Link>
        <Link prefetch={false} href="/showcase">
          {t('show_title')}
        </Link>
      </nav>
      <span className="eyebrow">{t('comm_eyebrow')}</span>
      <h1>{t(view === 'all' ? 'comm_title' : pageTitles[view])}</h1>
      <p>{t('comm_intro')}</p>
      <div className="eng-status" role="status">
        {loading
          ? t('eng_loading')
          : error
            ? t('eng_error')
            : data.status === 'unconfigured'
              ? t('comm_unconfigured')
              : data.status === 'guest'
                ? t('comm_guest')
                : t('comm_connected')}
        {data.status !== 'signed-in' && !loading && (
          <Link prefetch={false} href="/auth" className="eng-button secondary">
            {t('ui_sign_in')}
          </Link>
        )}
      </div>
      <button
        className="eng-button secondary"
        disabled={busy || loading}
        onClick={async () => {
          setBusy(true);
          await refresh();
          setLoading(false);
          setBusy(false);
        }}
      >
        {t('comm_refresh')}
      </button>
      {(view === 'all' || view === 'join' || view === 'check-in') && (
        <div className="community-page-content">
          {(view === 'all' || view === 'join') && (
            <section className="eng-card">
              {view === 'all' && <h2>{t('comm_join')}</h2>}
              <p>{t('comm_consent')}</p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const parsed = communityProfileSchema.safeParse({
                    ...profile,
                    nickname: profile.nickname.trim(),
                  });
                  if (!parsed.success) {
                    setFeedback('eng_invalid');
                    return;
                  }
                  void act(
                    () => joinCircle(parsed.data),
                    () => {
                      setEditedProfile(null);
                      setReplyTo(null);
                    },
                  );
                }}
              >
                <label htmlFor="circle-nickname">{t('eng_nickname')}</label>
                <input
                  id="circle-nickname"
                  value={profile.nickname}
                  maxLength={30}
                  onChange={(event) => updateProfile('nickname', event.target.value)}
                  required
                />
                <label htmlFor="circle-path">{t('eng_path')}</label>
                <select
                  id="circle-path"
                  value={profile.path}
                  onChange={(event) => updateProfile('path', event.target.value)}
                >
                  {pathIds.map((path) => (
                    <option key={path} value={path}>
                      {t(pathNameKeys[path])}
                    </option>
                  ))}
                </select>
                <label htmlFor="circle-level">{t('eng_level')}</label>
                <select
                  id="circle-level"
                  value={profile.level}
                  onChange={(event) => updateProfile('level', event.target.value)}
                >
                  {(['new', 'basics', 'built'] as const).map((level) => (
                    <option key={level} value={level}>
                      {t(`quiz_level_${level}`)}
                    </option>
                  ))}
                </select>
                <label htmlFor="circle-language">{t('learn_language')}</label>
                <select
                  id="circle-language"
                  value={profile.language}
                  onChange={(event) => updateProfile('language', event.target.value)}
                >
                  {locales.map((locale) => (
                    <option key={locale} value={locale}>
                      {localeNames[locale]}
                    </option>
                  ))}
                </select>
                <button className="eng-button" disabled={disabled}>
                  {data.circle ? t('comm_update') : t('comm_join')}
                </button>
              </form>
              {data.circle && (
                <>
                  <p>{t('comm_members', { count: data.circle.members })}</p>
                  <button
                    className="eng-button secondary"
                    disabled={disabled}
                    onClick={() => setLeaveConfirm(true)}
                  >
                    {t('comm_leave')}
                  </button>
                  {leaveConfirm && (
                    <div className="eng-status">
                      <p>{t('comm_leave_hint')}</p>
                      <button
                        className="eng-button"
                        disabled={disabled}
                        onClick={() =>
                          void act(leaveCircle, () => {
                            setLeaveConfirm(false);
                            setReplyTo(null);
                            setMentorId('');
                          })
                        }
                      >
                        {t('comm_confirm_leave')}
                      </button>
                      <button
                        className="eng-button secondary"
                        disabled={busy}
                        onClick={() => setLeaveConfirm(false)}
                      >
                        {t('eng_cancel')}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          )}
          {(view === 'all' || view === 'check-in') && (
            <section className="eng-card">
              {view === 'all' && <h2>{t('comm_checkin')}</h2>}
              <p>{t('comm_prompt')}</p>
              <p>{t('comm_rules')}</p>
              <p>{t('comm_response_hint')}</p>
              <Link prefetch={false} className="eng-button secondary" href="/circles/mentors">
                {t('comm_ask_mentor')}
              </Link>
            </section>
          )}
        </div>
      )}
      {(view === 'all' || view === 'check-in') && (
        <section className="eng-card" aria-labelledby="board-title">
          <h2 id="board-title">{t('comm_board')}</h2>
          {data.circle ? (
            <>
              <p>
                {t(pathNameKeys[data.circle.path as PathId])} ·{' '}
                {t(`quiz_level_${data.circle.level}`)} ·{' '}
                {localeNames[data.circle.language as keyof typeof localeNames]}
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!validMessage(post.value)) {
                    setFeedback('comm_invalid');
                    return;
                  }
                  void act(
                    () => postMessage(post.value.trim(), replyTo),
                    () => {
                      post.update('');
                      setReplyTo(null);
                    },
                  );
                }}
              >
                {replyTo && (
                  <p>
                    {t('comm_replying', {
                      name: data.posts.find((item) => item.id === replyTo)?.nickname ?? '',
                    })}
                    <button
                      type="button"
                      className="eng-button secondary"
                      onClick={() => setReplyTo(null)}
                    >
                      {t('eng_cancel')}
                    </button>
                  </p>
                )}
                <label htmlFor="circle-post">{replyTo ? t('comm_reply') : t('comm_share')}</label>
                <textarea
                  ref={textarea}
                  id="circle-post"
                  value={post.value}
                  maxLength={2000}
                  onChange={(event) => post.update(event.target.value)}
                  required
                  aria-describedby="circle-post-hint"
                />
                <p id="circle-post-hint">{t('comm_length')}</p>
                <button className="eng-button" disabled={disabled}>
                  {t('comm_post')}
                </button>
                {post.storageError && <p role="alert">{t('comm_storage_error')}</p>}
              </form>
              {!roots.length && <p>{t('comm_empty_board')}</p>}
              <ol className="community-threads">
                {roots.map((root) => (
                  <li key={root.id}>
                    <article className="community-thread">
                      <h3>{root.nickname}</h3>
                      <time dateTime={root.created_at}>
                        {format.dateTime(new Date(root.created_at), {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </time>
                      <p className="community-text">
                        {root.removed ? t('comm_removed') : root.body}
                      </p>
                      {!root.removed && (
                        <>
                          <button
                            className="eng-button secondary"
                            disabled={disabled}
                            onClick={() => setReplyTo(root.id)}
                          >
                            {t('comm_reply')}
                          </button>
                          {root.own ? (
                            <button
                              className="eng-button secondary"
                              disabled={disabled}
                              onClick={() => void act(() => removePost(root.id))}
                            >
                              {t('comm_remove')}
                            </button>
                          ) : (
                            <button
                              className="eng-button secondary"
                              disabled={disabled}
                              onClick={() => {
                                setReport(root.id);
                                setReason('spam');
                              }}
                            >
                              {t('comm_report')}
                            </button>
                          )}
                        </>
                      )}
                      <ul className="community-messages">
                        {data.posts
                          .filter((item) => item.parent === root.id)
                          .map((reply) => (
                            <li key={reply.id}>
                              <strong>{reply.nickname}</strong>
                              <p className="community-text">
                                {reply.removed ? t('comm_removed') : reply.body}
                              </p>
                              {!reply.removed &&
                                (reply.own ? (
                                  <button
                                    className="eng-button secondary"
                                    disabled={disabled}
                                    onClick={() => void act(() => removePost(reply.id))}
                                  >
                                    {t('comm_remove')}
                                  </button>
                                ) : (
                                  <button
                                    className="eng-button secondary"
                                    disabled={disabled}
                                    onClick={() => {
                                      setReport(reply.id);
                                      setReason('spam');
                                    }}
                                  >
                                    {t('comm_report')}
                                  </button>
                                ))}
                            </li>
                          ))}
                      </ul>
                      {report &&
                        (report === root.id ||
                          data.posts.some(
                            (item) => item.id === report && item.parent === root.id,
                          )) && (
                          <form
                            className="eng-status"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void act(
                                () => reportPost(report, reason),
                                () => setReport(null),
                              );
                            }}
                          >
                            <label htmlFor={`report-${root.id}`}>{t('comm_report_reason')}</label>
                            <select
                              id={`report-${root.id}`}
                              value={reason}
                              onChange={(event) => setReason(event.target.value)}
                            >
                              {['spam', 'abuse', 'unsafe'].map((value) => (
                                <option key={value} value={value}>
                                  {t(`comm_report_${value}`)}
                                </option>
                              ))}
                            </select>
                            <p>{t('comm_report_hint')}</p>
                            <button className="eng-button" disabled={disabled}>
                              {t('comm_submit_report')}
                            </button>
                            <button
                              type="button"
                              className="eng-button secondary"
                              onClick={() => setReport(null)}
                            >
                              {t('eng_cancel')}
                            </button>
                          </form>
                        )}
                    </article>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <>
              <p>{t('comm_join_first')}</p>
              <Link prefetch={false} className="eng-button secondary" href="/circles/join">
                {t('comm_join')}
              </Link>
            </>
          )}
        </section>
      )}
      {(view === 'all' || view === 'mentors') && (
        <section id="mentors" className="community-section" aria-labelledby="mentor-title">
          <h2 id="mentor-title">{t('comm_ask_mentor')}</h2>
          <p>{t('comm_mentor_intro')}</p>
          <div className="eng-grid">
            {mentors.map((mentor) => (
              <article key={mentor.id} className="eng-card">
                <h3>{mentor.nickname}</h3>
                <p className="community-badge">{t('comm_approved')}</p>
                <p>
                  {t(pathNameKeys[mentor.path as PathId])} ·{' '}
                  {localeNames[mentor.language as keyof typeof localeNames]}
                </p>
                <p className="community-text">{mentor.bio}</p>
                <button
                  className="eng-button"
                  disabled={disabled}
                  aria-pressed={mentorId === mentor.id}
                  onClick={() => {
                    setMentorId(mentor.id);
                    document.getElementById('mentor-question')?.focus();
                  }}
                >
                  {t('comm_choose_mentor')}
                </button>
              </article>
            ))}
          </div>
          {!mentors.length && <p>{t('comm_no_mentors')}</p>}
          <form
            className="eng-card"
            onSubmit={(event) => {
              event.preventDefault();
              if (!selectedMentor || !validMessage(question.value)) {
                setFeedback('comm_invalid');
                return;
              }
              void act(
                () => requestGuidance(selectedMentor.id, question.value.trim()),
                () => {
                  question.update('');
                  setMentorId('');
                },
              );
            }}
          >
            <h3>{t('comm_ask_mentor')}</h3>
            {selectedMentor && <p>{t('comm_selected', { name: selectedMentor.nickname })}</p>}
            <label htmlFor="mentor-question">{t('comm_question')}</label>
            <textarea
              id="mentor-question"
              value={question.value}
              maxLength={2000}
              onChange={(event) => question.update(event.target.value)}
              required
              aria-describedby="mentor-question-hint"
            />
            <p id="mentor-question-hint">
              {t('comm_draft_hint')} {t('comm_length')}
            </p>
            <button className="eng-button" disabled={disabled || !data.circle || !selectedMentor}>
              {t('comm_request')}
            </button>
            {question.storageError && <p role="alert">{t('comm_storage_error')}</p>}
          </form>
        </section>
      )}
      {(view === 'all' || view === 'mentors' || view === 'become-mentor') && (
        <section className="community-section" aria-labelledby="guidance-title">
          <h2 id="guidance-title">{t('comm_guidance')}</h2>
          <p>{t('comm_guidance_intro')}</p>
          {!data.guidance.length && <p>{t('comm_no_guidance')}</p>}
          <div className="eng-grid">
            {data.guidance.map((item) => (
              <GuidanceCard key={item.id} item={item} busy={disabled} act={act} />
            ))}
          </div>
        </section>
      )}
      {(view === 'all' || view === 'become-mentor') && (
        <section className="eng-card">
          {view === 'all' && <h2>{t('comm_become_mentor')}</h2>}
          <p>{t('comm_apply_hint')}</p>
          {data.mentor ? (
            <p>{data.mentor.approved ? t('comm_approved') : t('eng_pending')}</p>
          ) : null}
          {!data.mentor?.approved && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!mentorBioSchema.safeParse(bio.trim()).success) {
                  setFeedback('comm_invalid');
                  return;
                }
                void act(
                  () => applyMentor(bio.trim()),
                  () => setBio(''),
                );
              }}
            >
              <label htmlFor="mentor-bio">{t('comm_bio')}</label>
              <textarea
                id="mentor-bio"
                value={bio}
                maxLength={500}
                onChange={(event) => setBio(event.target.value)}
                required
              />
              <p>{t('comm_bio_hint')}</p>
              <button className="eng-button" disabled={disabled || !data.circle}>
                {t('comm_apply')}
              </button>
            </form>
          )}
        </section>
      )}
      {feedback && (
        <p className="eng-status" role="status">
          {t(feedback)}
        </p>
      )}
    </div>
  );
}
