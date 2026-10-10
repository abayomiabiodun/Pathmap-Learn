import { getSupabase } from './client';
import type { Visibility, LearnerCard } from '../engagement';
export type RankRow = Pick<
  LearnerCard,
  'id' | 'nickname' | 'path' | 'active_days' | 'completed' | 'xp' | 'streak' | 'last_active'
>;
export type Contact = {
  id: string;
  company: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  reply: string;
};
export type Account = {
  profile: Visibility | null;
  recruiter: { company: string; approved: boolean } | null;
  requests: Contact[];
  sent: Contact[];
  stats: { completed: number; active_days: number; streak: number; xp: number };
};
export type CloudState = {
  status: 'unconfigured' | 'guest' | 'signed-in';
  account: Account | null;
  board: RankRow[];
};
async function rpc<T>(name: string, parameters: Record<string, unknown> = {}): Promise<T> {
  const client = await getSupabase();
  if (!client) throw new Error('unconfigured');
  const { data, error } = await client.rpc(name, parameters);
  if (error) throw new Error('request-failed');
  return data as T;
}
export async function loadCommunity(): Promise<CloudState> {
  const client = await getSupabase();
  if (!client) return { status: 'unconfigured', account: null, board: [] };
  const { data, error } = await client.auth.getUser();
  if (error && error.name !== 'AuthSessionMissingError') throw new Error('session-failed');
  const board = await rpc<RankRow[]>('top_learners');
  if (!data.user) return { status: 'guest', account: null, board };
  return { status: 'signed-in', account: await rpc<Account>('my_learning_account'), board };
}
export async function recordActivity(lesson: string, practice: string, answer: boolean) {
  try {
    const client = await getSupabase();
    if (!client) return false;
    const { data } = await client.auth.getUser();
    if (!data.user) return false;
    await rpc('record_learning_activity', {
      p_lesson: lesson,
      p_practice: practice,
      p_answer: answer,
    });
    window.dispatchEvent(new Event('pathmap-learning-recorded'));
    return true;
  } catch {
    return false;
  }
}
export const saveVisibility = (profile: Visibility) =>
  rpc('save_learning_profile', {
    p_nickname: profile.nickname,
    p_path: profile.path,
    p_level: profile.level,
    p_language: profile.language,
    p_location: profile.location,
    p_opportunity: profile.opportunity,
    p_leaderboard: profile.leaderboard,
    p_recruiter: profile.recruiter,
  });
export const applyRecruiter = (company: string) => rpc('apply_recruiter', { p_company: company });
export const searchLearners = (filters: {
  path: string;
  language: string;
  level: string;
  location: string;
  opportunity: string;
}) =>
  rpc<LearnerCard[]>('recruiter_learners', {
    p_path: filters.path,
    p_language: filters.language,
    p_level: filters.level,
    p_location: filters.location,
    p_opportunity: filters.opportunity,
  });
export const requestContact = (learner: string, message: string) =>
  rpc('request_learner_contact', { p_learner: learner, p_message: message });
export const respondContact = (id: string, accepted: boolean, reply: string) =>
  rpc('respond_learner_contact', { p_request: id, p_accepted: accepted, p_reply: reply });
