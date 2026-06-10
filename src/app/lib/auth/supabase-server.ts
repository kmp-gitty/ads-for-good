// Server-side Supabase client for App Router (pages, server actions, route
// handlers). Uses the cookie store via @supabase/ssr so a logged-in session
// is automatically read from the request and refreshed back into the response.
//
// Two factories:
//   createSupabaseServerClient() — reads/writes cookies via next/headers.
//     Use in server components, server actions, and route handlers.
//   createSupabaseServiceRoleClient() — service_role; no session. Use for
//     allowlist lookups in chapter_config.users (since the user isn't
//     authenticated yet at lookup time).

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll throws when called from a server component (read-only
            // cookies). That's expected during page renders — the cookie will
            // be refreshed on the next server action / route handler. Swallow.
          }
        },
      },
    },
  );
}

// service_role client for code paths that need to read/write the allowlist
// table BEFORE the user is authenticated (e.g. checking if an email is in
// chapter_config.users at login time, or seeding the user_id after callback).
export function createSupabaseServiceRoleClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
