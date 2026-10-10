'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authSchema, emailSchema } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase/client';
import { Button } from './ui/button';
import { ArrowRight, Mail } from 'lucide-react';
import Link from 'next/link';
type Credentials = { email: string; password: string };
export function AuthForm() {
  const [signup, setSignup] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<Credentials>({ resolver: zodResolver(authSchema) });
  async function submit(values: Credentials) {
    const client = await getSupabase();
    if (!client) {
      setStatus(
        'Live accounts are not configured yet. Explore the local demo below; no account is created.',
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
          ? result.error.message
          : signup
            ? 'Check your email to confirm your account.'
            : 'You’re signed in. Continue to find your path.',
      );
    } catch {
      setStatus('We couldn’t connect. Please try again when your connection improves.');
    } finally {
      setBusy(false);
    }
  }
  async function magicLink() {
    const result = emailSchema.safeParse({ email: getValues('email') });
    if (!result.success) {
      setStatus('Enter your email first so we can send your sign-in link.');
      return;
    }
    const client = await getSupabase();
    if (!client) {
      setStatus('Email sign-in needs Supabase configuration. The local demo is available below.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await client.auth.signInWithOtp({
        email: result.data.email,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      setStatus(error ? error.message : 'Check your inbox for your sign-in link.');
    } catch {
      setStatus('We couldn’t send the link. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    const client = await getSupabase();
    if (!client) {
      setStatus('Google sign-in needs Supabase and Google provider configuration.');
      return;
    }
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setStatus(error.message);
  }
  return (
    <div className="form-card">
      <h2>{signup ? 'Start your next chapter' : 'Welcome back'}</h2>
      <p>Your learning journey is waiting for you.</p>
      <form onSubmit={handleSubmit(submit)} noValidate>
        <label htmlFor="email">Email address</label>
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
            {errors.email.message}
          </p>
        )}
        <label htmlFor="password">Password</label>
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
            {errors.password.message}
          </p>
        )}
        <Button disabled={busy} type="submit">
          {busy ? 'Connecting…' : signup ? 'Create account' : 'Sign in'}
          <ArrowRight size={17} />
        </Button>
      </form>
      <Button disabled={busy} variant="ghost" onClick={magicLink}>
        <Mail size={17} />
        Send me a magic link
      </Button>
      <div className="divider">or</div>
      <Button disabled={busy} variant="outline" onClick={google}>
        Continue with Google
      </Button>
      {status && (
        <p role="status" className="form-status">
          {status}
        </p>
      )}
      <Button
        variant="ghost"
        onClick={() => {
          setSignup(!signup);
          setStatus('');
        }}
      >
        {signup ? 'Already have an account? Sign in' : 'New here? Create an account'}
      </Button>
      <Link prefetch={false} href="/paths" className="page-link">
        Explore the local demo
        <ArrowRight size={16} />
      </Link>
      <p style={{ fontSize: 12 }}>
        By creating an account you agree to our{' '}
        <Link href="/privacy" className="page-link">
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
