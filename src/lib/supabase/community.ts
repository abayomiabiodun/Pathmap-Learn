import { getSupabase } from './client';
import type { CommunityProfile } from '../community';
export type Circle = { id: string; path: string; level: string; language: string; members: number };
export type Post = {
  id: string;
  parent: string | null;
  nickname: string;
  body: string;
  created_at: string;
  own: boolean;
  removed: boolean;
};
export type Mentor = { id: string; nickname: string; path: string; language: string; bio: string };
export type Guidance = {
  id: string;
  nickname: string;
  question: string;
  status: 'pending' | 'answered' | 'proposed' | 'scheduled' | 'closed';
  session_at: string | null;
  mentor_side: boolean;
  messages: { id: string; body: string; own: boolean; created_at: string }[];
};
export type CircleState = {
  status: 'unconfigured' | 'guest' | 'signed-in';
  profile: CommunityProfile | null;
  circle: Circle | null;
  posts: Post[];
  mentor: { approved: boolean; bio: string } | null;
  guidance: Guidance[];
};
export const emptyCircleState: CircleState = {
  status: 'unconfigured',
  profile: null,
  circle: null,
  posts: [],
  mentor: null,
  guidance: [],
};
async function rpc<T>(name: string, params: Record<string, unknown> = {}): Promise<T> {
  const client = await getSupabase();
  if (!client) throw new Error('unconfigured');
  const { data, error } = await client.rpc(name, params);
  if (error) throw new Error('request-failed');
  return data as T;
}
export async function loadCircles(): Promise<CircleState> {
  const client = await getSupabase();
  if (!client) return emptyCircleState;
  const { data, error } = await client.auth.getUser();
  if (error && error.name !== 'AuthSessionMissingError') throw new Error('session-failed');
  if (!data.user) return { ...emptyCircleState, status: 'guest' };
  return { ...(await rpc<Omit<CircleState, 'status'>>('my_study_circle')), status: 'signed-in' };
}
export const joinCircle = (profile: CommunityProfile) =>
  rpc('join_study_circle', {
    p_nickname: profile.nickname,
    p_path: profile.path,
    p_level: profile.level,
    p_language: profile.language,
  });
export const leaveCircle = () => rpc('leave_study_circle');
export const postMessage = (body: string, parent: string | null = null) =>
  rpc('post_circle_message', { p_body: body, p_parent: parent });
export const removePost = (id: string) => rpc('remove_circle_message', { p_post: id });
export const reportPost = (id: string, reason: string) =>
  rpc('report_circle_message', { p_post: id, p_reason: reason });
export const mentorDirectory = (path: string, language: string) =>
  rpc<Mentor[]>('study_mentors', { p_path: path, p_language: language });
export const applyMentor = (bio: string) => rpc('apply_study_mentor', { p_bio: bio });
export const requestGuidance = (mentor: string, question: string) =>
  rpc('request_mentor_guidance', { p_mentor: mentor, p_question: question });
export const sendGuidance = (id: string, body: string) =>
  rpc('send_mentor_message', { p_request: id, p_body: body });
export const proposeSession = (id: string, date: string) =>
  rpc('propose_mentor_session', { p_request: id, p_date: date });
export const confirmSession = (id: string) => rpc('confirm_mentor_session', { p_request: id });
export const closeGuidance = (id: string) => rpc('close_mentor_guidance', { p_request: id });
