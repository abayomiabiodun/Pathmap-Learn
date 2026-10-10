import { beforeEach, expect, it, vi } from 'vitest';
import { getSupabase } from '@/lib/supabase/client';
import {
  applyRecruiter,
  loadCommunity,
  recordActivity,
  requestContact,
  respondContact,
  saveVisibility,
  searchLearners,
} from '@/lib/supabase/engagement';
import { defaultVisibility } from '@/lib/engagement';
vi.mock('@/lib/supabase/client', () => ({ getSupabase: vi.fn() }));
const client = { auth: { getUser: vi.fn() }, rpc: vi.fn() };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getSupabase).mockResolvedValue(
    client as unknown as NonNullable<Awaited<ReturnType<typeof getSupabase>>>,
  );
  client.auth.getUser.mockResolvedValue({ data: { user: { id: 'my-user' } }, error: null });
  client.rpc.mockResolvedValue({ data: [], error: null });
});
it('does not invent community records when Supabase is unconfigured', async () => {
  vi.mocked(getSupabase).mockResolvedValue(null);
  expect(await loadCommunity()).toEqual({ status: 'unconfigured', account: null, board: [] });
  expect(await recordActivity('web/html', 'Practice', true)).toBe(false);
  await expect(applyRecruiter('Employer')).rejects.toThrow('unconfigured');
});
it('loads only public rankings for a guest and fetches the signed-in account otherwise', async () => {
  client.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { name: 'AuthSessionMissingError' },
  });
  expect(await loadCommunity()).toEqual({ status: 'guest', account: null, board: [] });
  expect(client.rpc).toHaveBeenCalledTimes(1);
  client.auth.getUser.mockResolvedValue({ data: { user: { id: 'me' } }, error: null });
  client.rpc
    .mockResolvedValueOnce({ data: [{ nickname: 'Ada' }], error: null })
    .mockResolvedValueOnce({ data: { profile: null }, error: null });
  expect(await loadCommunity()).toMatchObject({
    status: 'signed-in',
    account: { profile: null },
    board: [{ nickname: 'Ada' }],
  });
  client.auth.getUser.mockResolvedValue({ data: { user: null }, error: { name: 'NetworkError' } });
  await expect(loadCommunity()).rejects.toThrow('session-failed');
});
it('records practice without client-supplied identities, dates or points, and handles failed requests safely', async () => {
  expect(await recordActivity('web/html', 'A practice long enough', true)).toBe(true);
  expect(client.rpc).toHaveBeenCalledWith('record_learning_activity', {
    p_lesson: 'web/html',
    p_practice: 'A practice long enough',
    p_answer: true,
  });
  client.rpc.mockResolvedValue({ data: null, error: { message: 'Denied' } });
  expect(await recordActivity('web/html', 'Practice', false)).toBe(false);
  client.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  client.rpc.mockClear();
  expect(await recordActivity('web/html', 'Practice', true)).toBe(false);
  expect(client.rpc).not.toHaveBeenCalled();
});
it('uses constrained RPCs for profile publishing, approval, filtering and consent-based contacts', async () => {
  await saveVisibility({ ...defaultVisibility, nickname: 'Ada' });
  expect(client.rpc).toHaveBeenLastCalledWith('save_learning_profile', {
    p_nickname: 'Ada',
    p_path: 'web',
    p_level: 'new',
    p_language: 'en',
    p_location: '',
    p_opportunity: 'both',
    p_leaderboard: false,
    p_recruiter: false,
  });
  await applyRecruiter('Employer');
  expect(client.rpc).toHaveBeenLastCalledWith('apply_recruiter', { p_company: 'Employer' });
  await searchLearners({
    path: 'web',
    language: 'yo',
    level: 'new',
    location: 'Lagos',
    opportunity: 'job',
  });
  expect(client.rpc).toHaveBeenLastCalledWith('recruiter_learners', {
    p_path: 'web',
    p_language: 'yo',
    p_level: 'new',
    p_location: 'Lagos',
    p_opportunity: 'job',
  });
  await requestContact('learner', 'Paid internship');
  expect(client.rpc).toHaveBeenLastCalledWith('request_learner_contact', {
    p_learner: 'learner',
    p_message: 'Paid internship',
  });
  await respondContact('request', true, 'Let us discuss');
  expect(client.rpc).toHaveBeenLastCalledWith('respond_learner_contact', {
    p_request: 'request',
    p_accepted: true,
    p_reply: 'Let us discuss',
  });
  client.rpc.mockResolvedValue({ data: null, error: { message: 'Private database detail' } });
  await expect(saveVisibility({ ...defaultVisibility, nickname: 'Ada' })).rejects.toThrow(
    'request-failed',
  );
});
