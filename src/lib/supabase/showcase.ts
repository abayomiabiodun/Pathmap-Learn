import { getSupabase } from './client';
import { loadCircles, type CircleState } from './community';
import type { ShowcaseDraft } from '../showcase';
export type ShowcaseComment = {
  id: string;
  nickname: string;
  body: string;
  own: boolean;
  removed: boolean;
};
export type ShowcasePost = {
  id: string;
  nickname: string;
  kind: ShowcaseDraft['kind'];
  title: string;
  body: string;
  url: string;
  has_image: boolean;
  image_alt: string;
  own: boolean;
  removed: boolean;
  liked: boolean;
  likes: number;
  created_at: string;
};
async function rpc<T>(name: string, params: Record<string, unknown> = {}): Promise<T> {
  const client = await getSupabase();
  if (!client) throw new Error('unconfigured');
  const { data, error } = await client.rpc(name, params);
  if (error) throw new Error('request-failed');
  return data as T;
}
export async function loadShowcase(): Promise<{ community: CircleState; posts: ShowcasePost[] }> {
  const community = await loadCircles();
  return {
    community,
    posts:
      community.status === 'signed-in' && community.circle
        ? await rpc<ShowcasePost[]>('circle_showcase')
        : [],
  };
}
export const publishWork = (draft: ShowcaseDraft, image: string | null, alt: string) =>
  rpc('publish_circle_work', {
    p_kind: draft.kind,
    p_title: draft.title,
    p_body: draft.body,
    p_url: draft.url,
    p_image: image,
    p_alt: alt,
  });
export const likeWork = (id: string, liked: boolean) =>
  rpc('like_circle_work', { p_post: id, p_liked: liked });
export const workComments = (id: string) =>
  rpc<ShowcaseComment[]>('circle_work_comments', { p_post: id });
export const commentWork = (id: string, body: string) =>
  rpc('comment_circle_work', { p_post: id, p_body: body });
export const loadWorkImage = (id: string) => rpc<string>('circle_work_image', { p_post: id });
export const removeWork = (id: string) => rpc('remove_circle_work', { p_post: id });
export const removeWorkComment = (id: string) =>
  rpc('remove_circle_work_comment', { p_comment: id });
export const reportWork = (id: string, comment: string | null, reason: string) =>
  rpc('report_circle_work', { p_post: id, p_comment: comment, p_reason: reason });
