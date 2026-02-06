import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/for-clients/:path*"],
};

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


export function middleware(req: NextRequest) {
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





