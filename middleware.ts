import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "./src/app/lib/auth/supabase-middleware";
import {
  findChapterUserByAuthId,
  canAccessClient,
  canAccessGlobal,
} from "./src/app/lib/auth/chapter-user";

// Routes gated by this middleware:
//   /for-clients/*  — HTTP Basic auth, per-client credentials in env vars
//   /chapter/*      — Supabase session (primary) + legacy shared-password
//                     cookie (coexistence during Sprint 5 cutover)
//   /internal/*     — legacy shared-password cookie (will migrate in a later
//                     sprint; not in scope for Sprint 5)
export const config = {
  matcher: ["/for-clients/:path*", "/chapter/:path*", "/internal/:path*"],
};

// ---------- /for-clients/* HTTP Basic auth ----------
function unauthorized(realm: string) {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${realm}"`,
    },
  });
}

function getCreds(slug: string) {
  const map: Record<string, { user?: string; pass?: string }> = {
    "EOS-Fabrics": {
      user: process.env.CLIENT_EOS_FABRICS_USER,
      pass: process.env.CLIENT_EOS_FABRICS_PASS,
    },
    "Tigerbyte-Digital": {
      user: process.env.CLIENT_TIGERBYTE_DIGITAL_USER,
      pass: process.env.CLIENT_TIGERBYTE_DIGITAL_PASS,
    },
    "Not-So-Cavalier": {
      user: process.env.CLIENT_NOT_SO_CAVALIER_USER,
      pass: process.env.CLIENT_NOT_SO_CAVALIER_PASS,
    },
  };

  return map[slug];
}

function gateForClients(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/").filter(Boolean);
  const clientSlug = parts[1]; // /for-clients/<client>

  if (!clientSlug) return unauthorized("Client Portal");

  const creds = getCreds(clientSlug);
  if (!creds?.user || !creds?.pass) {
    return unauthorized(`Client Portal (${clientSlug})`);
  }

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) {
    return unauthorized(`Client Portal (${clientSlug})`);
  }

  const decoded = atob(auth.replace("Basic ", ""));
  const [user, pass] = decoded.split(":");

  if (user !== creds.user || pass !== creds.pass) {
    return unauthorized(`Client Portal (${clientSlug})`);
  }

  return NextResponse.next();
}

// ---------- /chapter/* auth ----------
// Primary: Supabase session, allowlisted via chapter_config.users + role +
// client_key. Fallback (coexistence): the legacy CHAPTER_DASH_TOKEN cookie
// from the pre-Sprint-5 password gate. Fallback is removed after operators
// have migrated.
//
// Route gating:
//   - /chapter/<segment-with-underscore>/* is a client-scoped route group;
//     `segment-with-underscore` is the client_key. Client employees access
//     only their own; agency operators access any.
//   - /chapter/<segment-no-underscore>/* is a global agency-operator route.
//     Client employees are redirected to their own client-scoped landing.
//
// The "_ vs no-_" convention is locked per CLAUDE.md — client_keys always
// contain an underscore (eos_fabrics, barber_shop) and static slugs never
// do (observations, overview, channels...).
const CHAPTER_AUTH_COOKIE = "chapter_auth";

function clientKeyFromPath(pathname: string): string | null {
  // ["", "chapter", "<segment>", ...]
  const parts = pathname.split("/");
  const seg = parts[2];
  if (!seg) return null;
  return seg.includes("_") ? seg : null;
}

async function gateChapter(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths — login UI + auth callbacks render unauthenticated.
  if (
    pathname === "/chapter/login" ||
    pathname.startsWith("/chapter/login/") ||
    pathname === "/chapter/auth/callback" ||
    pathname === "/api/chapter-auth"
  ) {
    return NextResponse.next();
  }

  const clientKey = clientKeyFromPath(pathname);

  // 1. Supabase session (primary path going forward).
  const { supabase, getResponse } = createSupabaseMiddlewareClient(req);
  const { data: { user: supaUser } } = await supabase.auth.getUser();

  if (supaUser) {
    const chapterUser = await findChapterUserByAuthId(supaUser.id);

    if (!chapterUser) {
      // Authenticated with Supabase but not on the Chapter allowlist (or
      // revoked since signup). Sign out + bounce to login with a generic
      // error so the allowlist isn't leaked.
      await supabase.auth.signOut();
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/chapter/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("error", "not_allowlisted");
      return NextResponse.redirect(loginUrl);
    }

    if (clientKey) {
      if (!canAccessClient(chapterUser, clientKey)) {
        // Client employee trying to access another client's route group.
        // Send them to their own; don't reveal which clients exist.
        const target = req.nextUrl.clone();
        target.pathname = chapterUser.client_key
          ? `/chapter/${chapterUser.client_key}/observations`
          : "/chapter/observations";
        target.search = "";
        return NextResponse.redirect(target);
      }
      return getResponse();
    }

    // Global /chapter/* without client_key segment.
    if (canAccessGlobal(chapterUser)) {
      return getResponse();
    }
    // Client employee on a global route — force ?client=<their_client_key>
    // so the existing pages (which read client from search params) cannot
    // be tricked into rendering another client's data. Redirect only when
    // the query param is missing or wrong; otherwise pass through.
    if (chapterUser.client_key) {
      const queryClient = req.nextUrl.searchParams.get("client");
      if (queryClient !== chapterUser.client_key) {
        const target = req.nextUrl.clone();
        target.searchParams.set("client", chapterUser.client_key);
        return NextResponse.redirect(target);
      }
      return getResponse();
    }
    // Edge case: agency_operator role but somehow can't access global.
    // canAccessGlobal already covers this; reach here only if data is bad.
    await supabase.auth.signOut();
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/chapter/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("error", "no_role");
    return NextResponse.redirect(loginUrl);
  }

  // 2. Fallback: legacy CHAPTER_DASH_TOKEN cookie (coexistence during cutover).
  // Treated as agency-operator equivalent — same behavior as before Sprint 5.
  const expectedToken = process.env.CHAPTER_DASH_TOKEN;
  if (
    expectedToken &&
    req.cookies.get(CHAPTER_AUTH_COOKIE)?.value === expectedToken
  ) {
    return NextResponse.next();
  }

  // 3. No auth — preserve target URL so bookmarks survive the round-trip.
  const fullPath = req.nextUrl.pathname + req.nextUrl.search;
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/chapter/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", fullPath);
  return NextResponse.redirect(loginUrl);
}

// ---------- /internal/* cookie auth ----------
// Agency-internal admin surfaces (e.g. /internal/client-portal-config). Same
// CHAPTER_DASH_TOKEN cookie as /chapter — anyone authenticated for the Chapter
// dashboard can also use the admin surfaces. Redirect to /chapter/login on
// miss so we have a single login flow.
function gateInternal(req: NextRequest) {
  const expectedToken = process.env.CHAPTER_DASH_TOKEN;
  if (!expectedToken) {
    return new NextResponse(
      "CHAPTER_DASH_TOKEN not configured. Set it in Vercel + .env.local.",
      { status: 503 },
    );
  }
  if (req.cookies.get(CHAPTER_AUTH_COOKIE)?.value === expectedToken) {
    return NextResponse.next();
  }
  const fullPath = req.nextUrl.pathname + req.nextUrl.search;
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/chapter/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", fullPath);
  return NextResponse.redirect(loginUrl);
}

// ---------- Dispatcher ----------
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/chapter")) return gateChapter(req);
  if (pathname.startsWith("/internal")) return gateInternal(req);
  if (pathname.startsWith("/for-clients")) return gateForClients(req);
  return NextResponse.next();
}
