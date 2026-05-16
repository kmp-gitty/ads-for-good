import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Routes gated by this middleware:
//   /for-clients/*  â HTTP Basic auth, per-client credentials in env vars
//   /chapter/*      â shared-password cookie (agency operator dashboard)
export const config = {
  matcher: ["/for-clients/:path*", "/chapter/:path*"],
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

// ---------- /chapter/* cookie auth ----------
// The shared password lives in CHAPTER_DASH_TOKEN (env var). On successful
// submission to /api/chapter-auth, a chapter_auth cookie is set with this same
// value. Middleware compares cookie â env.
//
// This is a stopgap until Supabase auth (or a real provider) is wired up.
const CHAPTER_AUTH_COOKIE = "chapter_auth";

function gateChapter(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Allow the login page + the auth API to render unauthenticated â otherwise
  // the user can never get a cookie.
  if (
    pathname === "/chapter/login" ||
    pathname.startsWith("/chapter/login/") ||
    pathname === "/api/chapter-auth"
  ) {
    return NextResponse.next();
  }

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

  // Preserve full path + query string so a bookmarked URL like
  // /chapter/raw?client=eos_fabrics&range=90d survives the auth round-trip.
  const fullPath = req.nextUrl.pathname + req.nextUrl.search;
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/chapter/login";
  loginUrl.search = ""; // clear any params copied from the cloned URL
  loginUrl.searchParams.set("next", fullPath);
  return NextResponse.redirect(loginUrl);
}

// ---------- Dispatcher ----------
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/chapter")) return gateChapter(req);
  if (pathname.startsWith("/for-clients")) return gateForClients(req);
  return NextResponse.next();
}
