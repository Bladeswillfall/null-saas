import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const defaultNextPath = '/dashboard';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  let next = searchParams.get('next') ?? defaultNextPath;

  // Validate next parameter to prevent open redirects
  if (!next.startsWith('/')) {
    next = defaultNextPath;
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error?error=auth_callback_error`);
}
