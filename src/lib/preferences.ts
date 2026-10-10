import * as z from 'zod/mini';
export const locales = ['en', 'pcm', 'yo', 'ha', 'ig', 'fr'] as const;
export type Locale = (typeof locales)[number];
export const localeNames: Record<Locale, string> = {
  en: 'English',
  pcm: 'Nigerian Pidgin',
  yo: 'Yorùbá',
  ha: 'Hausa',
  ig: 'Igbo',
  fr: 'Français',
};
export const preferencesSchema = z.object({
  locale: z._default(z.enum(locales), 'en'),
  lite: z._default(z.boolean(), false),
  dark: z._default(z.boolean(), false),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export function readPreferences(raw: string | null): Preferences {
  try {
    const parsed = preferencesSchema.safeParse(raw ? JSON.parse(raw) : {});
    return parsed.success ? parsed.data : preferencesSchema.parse({});
  } catch {
    return preferencesSchema.parse({});
  }
}
export function shouldSuggestLite(connection?: { saveData?: boolean; effectiveType?: string }) {
  return (
    !!connection &&
    (connection.saveData === true ||
      ['slow-2g', '2g', '3g'].includes(connection.effectiveType ?? ''))
  );
}
