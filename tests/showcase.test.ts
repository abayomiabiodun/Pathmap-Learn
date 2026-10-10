import { describe, it, expect } from 'vitest';
import {
  projectUrl,
  readShowcaseDraft,
  emptyShowcaseDraft,
  showcaseSchema,
  preparePhoto,
} from '../src/lib/showcase';
describe('showcase drafts', () => {
  it('allows optional HTTPS links and rejects unsafe or credential-bearing URLs', () => {
    expect(projectUrl('')).toBe('');
    expect(projectUrl(' https://example.com/work ')).toBe('https://example.com/work');
    for (const value of [
      'javascript:alert(1)',
      'http://example.com',
      'https://user:secret@example.com',
      'bad',
      'https://localhost',
    ])
      expect(projectUrl(value)).toBeNull();
  });
  it('restores bounded drafts and recovers from malformed device data', () => {
    expect(readShowcaseDraft('{')).toEqual(emptyShowcaseDraft);
    expect(readShowcaseDraft(null)).toEqual(emptyShowcaseDraft);
    expect(readShowcaseDraft(JSON.stringify({ kind: 'other' }))).toEqual(emptyShowcaseDraft);
    const draft = {
      kind: 'project',
      title: 'My page',
      body: 'Today I learned HTML headings.',
      url: '',
    };
    expect(readShowcaseDraft(JSON.stringify(draft))).toEqual(draft);
    expect(showcaseSchema.safeParse(draft).success).toBe(true);
    expect(showcaseSchema.safeParse({ ...draft, title: '   ' }).success).toBe(false);
    expect(showcaseSchema.safeParse({ ...draft, body: 'short' }).success).toBe(false);
  });
  it('rejects unsupported or oversized pictures before decoding', async () => {
    await expect(
      preparePhoto(new File(['x'], 'x.svg', { type: 'image/svg+xml' })),
    ).rejects.toThrow();
    await expect(preparePhoto(new File([], 'x.jpg', { type: 'image/jpeg' }))).rejects.toThrow();
    await expect(
      preparePhoto(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'x.png', { type: 'image/png' })),
    ).rejects.toThrow();
  });
});
