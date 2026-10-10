import * as z from 'zod/mini';
export const kinds = ['update', 'summary', 'project'] as const;
export type ShowcaseDraft = {
  kind: (typeof kinds)[number];
  title: string;
  body: string;
  url: string;
};
export const emptyShowcaseDraft: ShowcaseDraft = { kind: 'update', title: '', body: '', url: '' };
export function projectUrl(value: string): string | null {
  if (!value.trim()) return '';
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      url.hostname.includes('.') &&
      url.href.length <= 500
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export const showcaseSchema = z.object({
  kind: z.enum(kinds),
  title: z.string().check(
    z.minLength(3),
    z.maxLength(100),
    z.refine((value) => [...value.trim()].length >= 3),
  ),
  body: z.string().check(
    z.minLength(10),
    z.maxLength(2000),
    z.refine((value) => [...value.trim()].length >= 10),
  ),
  url: z.string().check(z.refine((value) => projectUrl(value) !== null)),
});
export function readShowcaseDraft(raw: string | null): ShowcaseDraft {
  try {
    const value = JSON.parse(raw ?? 'null');
    return value &&
      kinds.includes(value.kind) &&
      typeof value.title === 'string' &&
      value.title.length <= 100 &&
      typeof value.body === 'string' &&
      value.body.length <= 2000 &&
      typeof value.url === 'string' &&
      value.url.length <= 500
      ? value
      : emptyShowcaseDraft;
  } catch {
    return emptyShowcaseDraft;
  }
}
export async function preparePhoto(file: File): Promise<string> {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 5 * 1024 * 1024 ||
    file.size === 0
  )
    throw new Error('photo-invalid');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('photo-invalid');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.75),
    );
    if (!blob || blob.size > 256 * 1024) throw new Error('photo-invalid');
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('photo-invalid'));
      reader.readAsDataURL(blob);
    });
  } finally {
    bitmap.close();
  }
}
