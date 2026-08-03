import { POSTS, isLive } from "./for-people/education/posts";

// Re-evaluate hourly so date-gated education guides (publishAt) enter the
// sitemap on their publish date without waiting for a redeploy.
export const revalidate = 3600;

export default function sitemap() {
  const baseUrl = "https://www.ads4good.com";
  const lastModified = new Date();

  const staticPaths = [
    // Core
    "/",
    "/about",
    "/for-good",
    "/contact",

    // For People
    "/for-people",
    "/for-people/education",
    "/for-people/privacy-protection",
    "/for-people/ad-network",

    // For Businesses — hub
    "/for-businesses",

    // For Businesses — services & products
    "/for-businesses/marketing-guidebook",
    "/for-businesses/digital-health-check",
    "/for-businesses/marketing-advice",
    "/for-businesses/consulting",
    "/for-businesses/website-builds-updates",
    "/for-businesses/digital-profile-management",
    "/for-businesses/seo-services",
    "/for-businesses/digital-ads",
    "/for-businesses/direct-mail",
    "/for-businesses/email-marketing",
    "/for-businesses/marketing-ops",
    "/for-businesses/marketing-team",
    "/for-businesses/ad-monetization",
    "/for-businesses/newsletter-advertising",
    "/for-businesses/reduce-software-costs",
    "/for-businesses/smart-links",
    "/for-businesses/smart-prompts",
    "/for-businesses/lifecycle-attribution",
  ];

  const staticEntries = staticPaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified,
  }));

  // Education blog posts — only those live today (date-gated ones are excluded
  // until their publishAt, so the sitemap never points at a 404).
  const postEntries = POSTS.filter((p) => isLive(p)).map((p) => ({
    url: `${baseUrl}/for-people/education/${p.slug}`,
    lastModified,
  }));

  return [...staticEntries, ...postEntries];
}
