import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@null/db-types';
import { NextResponse, type NextRequest } from 'next/server';
import { clientEnv } from '../env';

type CookieToSet = { name: string; value: string; options: CookieOptions };

const protectedRoutes = ['/dashboard', '/onboarding'];
const authRoutes = ['/auth/login', '/auth/sign-up'];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Redirect authenticated users away from auth pages to dashboard
  if (user && authRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect unauthenticated users away from protected routes to login
  if (!user && protectedRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return response;
}
