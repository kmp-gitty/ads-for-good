import type { NextConfig } from "next";

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
      // Bare 1P link/collect hosts → the client's own site.
      //
      // These subdomains are Vercel custom domains on THIS app, so any path
      // that isn't handled elsewhere falls through to the normal app routes —
      // and "/" matched the ads for Good marketing homepage. That served our
      // agency site, HTTP 200, on the client's own domain, and disclosed the
      // vendor relationship on their property rather than leaving that
      // disclosure to them.
      //
      // Scoped to source "/" ON PURPOSE — an exact path match, not a prefix:
      //   - "/r/<client>/<slug>" must keep working (every wrapped link)
      //   - "/api/*" is live pixel traffic on the collect hosts
      // A wildcard here would break both.
      //
      // permanent: false (307) — a 301 is cached by browsers ~forever, and
      // these hosts may serve something else later. The entries above are
      // permanent because they're genuine page moves; these are not.
      //
      // Note this only catches the bare root. "go.bucksco.today/typo" still
      // returns the unbranded Next 404 — smaller exposure (needs a mistyped
      // path, not just a stripped one) and not worth the /r/ + /api/ risk.
      // ---------------------------------------------------------------

      // American Community Journals — one tenant, five papers, each host
      // resolving to its OWN paper (not the flagship).
      { source: '/', has: [{ type: 'host', value: 'go.philadelphia.today' }], destination: 'https://philadelphia.today', permanent: false },
      { source: '/', has: [{ type: 'host', value: 'go.bucksco.today' }],      destination: 'https://bucksco.today',      permanent: false },
      { source: '/', has: [{ type: 'host', value: 'go.montco.today' }],       destination: 'https://montco.today',       permanent: false },
      { source: '/', has: [{ type: 'host', value: 'go.vista.today' }],        destination: 'https://vista.today',        permanent: false },
      { source: '/', has: [{ type: 'host', value: 'go.delco.today' }],        destination: 'https://delco.today',        permanent: false },

      // EOS Fabrics — links host + collect host both leak the same way.
      { source: '/', has: [{ type: 'host', value: 'go.eosfabrics.com' }], destination: 'https://eosfabrics.com', permanent: false },
      { source: '/', has: [{ type: 'host', value: 's.eosfabrics.com' }],  destination: 'https://eosfabrics.com', permanent: false },

      // Not So Cavalier — keeps the legacy "chapter." label (its Book Now
      // links on Lovable are immutable), so the host name differs from the
      // go./s. convention used for every client onboarded since.
      { source: '/', has: [{ type: 'host', value: 'chapter.notsocavalier.com' }], destination: 'https://notsocavalier.com', permanent: false },
    ];
  },
};

export default nextConfig;

