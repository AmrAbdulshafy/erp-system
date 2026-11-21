import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * Next.js 16 Proxy (replaces deprecated middleware.js) for Supabase Auth session refresh.
 * Gracefully passes through if Supabase environment variables are not configured.
 */
export async function proxy(request) {
  const { pathname } = request.nextUrl;
  if (
    pathname === '/settings' ||
    pathname.startsWith('/settings/')
  ) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session if expired so Server Components stay in sync
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico|html|webmanifest)$).*)',
  ],
};
