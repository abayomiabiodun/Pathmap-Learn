import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { safeRedirect } from '@/lib/auth';
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (code && url && key) {
    const store = await cookies();
    const client = createServerClient(url, key, {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (values) =>
          values.forEach(({ name, value, options }) => store.set(name, value, options)),
      },
    });
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(safeRedirect(request.nextUrl.searchParams.get('next')), request.url),
      );
  }
  return NextResponse.redirect(new URL('/auth?error=callback', request.url));
}
