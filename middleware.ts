import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "./src/app/lib/auth/supabase-middleware";
import {
  findChapterUserByAuthId,
  canAccessClient,
  canAccessGlobal,
  listAccessibleClientKeys,
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

// Sprint 5b real (June 14, 2026): when the URL is the canonical client-scoped
// form `/chapter/<client_key>/<slug>`, rewrite internally to the legacy form
// `/chapter/<slug>?client=<client_key>` so the existing page tree (which
// reads `?client=` from search params) renders without the round-trip
// redirect flicker the prior catch-all caused. Browser URL stays clean;
// only Next.js routing sees the rewritten form.
//
// `clientKey` is non-null only when the path matched the underscore
// convention — guaranteed by `clientKeyFromPath` upstream. Cookies on the
// upstream auth response (Supabase refreshed sessions etc.) are carried
// forward onto the rewrite response so auth survives the round-trip.
function rewriteIfClientScoped(
  req: NextRequest,
  baseRes: NextResponse,
  clientKey: string | null,
): NextResponse {
  if (!clientKey) return baseRes;

  const url = req.nextUrl.clone();
  // pathname → ["", "chapter", "<clientKey>", ...slugParts]
  const slugParts = url.pathname.split("/").filter(Boolean).slice(2);
  const slugPath = slugParts.length > 0 ? slugParts.join("/") : "overview";
  url.pathname = `/chapter/${slugPath}`;
  url.searchParams.set("client", clientKey);

  const rewriteRes = NextResponse.rewrite(url);
  for (const cookie of baseRes.cookies.getAll()) {
    rewriteRes.cookies.set(cookie);
  }
  return rewriteRes;
}

async function gateChapter(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths — login UI + auth callbacks render unauthenticated.
  if (
    pathname === "/chapter/login" ||
    pathname.startsWith("/chapter/login/") ||
    pathname === "/chapter/signup" ||
    pathname.startsWith("/chapter/signup/") ||
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
      // canAccessClient is async (agency_operator needs the client's agency_key
      // resolved via cached DB lookup). Awaited here on the critical path.
      if (!(await canAccessClient(chapterUser, clientKey))) {
        // Out-of-scope client access (client_employee → other client, or
        // agency_operator → client outside their agency). Redirect to a safe
        // landing within their scope; don't reveal which clients exist.
        const target = req.nextUrl.clone();
        target.pathname = chapterUser.client_key
          ? `/chapter/${chapterUser.client_key}/overview`
          : "/chapter/overview";
        target.search = "";
        return NextResponse.redirect(target);
      }
      return rewriteIfClientScoped(req, getResponse(), clientKey);
    }

    // Global /chapter/* without client_key segment.
    if (canAccessGlobal(chapterUser)) {
      return getResponse();
    }
    // Client employee on a global route — force ?client=<their_client_key>
    // so the existing pages (which read client from search params) cannot
    // be tricked into rendering another client's data. Redirect only when
    // the query param is missing or wrong; otherwise pass through.
    if (chapterUser.role === "client_employee" && chapterUser.client_key) {
      const queryClient = req.nextUrl.searchParams.get("client");
      if (queryClient !== chapterUser.client_key) {
        const target = req.nextUrl.clone();
        target.searchParams.set("client", chapterUser.client_key);
        return NextResponse.redirect(target);
      }
      return getResponse();
    }
    // Agency operator on a global route — they don't have global access (only
    // chapter_staff does), but they may legitimately be loading /chapter/overview
    // with no ?client= picked yet. Resolve their first accessible client and
    // bounce there. If they have zero accessible clients (agency_key set but
    // no clients tagged to that agency), force a no_clients_yet error to login.
    if (chapterUser.role === "agency_operator") {
      const accessible = await listAccessibleClientKeys(chapterUser);
      if (accessible.length > 0) {
        const target = req.nextUrl.clone();
        target.pathname = `/chapter/${accessible[0]}/overview`;
        target.search = "";
        return NextResponse.redirect(target);
      }
      await supabase.auth.signOut();
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/chapter/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("error", "no_clients_yet");
      return NextResponse.redirect(loginUrl);
    }
    // Edge case: role didn't match any expected value (data corruption).
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
    return rewriteIfClientScoped(req, NextResponse.next(), clientKey);
  }

  // 3. No auth — preserve target URL so bookmarks survive the round-trip.
  const fullPath = req.nextUrl.pathname + req.nextUrl.search;
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/chapter/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", fullPath);
  return NextResponse.redirect(loginUrl);
}

// ---------- /internal/* auth ----------
// Chapter-internal admin surfaces (e.g. /internal/client-portal-config,
// /internal/tasks, /internal/crm). Accepts EITHER:
//   1. Supabase session as chapter_staff (post-Sprint-7 role naming). The
//      login page is magic-link-only and issues only a Supabase session;
//      this is the load-bearing path going forward.
//   2. Legacy CHAPTER_DASH_TOKEN cookie (coexistence path; removed in Sprint 5d).
// Agency operators + client employees do NOT get internal access — these
// surfaces are Chapter-staff-only by design (Kato/Chapter team admin work).
// Redirect to /chapter/login on miss so we have a single login flow.
async function gateInternal(req: NextRequest) {
  // 1. Supabase session (primary).
  const { supabase, getResponse } = createSupabaseMiddlewareClient(req);
  const { data: { user: supaUser } } = await supabase.auth.getUser();
  if (supaUser) {
    const chapterUser = await findChapterUserByAuthId(supaUser.id);
    if (chapterUser && canAccessGlobal(chapterUser)) {
      return getResponse();
    }
    // Authenticated but not chapter_staff (or revoked) — deny.
  }

  // 2. Legacy cookie (coexistence path).
  const expectedToken = process.env.CHAPTER_DASH_TOKEN;
  if (
    expectedToken &&
    req.cookies.get(CHAPTER_AUTH_COOKIE)?.value === expectedToken
  ) {
    return NextResponse.next();
  }

  // 3. No auth — bounce to login preserving destination.
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
