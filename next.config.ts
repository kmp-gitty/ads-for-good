import type { NextConfig } from "next";

// 1P hosts attached to this Vercel project, each mapping to the site it fronts.
// Single source of truth for the redirect rules in redirects() below — see the
// comment there for why every one of these needs BOTH a root and a catch-all rule.
//
// American Community Journals is one tenant across five separately-branded
// papers, so each host resolves to its OWN paper, never the flagship.
// Not So Cavalier keeps the legacy "chapter." label because its Book Now links
// on Lovable are immutable; every client onboarded since uses go./s.
const CLIENT_1P_HOSTS = [
  { host: 'go.philadelphia.today', home: 'https://philadelphia.today' },
  { host: 'go.bucksco.today', home: 'https://bucksco.today' },
  { host: 'go.montco.today', home: 'https://montco.today' },
  { host: 'go.vista.today', home: 'https://vista.today' },
  { host: 'go.delco.today', home: 'https://delco.today' },
  { host: 'go.eosfabrics.com', home: 'https://eosfabrics.com' },
  { host: 's.eosfabrics.com', home: 'https://eosfabrics.com' },
  { host: 'chapter.notsocavalier.com', home: 'https://notsocavalier.com' },
] as const;

const nextConfig: NextConfig = {
  reactCompiler: true,

  async redirects() {
    return [
      {
        source: "/ask-us-anything",
        destination: "/marketing-advice",
        permanent: true, // 301 redirect
      },
      {
        source: "/for-businesses/digital-property-audit",
        destination: "/for-businesses/digital-health-check",
        permanent: true,
      },
      {
        source: "/for-businesses/local-marketing",
        destination: "/for-businesses/direct-mail",
        permanent: true,
      },
      {
        source: '/for-businesses/marketing-team',
        destination: '/for-businesses',
        permanent: true,
      },

      // ---------------------------------------------------------------
      // 1P link/collect hosts → the client's own site.
      //
      // These subdomains are Vercel custom domains on THIS app. Vercel serves
      // EVERY route on EVERY attached domain, so without these rules the whole
      // agency site answers on a client's branded host: "/" served the ads for
      // Good homepage, "/for-businesses" served our marketing pages, and
      // "/chapter/login" served the dashboard — HTTP 200, on their domain,
      // disclosing the vendor relationship on their property rather than
      // leaving that disclosure to them.
      //
      // Both a root rule and a catch-all are generated per host from CLIENT_1P_HOSTS
      // below, so adding a host can't update one list and miss the other.
      //
      // THE EXCLUSIONS ARE LOAD-BEARING. The catch-all must never swallow:
      //   /r/*            every wrapped Chapter Link — the entire point of a go. host
      //   /api/*          live pixel + collect traffic. NSC serves BOTH its redirects
      //                   and its pixel from chapter.notsocavalier.com, so a blanket
      //                   redirect here would silently kill that client's ingest.
      //   /_next/*        app assets
      //   /_vercel/*      Vercel analytics/insights endpoints
      //   /.well-known/*  ACME + domain-verification challenges. Redirecting these
      //                   risks breaking certificate renewal on a client's domain —
      //                   an outage with no obvious cause. Cheap to exclude.
      //
      // permanent: false (307) — a 301 is cached by browsers ~forever, and these
      // hosts may serve something else later. The page-move redirects above are
      // permanent because they're genuine moves; these are not.
      //
      // NOTE — this covers paths that are not Chapter Links. It does NOT cover a
      // Chapter Link with an unknown slug: "/r/acj_today/<typo>" still falls through
      // the route's own chain (rule match → ?to= → client default → 404), and
      // default_redirect_destination is per-CLIENT, so an ACJ miss lands on
      // acj.today rather than the paper the reader was on. Making that per-HOST is
      // an app-logic change in the redirect route, tracked separately.
      // ---------------------------------------------------------------
      ...CLIENT_1P_HOSTS.flatMap(({ host, home }) => [
        // Exact root.
        { source: '/', has: [{ type: 'host' as const, value: host }], destination: home, permanent: false },
        // Everything else except the load-bearing prefixes above.
        {
          source: '/:path((?!r/|api/|_next/|_vercel/|\\.well-known/).*)',
          has: [{ type: 'host' as const, value: host }],
          destination: home,
          permanent: false,
        },
      ]),
    ];
  },
};

export default nextConfig;

