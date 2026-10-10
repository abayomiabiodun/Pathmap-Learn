import { describe, it, expect, vi, afterEach } from 'vitest';
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
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
  it('resizes and strips picture metadata, closes decoded images and handles conversion failures', async () => {
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 1920, height: 1080, close }),
    );
    const drawImage = vi.fn();
    const context = { fillRect: vi.fn(), drawImage, fillStyle: '' };
    const contextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(context as unknown as CanvasRenderingContext2D);
    const blobSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((callback) => callback(new Blob(['picture'], { type: 'image/jpeg' })));
    const file = new File(['source'], 'photo.png', { type: 'image/png' });
    expect(await preparePhoto(file)).toBe('cGljdHVyZQ==');
    expect(drawImage.mock.calls[0].slice(1)).toEqual([0, 0, 960, 540]);
    expect(close).toHaveBeenCalledOnce();
    contextSpy.mockReturnValue(null);
    await expect(preparePhoto(file)).rejects.toThrow();
    contextSpy.mockReturnValue(context as unknown as CanvasRenderingContext2D);
    blobSpy.mockImplementation((callback) => callback(null));
    await expect(preparePhoto(file)).rejects.toThrow();
    blobSpy.mockImplementation((callback) => callback(new Blob([new Uint8Array(262145)])));
    await expect(preparePhoto(file)).rejects.toThrow();
    blobSpy.mockImplementation((callback) => callback(new Blob(['picture'])));
    vi.stubGlobal(
      'FileReader',
      class {
        onerror: () => void = () => {};
        readAsDataURL() {
          this.onerror();
        }
      },
    );
    await expect(preparePhoto(file)).rejects.toThrow();
    expect(close).toHaveBeenCalledTimes(5);
  });
});
