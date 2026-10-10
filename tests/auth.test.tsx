import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { AuthForm } from '@/components/auth-form';
const api = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOtp: vi.fn(),
  signInWithOAuth: vi.fn(),
}));
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => ({ auth: api }) }));
beforeEach(() => {
  for (const method of Object.values(api)) method.mockReset().mockResolvedValue({ error: null });
});
function fill() {
  render(<AuthForm />);
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'learner@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'safe-password' } });
}
it('signs in with validated credentials', async () => {
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await waitFor(() =>
    expect(api.signInWithPassword).toHaveBeenCalledWith({
      email: 'learner@example.com',
      password: 'safe-password',
    }),
  );
  expect(await screen.findByRole('status')).toHaveTextContent('You’re signed in');
});
it('signs up with email confirmation callback', async () => {
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'New here? Create an account' }));
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  await waitFor(() => expect(api.signUp).toHaveBeenCalled());
  expect(await screen.findByRole('status')).toHaveTextContent('Check your email');
});
it('reports provider errors and connection failures during sign-in', async () => {
  api.signInWithPassword
    .mockResolvedValueOnce({ error: { message: 'Invalid credentials' } })
    .mockRejectedValueOnce(new Error('offline'));
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Invalid credentials');
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('We couldn’t connect'));
});
it('sends magic links and handles provider failure', async () => {
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Send me a magic link' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Check your inbox');
  api.signInWithOtp.mockResolvedValueOnce({ error: { message: 'Email limit reached' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send me a magic link' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Email limit reached'));
  api.signInWithOtp.mockRejectedValueOnce(new Error('offline'));
  fireEvent.click(screen.getByRole('button', { name: 'Send me a magic link' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('We couldn’t send'));
});
it('starts Google OAuth and handles a declined provider', async () => {
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
  await waitFor(() =>
    expect(api.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.stringContaining('/auth/callback') },
    }),
  );
  api.signInWithOAuth.mockResolvedValueOnce({ error: { message: 'Google is unavailable' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Google is unavailable');
});
