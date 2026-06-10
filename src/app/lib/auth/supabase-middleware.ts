// Middleware-side Supabase client. Lives separately because middleware uses
// NextRequest / NextResponse cookies (different API than next/headers).
// @supabase/ssr's createServerClient handles both shapes; we just adapt.
//
// IMPORTANT: middleware must return the same NextResponse that the helpers
// wrote cookies to. Don't construct a new NextResponse after this runs.

import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export function createSupabaseMiddlewareClient(req: NextRequest) {
  // Mutable response that the Supabase helpers write refreshed-session
  // cookies onto. Middleware returns this same response.
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            req.cookies.set(name, value);
          }
          res = NextResponse.next({ request: req });
          for (const { name, value, options } of cookiesToSet) {
            res.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  return { supabase, getResponse: () => res };
}
