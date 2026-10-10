import { expect, it } from 'vitest';
import {
  communityProfileSchema,
  defaultCommunityProfile,
  mentorBioSchema,
  validMessage,
  readCommunityDraft,
  sessionDate,
} from '../src/lib/community';
it('validates multilingual nicknames and explicit matching fields', () => {
  expect(communityProfileSchema.safeParse(defaultCommunityProfile).success).toBe(false);
  expect(
    communityProfileSchema.safeParse({ ...defaultCommunityProfile, nickname: 'Adẹ́ 12' }).success,
  ).toBe(true);
  for (const nickname of ['x', '  ', '<script>', 'a'.repeat(31)])
    expect(communityProfileSchema.safeParse({ ...defaultCommunityProfile, nickname }).success).toBe(
      false,
    );
  for (const [key, value] of [
    ['path', 'unknown'],
    ['level', 'unknown'],
    ['language', 'unknown'],
  ])
    expect(
      communityProfileSchema.safeParse({
        ...defaultCommunityProfile,
        nickname: 'Learner',
        [key]: value,
      }).success,
    ).toBe(false);
});
it('bounds messages and biographies including whitespace and unicode characters', () => {
  expect(validMessage('  A useful question about headings.  ')).toBe(true);
  for (const text of ['', 'x'.repeat(9), '\n\t'.repeat(20), 'x'.repeat(2001), '😀'.repeat(5)])
    expect(validMessage(text)).toBe(false);
  expect(mentorBioSchema.safeParse('I help beginners with semantic HTML.').success).toBe(true);
  expect(mentorBioSchema.safeParse('short').success).toBe(false);
  expect(mentorBioSchema.safeParse(' '.repeat(30)).success).toBe(false);
});
it('recovers device drafts without accepting oversized storage data', () => {
  expect(readCommunityDraft(null)).toBe('');
  expect(readCommunityDraft('')).toBe('');
  expect(readCommunityDraft('My question')).toBe('My question');
  expect(readCommunityDraft('x'.repeat(2001))).toBe('');
});
it('converts device-local proposals to UTC and requires a future date within 90 days', () => {
  const now = Date.parse('2026-10-10T10:00:00Z');
  expect(sessionDate('2026-10-11T11:00:00+01:00', now)).toBe('2026-10-11T10:00:00.000Z');
  for (const date of ['', 'invalid', '2026-10-10T10:00:00Z', '2027-10-10T10:00:00Z'])
    expect(sessionDate(date, now)).toBeNull();
});
