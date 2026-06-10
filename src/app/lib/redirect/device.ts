// Device + OS classification from User-Agent.
//
// Lightweight regex-based UA parsing — no external lib (ua-parser-js would
// pull in ~50kb and add ~3ms per call). For the redirect endpoint's 50ms
// budget this needs to be fast + cheap.
//
// Returns enough to support condition matchers like:
//   { device_type: "mobile" }                 — phones + tablets
//   { os: "ios" }                             — iPhones + iPads
//   { os_in: ["ios", "android"] }             — mobile OS only

export type DeviceContext = {
  device_type: "mobile" | "tablet" | "desktop" | "bot" | "unknown";
  os: "ios" | "android" | "macos" | "windows" | "linux" | "unknown";
};

export function classifyUA(userAgent: string | null): DeviceContext {
  if (!userAgent) return { device_type: "unknown", os: "unknown" };

  const ua = userAgent.toLowerCase();

  // Bot detection — first so bot routing rules can fire pre-anything else.
  if (/bot|crawler|spider|preview|googlebot|bingbot|slurp/i.test(ua)) {
    return { device_type: "bot", os: "unknown" };
  }

  // OS
  let os: DeviceContext["os"] = "unknown";
  if (/iphone|ipad|ipod/.test(ua))                os = "ios";
  else if (/android/.test(ua))                    os = "android";
  else if (/mac os x|macintosh/.test(ua))         os = "macos";
  else if (/windows/.test(ua))                    os = "windows";
  else if (/linux/.test(ua))                      os = "linux";

  // Device type — tablet check BEFORE mobile (tablets often match mobile UAs).
  let device_type: DeviceContext["device_type"] = "desktop";
  if (/ipad|tablet|playbook|silk|kindle/.test(ua) ||
      (/android/.test(ua) && !/mobile/.test(ua))) {
    device_type = "tablet";
  } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/.test(ua)) {
    device_type = "mobile";
  }

  return { device_type, os };
}
