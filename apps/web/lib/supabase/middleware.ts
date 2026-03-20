import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@null/db-types';
import { NextResponse, type NextRequest } from 'next/server';
import { clientEnv } from '../env';

type CookieToSet = { name: string; value: string; options: CookieOptions };

const protectedRoutes = ['/dashboard', '/onboarding'];
const authRoutes = ['/auth/login', '/auth/sign-up'];
const authenticatedHome = '/dashboard/imports';

export async function updateSession(request: NextRequest) {
  // Create initial response - will be replaced in setAll
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          // First, set cookies on the request
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          // Create a NEW response with the updated request - this is critical!
          supabaseResponse = NextResponse.next({ request });
          // Then set cookies on the new response
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  // Do not run code between createServerClient and supabase.auth.getUser().
  // A simple mistake could make it very hard to debug issues with users being randomly logged out.
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  
  console.log('[v0] Middleware:', {
    pathname,
    hasUser: !!user,
    userId: user?.id,
    userError: userError?.message
  });

  // Redirect authenticated users away from auth pages to dashboard
  if (user && authRoutes.some(route => pathname.startsWith(route))) {
    const redirectUrl = new URL(authenticatedHome, request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Copy cookies to redirect response
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  // Redirect unauthenticated users away from protected routes to login
  if (!user && protectedRoutes.some(route => pathname.startsWith(route))) {
    const redirectUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // IMPORTANT: Return supabaseResponse as-is to preserve cookies
  return supabaseResponse;
}
