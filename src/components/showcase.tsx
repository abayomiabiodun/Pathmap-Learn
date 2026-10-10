'use client';
/* eslint-disable @next/next/no-img-element -- Private, already resized data URLs must not be sent to an image proxy. */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import {
  kinds,
  emptyShowcaseDraft,
  readShowcaseDraft,
  showcaseSchema,
  projectUrl,
  preparePhoto,
  type ShowcaseDraft,
} from '@/lib/showcase';
import { validMessage } from '@/lib/community';
import {
  loadShowcase,
  publishWork,
  likeWork,
  workComments,
  commentWork,
  loadWorkImage,
  removeWork,
  removeWorkComment,
  reportWork,
  type ShowcasePost,
  type ShowcaseComment,
} from '@/lib/supabase/showcase';
type Action = (task: () => Promise<unknown>) => Promise<void>;
function Work({ post, act, busy }: { post: ShowcasePost; act: Action; busy: boolean }) {
  const t = useTranslations();
  const format = useFormatter();
  const [comments, setComments] = useState<ShowcaseComment[] | null>(null);
  const [body, setBody] = useState('');
  const [image, setImage] = useState('');
  const [reason, setReason] = useState('spam');
  const [report, setReport] = useState<string | null | false>(false);
  return (
    <article className="eng-card">
      <p>
        {post.nickname} · {t(`show_${post.kind}`)}
      </p>
      <time dateTime={post.created_at}>
        {format.dateTime(new Date(post.created_at), { dateStyle: 'medium' })}
      </time>
      {post.removed ? (
        <p>{t('comm_removed')}</p>
      ) : (
        <>
          <h2>{post.title}</h2>
          <p className="community-text">{post.body}</p>
          {post.url && (
            <a
              className="eng-button secondary"
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('show_visit')}
            </a>
          )}
          {post.has_image &&
            (image ? (
              <img
                className="show-photo"
                src={`data:image/jpeg;base64,${image}`}
                alt={post.image_alt}
              />
            ) : (
              <button
                className="eng-button secondary"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    const photo = await loadWorkImage(post.id);
                    if (!photo) throw new Error('missing-photo');
                    setImage(photo.replace(/\s/g, ''));
                  })
                }
              >
                {t('show_load_photo')}
              </button>
            ))}
          <div className="eng-nav">
            <button
              className="eng-button secondary"
              aria-pressed={post.liked}
              disabled={busy}
              onClick={() => void act(() => likeWork(post.id, !post.liked))}
            >
              {t(post.liked ? 'show_unlike' : 'show_like')} · {post.likes}
            </button>
            <button
              className="eng-button secondary"
              disabled={busy}
              onClick={() => void act(async () => setComments(await workComments(post.id)))}
            >
              {t('show_comments')}
            </button>
            {post.own ? (
              <button
                className="eng-button secondary"
                disabled={busy}
                onClick={() => void act(() => removeWork(post.id))}
              >
                {t('show_remove')}
              </button>
            ) : (
              <button className="eng-button secondary" onClick={() => setReport(null)}>
                {t('comm_report')}
              </button>
            )}
          </div>
          {comments && (
            <section aria-label={t('show_comments')}>
              {comments.map((comment) => (
                <div className="community-reply" key={comment.id}>
                  <strong>{comment.nickname}</strong>
                  <p className="community-text">
                    {comment.removed ? t('comm_removed') : comment.body}
                  </p>
                  {!comment.removed &&
                    (comment.own ? (
                      <button
                        className="eng-button secondary"
                        disabled={busy}
                        onClick={() =>
                          void act(async () => {
                            await removeWorkComment(comment.id);
                            setComments(await workComments(post.id));
                          })
                        }
                      >
                        {t('comm_remove')}
                      </button>
                    ) : (
                      <button
                        className="eng-button secondary"
                        onClick={() => setReport(comment.id)}
                      >
                        {t('comm_report')}
                      </button>
                    ))}
                </div>
              ))}
              {comments.length === 0 && <p>{t('show_no_comments')}</p>}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!validMessage(body)) return;
                  void act(async () => {
                    await commentWork(post.id, body.trim());
                    setBody('');
                    setComments(await workComments(post.id));
                  });
                }}
              >
                <label className="eng-field">
                  {t('show_comment')}
                  <textarea
                    required
                    minLength={10}
                    maxLength={2000}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                  />
                </label>
                <p>{t('comm_length')}</p>
                <button className="eng-button" disabled={busy || !validMessage(body)}>
                  {t('comm_send_reply')}
                </button>
              </form>
            </section>
          )}
          {report !== false && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void act(async () => {
                  await reportWork(post.id, report, reason);
                  setReport(false);
                  if (report) setComments(await workComments(post.id));
                });
              }}
            >
              <label className="eng-field">
                {t('comm_report_reason')}
                <select value={reason} onChange={(event) => setReason(event.target.value)}>
                  {['spam', 'abuse', 'unsafe'].map((value) => (
                    <option key={value} value={value}>
                      {t(`comm_report_${value}`)}
                    </option>
                  ))}
                </select>
              </label>
              <p>{t('comm_report_hint')}</p>
              <button className="eng-button" disabled={busy}>
                {t('comm_submit_report')}
              </button>
            </form>
          )}
        </>
      )}
    </article>
  );
}
export function Showcase() {
  const t = useTranslations();
  const [draft, setDraft] = useState<ShowcaseDraft>(emptyShowcaseDraft);
  const [ready, setReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [posts, setPosts] = useState<ShowcasePost[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [alt, setAlt] = useState('');
  const [consent, setConsent] = useState(false);
  const [saved, setSaved] = useState(false);
  async function refresh() {
    const result = await loadShowcase();
    setConnected(result.community.status === 'signed-in' && !!result.community.circle);
    setPosts(result.posts);
  }
  useEffect(() => {
    let mounted = true;
    void Promise.resolve().then(() => {
      if (!mounted) return;
      try {
        setDraft(readShowcaseDraft(localStorage.getItem('pathmap-showcase-draft')));
      } catch {
        setError('comm_storage_error');
      }
      setReady(true);
    });
    void loadShowcase()
      .then((result) => {
        if (!mounted) return;
        setConnected(result.community.status === 'signed-in' && !!result.community.circle);
        setPosts(result.posts);
      })
      .catch(() => {
        if (mounted) setError('eng_error');
      });
    return () => {
      mounted = false;
    };
  }, []);
  function edit(next: ShowcaseDraft) {
    setDraft(next);
    setSaved(false);
    try {
      localStorage.setItem('pathmap-showcase-draft', JSON.stringify(next));
    } catch {
      setError('comm_storage_error');
    }
  }
  async function act(task: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await task();
      await refresh();
    } catch {
      setError('eng_error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="engagement">
      <nav className="eng-nav" aria-label={t('eng_navigation')}>
        <Link href="/circles" prefetch={false}>
          {t('comm_title')}
        </Link>
        <Link href="/learn" prefetch={false}>
          {t('eng_continue')}
        </Link>
      </nav>
      <p className="eyebrow">{t('show_eyebrow')}</p>
      <h1>{t('show_title')}</h1>
      <p>{t('show_intro')}</p>
      <p className="eng-status">{t(connected ? 'show_connected' : 'show_disconnected')}</p>
      <button className="eng-button secondary" disabled={busy} onClick={() => void act(refresh)}>
        {t('show_refresh')}
      </button>
      <p role="status">{error ? t(error) : saved ? t('show_saved') : ''}</p>
      <div className="eng-grid">
        <section className="eng-card">
          <h2>{t('show_compose')}</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (
                !connected ||
                !consent ||
                !showcaseSchema.safeParse(draft).success ||
                (photo && alt.trim().length < 3)
              ) {
                setError('show_invalid');
                return;
              }
              void act(async () => {
                await publishWork(
                  {
                    ...draft,
                    title: draft.title.trim(),
                    body: draft.body.trim(),
                    url: projectUrl(draft.url) ?? '',
                  },
                  photo,
                  alt.trim(),
                );
                edit(emptyShowcaseDraft);
                setPhoto(null);
                setAlt('');
                setConsent(false);
                setSaved(true);
              });
            }}
          >
            <label className="eng-field">
              {t('show_kind')}
              <select
                value={draft.kind}
                onChange={(event) =>
                  edit({ ...draft, kind: event.target.value as ShowcaseDraft['kind'] })
                }
              >
                {kinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {t(`show_${kind}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="eng-field">
              {t('show_heading')}
              <input
                required
                minLength={3}
                maxLength={100}
                value={draft.title}
                onChange={(event) => edit({ ...draft, title: event.target.value })}
              />
            </label>
            <label className="eng-field">
              {t('show_body')}
              <textarea
                required
                minLength={10}
                maxLength={2000}
                value={draft.body}
                onChange={(event) => edit({ ...draft, body: event.target.value })}
              />
            </label>
            <p>{t('comm_length')}</p>
            <label className="eng-field">
              {t('show_url')}
              <input
                type="url"
                maxLength={500}
                value={draft.url}
                onChange={(event) => edit({ ...draft, url: event.target.value })}
              />
            </label>
            <label className="eng-field">
              {t('show_photo')}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) {
                    setBusy(true);
                    setError('');
                    void preparePhoto(file)
                      .then(setPhoto)
                      .catch(() => setError('show_photo_error'))
                      .finally(() => setBusy(false));
                  }
                }}
              />
            </label>
            <p>{t('show_photo_hint')}</p>
            {photo && (
              <>
                <img
                  className="show-photo"
                  src={`data:image/jpeg;base64,${photo}`}
                  alt={alt || t('show_preview')}
                />
                <label className="eng-field">
                  {t('show_alt')}
                  <input
                    required
                    minLength={3}
                    maxLength={200}
                    value={alt}
                    onChange={(event) => setAlt(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="eng-button secondary"
                  onClick={() => {
                    setPhoto(null);
                    setAlt('');
                  }}
                >
                  {t('show_clear_photo')}
                </button>
              </>
            )}
            <p>{t('show_draft_hint')}</p>
            <label className="show-consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              {t('show_consent')}
            </label>
            <button className="eng-button" disabled={!ready || busy || !connected || !consent}>
              {t('show_publish')}
            </button>
          </form>
        </section>
        <section aria-label={t('show_feed')}>
          <h2>{t('show_feed')}</h2>
          {posts.length === 0 && <p>{t('show_empty')}</p>}
          {posts.map((post) => (
            <Work key={post.id} post={post} act={act} busy={busy} />
          ))}
        </section>
      </div>
    </main>
  );
}
