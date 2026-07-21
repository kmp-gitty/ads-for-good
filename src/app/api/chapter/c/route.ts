// Primary pixel collect endpoint. Renamed from /api/chapter/collect to defuse
// ad-blocker filter-list rules that pattern-match on `/collect` in URLs
// (Google Analytics's endpoint fingerprint — EasyList/EasyPrivacy/uBlock/etc.
// treat any request to a path ending in `/collect` as tracking-shaped and
// block it regardless of host).
//
// Handler is UNCHANGED — this file just re-exports POST + OPTIONS from the
// original ../collect/route.ts. Both paths dispatch to the same code, so
// there is exactly one place to maintain collect-side auth/bot/rate-limit
// logic. `/api/chapter/collect` stays live as an alias while cached pixel
// instances migrate to the new path (pixel.js is served no-store so browsers
// pick up the new URL on next page load). Remove the old /collect route once
// several weeks of logs confirm zero traffic hits it.
export { POST, OPTIONS } from "../collect/route";
