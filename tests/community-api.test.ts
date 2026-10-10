import { beforeEach, expect, it, vi } from 'vitest';
const { get, rpc, getUser } = vi.hoisted(() => ({ get: vi.fn(), rpc: vi.fn(), getUser: vi.fn() }));
vi.mock('../src/lib/supabase/client', () => ({ getSupabase: get }));
import * as api from '../src/lib/supabase/community';
beforeEach(() => {
  vi.resetAllMocks();
  get.mockResolvedValue({ rpc, auth: { getUser } });
  getUser.mockResolvedValue({ data: { user: { id: 'own' } }, error: null });
  rpc.mockResolvedValue({
    data: { profile: null, circle: null, posts: [], mentor: null, guidance: [] },
    error: null,
  });
});
it('separates disconnected, guest and signed-in states without anonymous private queries', async () => {
  get.mockResolvedValueOnce(null);
  expect(await api.loadCircles()).toEqual(api.emptyCircleState);
  expect(rpc).not.toHaveBeenCalled();
  getUser.mockResolvedValueOnce({
    data: { user: null },
    error: { name: 'AuthSessionMissingError' },
  });
  expect((await api.loadCircles()).status).toBe('guest');
  expect(rpc).not.toHaveBeenCalled();
  expect((await api.loadCircles()).status).toBe('signed-in');
  expect(rpc).toHaveBeenCalledWith('my_study_circle', {});
  getUser.mockResolvedValueOnce({ data: { user: null }, error: { name: 'OtherError' } });
  await expect(api.loadCircles()).rejects.toThrow('session-failed');
});
it('sends constrained RPC parameters without caller identity or approval flags', async () => {
  await api.joinCircle({ nickname: 'Ada', path: 'web', level: 'new', language: 'yo' });
  expect(rpc).toHaveBeenLastCalledWith('join_study_circle', {
    p_nickname: 'Ada',
    p_path: 'web',
    p_level: 'new',
    p_language: 'yo',
  });
  await api.leaveCircle();
  expect(rpc).toHaveBeenLastCalledWith('leave_study_circle', {});
  await api.postMessage('A useful message');
  expect(rpc).toHaveBeenLastCalledWith('post_circle_message', {
    p_body: 'A useful message',
    p_parent: null,
  });
  await api.postMessage('Reply', 'parent');
  expect(rpc).toHaveBeenLastCalledWith('post_circle_message', {
    p_body: 'Reply',
    p_parent: 'parent',
  });
  await api.removePost('post');
  expect(rpc).toHaveBeenLastCalledWith('remove_circle_message', { p_post: 'post' });
  await api.reportPost('post', 'spam');
  expect(rpc).toHaveBeenLastCalledWith('report_circle_message', {
    p_post: 'post',
    p_reason: 'spam',
  });
  await api.mentorDirectory('web', 'yo');
  expect(rpc).toHaveBeenLastCalledWith('study_mentors', { p_path: 'web', p_language: 'yo' });
  await api.applyMentor('Experience');
  expect(rpc).toHaveBeenLastCalledWith('apply_study_mentor', { p_bio: 'Experience' });
  await api.requestGuidance('mentor', 'Question');
  expect(rpc).toHaveBeenLastCalledWith('request_mentor_guidance', {
    p_mentor: 'mentor',
    p_question: 'Question',
  });
  await api.sendGuidance('request', 'Reply');
  expect(rpc).toHaveBeenLastCalledWith('send_mentor_message', {
    p_request: 'request',
    p_body: 'Reply',
  });
  await api.proposeSession('request', 'date');
  expect(rpc).toHaveBeenLastCalledWith('propose_mentor_session', {
    p_request: 'request',
    p_date: 'date',
  });
  await api.confirmSession('request');
  expect(rpc).toHaveBeenLastCalledWith('confirm_mentor_session', { p_request: 'request' });
  await api.closeGuidance('request');
  expect(rpc).toHaveBeenLastCalledWith('close_mentor_guidance', { p_request: 'request' });
});
it('propagates connection and server rejections without claiming success', async () => {
  get.mockResolvedValueOnce(null);
  await expect(api.leaveCircle()).rejects.toThrow('unconfigured');
  rpc.mockResolvedValueOnce({ data: null, error: { message: 'denied' } });
  await expect(api.postMessage('A useful message')).rejects.toThrow('request-failed');
});
