import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/for-clients/:path*"],
};

function unauthorized(realm = "Client Portal") {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${realm}"`,
    },
  });
}

// Turns "EOS-Fabrics" into "EOS_FABRICS"
function normalizeSlug(slug: string) {
  return slug
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // pathname: /for-clients/<clientSlug>/...
  const parts = pathname.split("/").filter(Boolean);
  const clientSlug = parts[1]; // ["for-clients", "<clientSlug>", ...]
  if (!clientSlug) return unauthorized("Client Portal");

  const key = normalizeSlug(clientSlug);

  const userEnvKey = `CLIENT_${key}_USER`;
  const passEnvKey = `CLIENT_${key}_PASS`;

  const expectedUser = process.env[userEnvKey];
  const expectedPass = process.env[passEnvKey];

  // Safe default: if not configured, deny
  if (!expectedUser || !expectedPass) {
    return unauthorized(`Client Portal (${clientSlug})`);
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) {
    return unauthorized(`Client Portal (${clientSlug})`);
  }

  const base64Credentials = authHeader.split(" ")[1] ?? "";
  const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
  const [incomingUser, incomingPass] = credentials.split(":");

  if (incomingUser !== expectedUser || incomingPass !== expectedPass) {
    return unauthorized(`Client Portal (${clientSlug})`);
  }

  return NextResponse.next();
}
