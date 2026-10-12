import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Assistant } from '../src/components/assistant';
import { Providers } from '../src/components/providers';
import en from '../messages/en.json';
import lessons from '../public/lessons/en.json';

afterEach(() => vi.unstubAllGlobals());
const show = () =>
  render(
    <Providers initialMessages={en}>
      <Assistant />
    </Providers>,
  );
it('keeps questions local, resolves follow-ups and clears the conversation', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => lessons });
  vi.stubGlobal('fetch', fetch);
  show();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Explain HTML' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Explain HTML' }));
  expect(screen.getByRole('log')).toHaveTextContent(lessons.html.body.split('\n')[0]);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Give an example' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ask assistant' }));
  expect(screen.getByRole('log').querySelectorAll('article')).toHaveLength(2);
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'xzqv 9999999' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ask assistant' }));
  expect(screen.getByRole('log')).toHaveTextContent(en.assistant_unknown);
  fireEvent.click(screen.getByRole('button', { name: 'Clear conversation' }));
  expect(screen.getByRole('log').querySelectorAll('article')).toHaveLength(0);
});
it('retries unavailable materials and follows the learner course focus', async () => {
  localStorage.setItem(
    'pathmap-quiz-v1',
    JSON.stringify({
      version: 1,
      draft: {},
      attempts: [],
      selections: [
        { path: 'data', level: 'new', language: 'en', completedAt: '2026-10-12T09:00:00Z' },
      ],
    }),
  );
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValue({ ok: true, json: async () => lessons }),
  );
  show();
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(en.assistant_failed));
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: lessons.data.title })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: lessons.data.title }));
  expect(screen.getByRole('log')).toHaveTextContent(lessons.data.body.split('\n')[0]);
  fireEvent.change(screen.getByLabelText('Course focus'), { target: { value: 'web' } });
  fireEvent.click(screen.getByRole('button', { name: lessons.html.title }));
  expect(screen.getByRole('log')).toHaveTextContent(lessons.html.body.split('\n')[0]);
});
