import * as z from 'zod/mini';
export const authSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().check(z.minLength(8, 'Use at least 8 characters.'), z.maxLength(128)),
});
export const emailSchema = z.pick(authSchema, { email: true });
export function safeRedirect(value: string | null): string {
  return value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : '/';
}
