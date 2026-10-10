import { describe, expect, it } from 'vitest';
import { readPreferences, shouldSuggestLite, locales, localeNames } from '@/lib/preferences';
import { authSchema, emailSchema, safeRedirect } from '@/lib/auth';
import { cn } from '@/lib/utils';
describe('preferences', () => {
  it('uses safe defaults for absent, malformed and invalid persisted preferences', () => {
    for (const value of [null, '{', '{"locale":"unknown"}', '{"lite":"yes"}'])
      expect(readPreferences(value)).toEqual({ locale: 'en', lite: false, dark: false });
  });
  it('restores all preferences', () => {
    expect(readPreferences('{"locale":"yo","lite":true,"dark":true}')).toEqual({
      locale: 'yo',
      lite: true,
      dark: true,
    });
  });
  it('suggests lite for constrained connections only', () => {
    expect(shouldSuggestLite()).toBe(false);
    expect(shouldSuggestLite({})).toBe(false);
    expect(shouldSuggestLite({ saveData: true })).toBe(true);
    for (const effectiveType of ['slow-2g', '2g', '3g'])
      expect(shouldSuggestLite({ effectiveType })).toBe(true);
    expect(shouldSuggestLite({ effectiveType: '4g' })).toBe(false);
  });
  it('has labels for every supported language', () => {
    for (const locale of locales) expect(localeNames[locale]).toBeTruthy();
  });
});
describe('auth validation', () => {
  it('accepts a valid email and password', () => {
    expect(
      authSchema.safeParse({ email: 'learner@example.com', password: 'a-long-password' }).success,
    ).toBe(true);
    expect(emailSchema.safeParse({ email: 'learner@example.com' }).success).toBe(true);
  });
  it('rejects invalid inputs', () => {
    expect(authSchema.safeParse({ email: 'bad', password: 'short' }).success).toBe(false);
    expect(
      authSchema.safeParse({ email: 'learner@example.com', password: 'a'.repeat(129) }).success,
    ).toBe(false);
  });
  it('prevents external redirects', () => {
    for (const url of [null, 'https://bad.example', '//bad.example', '/\\bad.example'])
      expect(safeRedirect(url)).toBe('/');
    expect(safeRedirect('/quiz')).toBe('/quiz');
  });
});
it('merges conflicting utility classes', () => {
  expect(cn('p-2', 'p-4', false && 'hidden')).toBe('p-4');
});
