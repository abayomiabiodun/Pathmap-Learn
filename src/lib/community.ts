import * as z from 'zod/mini';
import { pathIds } from './quiz';
import { locales } from './preferences';
export const communityProfileSchema = z.object({
  nickname: z.string().check(
    z.minLength(2),
    z.maxLength(30),
    z.regex(/^[\p{L}\p{M}\p{N} ._'-]+$/u),
    z.refine((value) => value.trim().length >= 2),
  ),
  path: z.enum(pathIds),
  level: z.enum(['new', 'basics', 'built']),
  language: z.enum(locales),
});
export type CommunityProfile = z.infer<typeof communityProfileSchema>;
export const messageSchema = z.string().check(
  z.minLength(10),
  z.maxLength(2000),
  z.refine((value) => [...value.trim()].length >= 10),
);
export const mentorBioSchema = z.string().check(
  z.minLength(20),
  z.maxLength(500),
  z.refine((value) => [...value.trim()].length >= 20),
);
export const defaultCommunityProfile: CommunityProfile = {
  nickname: '',
  path: 'web',
  level: 'new',
  language: 'en',
};
export function validMessage(text: string) {
  return messageSchema.safeParse(text.trim()).success;
}
export function readCommunityDraft(raw: string | null): string {
  return raw && raw.length <= 2000 ? raw : '';
}
export function sessionDate(value: string, now = Date.now()): string | null {
  const date = new Date(value);
  const time = date.getTime();
  return value && Number.isFinite(time) && time > now && time <= now + 90 * 86400000
    ? date.toISOString()
    : null;
}
