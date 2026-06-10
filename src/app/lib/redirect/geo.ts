// Geo extraction from request headers.
//
// Vercel exposes geolocation via headers (x-vercel-ip-country, x-vercel-ip-region,
// x-vercel-ip-city) on every request — no external service or latency cost.
// Source: https://vercel.com/docs/edge-network/headers
//
// For non-Vercel runtimes (local dev, self-hosted), the headers will be absent
// and we return undefined fields. The geo condition evaluator treats missing
// fields as non-match (fail-open: rule doesn't fire, fallthrough to default).

import { NextRequest } from "next/server";

export type GeoContext = {
  country: string | undefined;  // ISO 3166-1 alpha-2, e.g. "US"
  region: string | undefined;   // Subdivision code, e.g. "CA" or "NY"
  city: string | undefined;
  latitude: string | undefined;
  longitude: string | undefined;
};

export function resolveGeo(req: NextRequest): GeoContext {
  return {
    country: req.headers.get("x-vercel-ip-country") || undefined,
    region: req.headers.get("x-vercel-ip-country-region") || undefined,
    city: req.headers.get("x-vercel-ip-city") || undefined,
    latitude: req.headers.get("x-vercel-ip-latitude") || undefined,
    longitude: req.headers.get("x-vercel-ip-longitude") || undefined,
  };
}
