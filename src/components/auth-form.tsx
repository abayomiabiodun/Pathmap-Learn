'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, type Resolver, type FieldErrors } from 'react-hook-form';
import { authSchema, emailSchema } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase/client';
import { Button } from './ui/button';
import { ArrowRight, Mail } from 'lucide-react';
import Link from 'next/link';
type Credentials = { email: string; password: string };
const resolveCredentials: Resolver<Credentials> = (values) => {
  const parsed = authSchema.safeParse(values);
  if (parsed.success) return { values: parsed.data, errors: {} };
  const errors: FieldErrors<Credentials> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (field === 'email' || field === 'password')
      errors[field] = { type: issue.code, message: issue.message };
  }
  return { values: {}, errors };
};
export function AuthForm() {
  const t = useTranslations();
  const [signup, setSignup] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<Credentials>({ resolver: resolveCredentials });
  async function submit(values: Credentials) {
    const client = await getSupabase();
    if (!client) {
      setStatus(
        'ui_live_accounts_are_not_configured_yet_explore_the_local_demo_below_no_account_is_created',
      );
      return;
    }
    setBusy(true);
    try {
      const result = signup
        ? await client.auth.signUp({
            ...values,
            options: { emailRedirectTo: `${location.origin}/auth/callback` },
          })
        : await client.auth.signInWithPassword(values);
      setStatus(
        result.error
          ? 'ui_we_couldn_t_complete_sign_in_check_your_details_or_try_again_later'
          : signup
            ? 'ui_check_your_email_to_confirm_your_account'
            : 'ui_you_re_signed_in_continue_to_find_your_path',
      );
    } catch {
      setStatus('ui_we_couldn_t_connect_please_try_again_when_your_connection_improves');
    } finally {
      setBusy(false);
    }
  }
  async function magicLink() {
    const result = emailSchema.safeParse({ email: getValues('email') });
    if (!result.success) {
      setStatus('ui_enter_your_email_first_so_we_can_send_your_sign_in_link');
      return;
    }
    const client = await getSupabase();
    if (!client) {
      setStatus('ui_email_sign_in_needs_supabase_configuration_the_local_demo_is_available_below');
      return;
    }
    setBusy(true);
    try {
      const { error } = await client.auth.signInWithOtp({
        email: result.data.email,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      setStatus(
        error
          ? 'ui_we_couldn_t_complete_sign_in_check_your_details_or_try_again_later'
          : 'ui_check_your_inbox_for_your_sign_in_link',
      );
    } catch {
      setStatus('ui_we_couldn_t_send_the_link_please_try_again');
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    const client = await getSupabase();
    if (!client) {
      setStatus('ui_google_sign_in_needs_supabase_and_google_provider_configuration');
      return;
    }
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setStatus('ui_we_couldn_t_complete_sign_in_check_your_details_or_try_again_later');
  }
  return (
    <div className="form-card">
      <h2>{signup ? t('ui_start_your_next_chapter') : t('ui_welcome_back')}</h2>
      <p>{t('ui_your_learning_journey_is_waiting_for_you')}</p>
      <form onSubmit={handleSubmit(submit)} noValidate>
        <label htmlFor="email">{t('ui_email_address')}</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <p id="email-error" className="form-error">
            {t('ui_enter_a_valid_email_address')}
          </p>
        )}
        <label htmlFor="password">{t('ui_password')}</label>
        <input
          id="password"
          type="password"
          autoComplete={signup ? 'new-password' : 'current-password'}
          {...register('password')}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
        />
        {errors.password && (
          <p id="password-error" className="form-error">
            {t(
              getValues('password').length > 128
                ? 'ui_use_no_more_than_128_characters'
                : 'ui_use_at_least_8_characters',
            )}
          </p>
        )}
        <Button disabled={busy} type="submit">
          {busy ? t('ui_connecting') : signup ? t('ui_create_account') : t('ui_sign_in')}
          <ArrowRight size={17} />
        </Button>
      </form>
      <Button disabled={busy} variant="ghost" onClick={magicLink}>
        <Mail size={17} />
        {t('ui_send_me_a_magic_link')}
      </Button>
      <div className="divider">{t('ui_or')}</div>
      <Button disabled={busy} variant="outline" onClick={google}>
        {t('ui_continue_with_google')}
      </Button>
      {status && (
        <p role="status" className="form-status">
          {t(status)}
        </p>
      )}
      <Button
        variant="ghost"
        onClick={() => {
          setSignup(!signup);
          setStatus('');
        }}
      >
        {signup ? t('ui_already_have_an_account_sign_in') : t('ui_new_here_create_an_account')}
      </Button>
      <Link prefetch={false} href="/paths" className="page-link">
        {t('ui_explore_the_local_demo')}
        <ArrowRight size={16} />
      </Link>
      <p style={{ fontSize: 12 }}>
        {t('ui_by_creating_an_account_you_agree_to_our')}{' '}
        <Link prefetch={false} href="/privacy" className="page-link">
          {t('ui_privacy_policy')}
        </Link>
        .
      </p>
    </div>
  );
}
