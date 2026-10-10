import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Dashboard, Recruiter } from '@/components/engagement';
import { defaultVisibility } from '@/lib/engagement';
import * as api from '@/lib/supabase/engagement';
import type { CloudState } from '@/lib/supabase/engagement';
import en from '../messages/en.json';
vi.mock('@/lib/supabase/engagement', () => ({
  loadCommunity: vi.fn(),
  saveVisibility: vi.fn(),
  applyRecruiter: vi.fn(),
  searchLearners: vi.fn(),
  requestContact: vi.fn(),
  respondContact: vi.fn(),
}));
const guest: CloudState = { status: 'unconfigured', account: null, board: [] };
const account: CloudState = {
  status: 'signed-in',
  account: {
    profile: { ...defaultVisibility, nickname: 'Ada' },
    recruiter: null,
    requests: [],
    sent: [],
    stats: { completed: 1, active_days: 1, streak: 1, xp: 125 },
  },
  board: [
    {
      id: 'learner',
      nickname: 'Ada',
      path: 'web',
      active_days: 1,
      completed: 1,
      xp: 125,
      streak: 1,
      last_active: '2026-10-10',
    },
  ],
};
beforeEach(() => {
  vi.mocked(api.loadCommunity).mockResolvedValue(guest);
});
afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});
function app(recruiter = false) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {recruiter ? <Recruiter /> : <Dashboard />}
    </NextIntlClientProvider>,
  );
}
it('shows actual local progress, changes the weekly goal and saves unpublished choices without enabling sharing', async () => {
  localStorage.setItem(
    'pathmap-learning-v1',
    JSON.stringify({
      version: 1,
      lessons: { 'web/html': { draft: 'A real practice on this device', completed: true } },
      events: [
        {
          lesson: 'web/html',
          day: new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Africa/Lagos',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date()),
        },
      ],
    }),
  );
  app();
  await screen.findByText(en.eng_unconfigured);
  expect(screen.getAllByRole('checkbox').every((box) => !(box as HTMLInputElement).checked)).toBe(
    true,
  );
  fireEvent.change(screen.getByLabelText(en.eng_goal), { target: { value: '5' } });
  expect(localStorage.getItem('pathmap-weekly-goal')).toBe('5');
  fireEvent.change(screen.getByLabelText(en.eng_nickname), { target: { value: 'Ada' } });
  fireEvent.change(screen.getByLabelText(en.eng_path), { target: { value: 'data' } });
  fireEvent.change(screen.getByLabelText(en.eng_level), { target: { value: 'basics' } });
  fireEvent.change(screen.getByLabelText(en.language), { target: { value: 'yo' } });
  fireEvent.change(screen.getByLabelText(en.eng_location), { target: { value: 'Lagos' } });
  fireEvent.change(screen.getByLabelText(en.eng_opportunity), { target: { value: 'internship' } });
  fireEvent.click(screen.getByRole('button', { name: en.eng_save }));
  await screen.findByText(en.eng_local_saved);
  expect(api.saveVisibility).not.toHaveBeenCalled();
  expect(JSON.parse(localStorage.getItem('pathmap-visibility-v1')!).recruiter).toBe(false);
  expect(
    screen.getAllByRole('link', { name: en.eng_continue }).map((link) => link.getAttribute('href')),
  ).toContain('/learn/data');
});
it('loads connected rankings, publishes and withdraws consent, and accepts a request with a learner-controlled reply', async () => {
  const incoming = {
    id: 'request',
    company: 'Example employer',
    message: 'A paid internship',
    status: 'pending' as const,
    reply: '',
  };
  vi.mocked(api.loadCommunity).mockResolvedValue({
    ...account,
    account: { ...account.account!, requests: [incoming] },
  });
  app();
  await screen.findByRole('heading', { name: 'Example employer' });
  fireEvent.click(screen.getByLabelText(en.eng_public_consent));
  fireEvent.click(screen.getByLabelText(en.eng_recruiter_consent));
  fireEvent.click(screen.getByRole('button', { name: en.eng_save }));
  await screen.findByText(en.eng_saved);
  expect(api.saveVisibility).toHaveBeenLastCalledWith(
    expect.objectContaining({ nickname: 'Ada', leaderboard: true, recruiter: true }),
  );
  fireEvent.click(screen.getByLabelText(en.eng_recruiter_consent));
  fireEvent.click(screen.getByRole('button', { name: en.eng_save }));
  await waitFor(() =>
    expect(api.saveVisibility).toHaveBeenLastCalledWith(
      expect.objectContaining({ recruiter: false }),
    ),
  );
  fireEvent.change(screen.getByLabelText(en.eng_reply), {
    target: { value: 'I would like to discuss the role.' },
  });
  fireEvent.click(screen.getByRole('button', { name: en.eng_accept }));
  await waitFor(() =>
    expect(api.respondContact).toHaveBeenCalledWith(
      'request',
      true,
      'I would like to discuss the role.',
    ),
  );
});
it('declines a request and reports save, contact and connection failures', async () => {
  vi.mocked(api.loadCommunity).mockResolvedValue({
    ...account,
    account: {
      ...account.account!,
      requests: [
        { id: 'request', company: 'Employer', message: 'A role', status: 'pending', reply: '' },
      ],
    },
  });
  app();
  await screen.findByText('Employer');
  vi.mocked(api.respondContact).mockRejectedValue(new Error('offline'));
  fireEvent.click(screen.getByRole('button', { name: en.eng_decline }));
  await screen.findByText(en.eng_error);
  expect(api.respondContact).toHaveBeenCalledWith('request', false, '');
  vi.mocked(api.saveVisibility).mockRejectedValue(new Error('offline'));
  fireEvent.click(screen.getByRole('button', { name: en.eng_save }));
  await waitFor(() => expect(api.saveVisibility).toHaveBeenCalled());
});
it('rejects invalid nicknames and handles device storage errors without publishing', async () => {
  localStorage.setItem('pathmap-weekly-goal', '2');
  app();
  await screen.findByText(en.eng_empty);
  fireEvent.change(screen.getByLabelText(en.eng_nickname), { target: { value: '<script>' } });
  fireEvent.submit(screen.getByRole('button', { name: en.eng_save }).closest('form')!);
  await screen.findByText(en.eng_invalid);
  fireEvent.change(screen.getByLabelText(en.eng_nickname), { target: { value: 'Ada' } });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  fireEvent.click(screen.getByRole('button', { name: en.eng_save }));
  await screen.findByText(en.eng_error);
  fireEvent.change(screen.getByLabelText(en.eng_goal), { target: { value: '4' } });
});
it('shows sign-in or connection guidance and never shows candidate filters to an unapproved recruiter', async () => {
  vi.mocked(api.loadCommunity).mockResolvedValue({ ...guest, status: 'guest' });
  app(true);
  await screen.findByText(en.eng_guest);
  expect(screen.queryByRole('button', { name: en.eng_search })).not.toBeInTheDocument();
});
it('blocks publishing while the connection fails, retries safely and refreshes when an online practice is recorded', async () => {
  vi.mocked(api.loadCommunity)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue(account);
  app();
  await screen.findByText(en.eng_error);
  expect(screen.getByRole('button', { name: en.eng_save })).toBeDisabled();
  fireEvent.submit(screen.getByRole('button', { name: en.eng_save }).closest('form')!);
  expect(api.saveVisibility).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: en.ui_try_again }));
  await waitFor(() => expect(screen.getByLabelText(en.eng_nickname)).toHaveValue('Ada'));
  expect(screen.getByRole('button', { name: en.eng_save })).toBeEnabled();
  fireEvent(window, new Event('pathmap-learning-recorded'));
  await waitFor(() => expect(api.loadCommunity).toHaveBeenCalledTimes(3));
});
it('submits an organisation for approval and displays pending status', async () => {
  vi.mocked(api.loadCommunity).mockResolvedValue(account);
  app(true);
  await screen.findByText(en.eng_approval_detail);
  fireEvent.change(screen.getByLabelText(en.eng_company), {
    target: { value: 'Example employer' },
  });
  fireEvent.click(screen.getByRole('button', { name: en.eng_apply }));
  await screen.findByText(en.eng_pending);
  expect(api.applyRecruiter).toHaveBeenCalledWith('Example employer');
});
it('lets approved recruiters filter, request contact and read accepted replies', async () => {
  vi.mocked(api.loadCommunity).mockResolvedValue({
    ...account,
    account: {
      ...account.account!,
      recruiter: { company: 'Employer', approved: true },
      sent: [
        {
          id: 'sent',
          company: 'Ada',
          message: 'A paid role',
          status: 'accepted',
          reply: 'Let us talk.',
        },
      ],
    },
  });
  const candidate = {
    ...defaultVisibility,
    id: 'learner',
    nickname: 'Ada',
    active_days: 3,
    completed: 2,
    xp: 275,
    streak: 3,
    last_active: '2026-10-10',
  };
  vi.mocked(api.searchLearners).mockResolvedValue([candidate]);
  app(true);
  await screen.findByRole('button', { name: en.eng_search });
  for (const [label, value] of [
    [en.eng_path, 'web'],
    [en.language, 'yo'],
    [en.eng_level, 'basics'],
    [en.eng_opportunity, 'job'],
    [en.eng_location, 'Lagos'],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: en.eng_search }));
  await screen.findByRole('button', { name: en.eng_request });
  expect(api.searchLearners).toHaveBeenCalledWith({
    path: 'web',
    language: 'yo',
    level: 'basics',
    opportunity: 'job',
    location: 'Lagos',
  });
  expect(screen.getByText('Let us talk.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: en.eng_request }));
  expect(screen.getByLabelText(en.eng_message)).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: en.eng_cancel }));
  expect(screen.getByRole('button', { name: en.eng_request })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: en.eng_request }));
  fireEvent.change(screen.getByLabelText(en.eng_message), {
    target: { value: 'A paid internship building accessible websites.' },
  });
  fireEvent.click(screen.getByRole('button', { name: en.eng_send }));
  await screen.findByText(en.eng_request_sent);
  expect(api.requestContact).toHaveBeenCalledWith(
    'learner',
    'A paid internship building accessible websites.',
  );
});
