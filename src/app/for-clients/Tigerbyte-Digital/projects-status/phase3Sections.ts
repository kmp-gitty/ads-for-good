export type Status = "green" | "yellow" | "red";

export type PortalSection = {
  title: string;
  subtitle?: string;
  status: Status;
  statusLabel: string;
  completed: boolean;
  bullets: { level: 0 | 1 | 2; text: string }[];
};

export const phase3Sections: PortalSection[] = [
  {
    title: "SEO: Establish Clear Services",
    subtitle: "Update homepage & services to root in overarching KWs, like: Ad Monetization, Ad Revenue Optimization, Website Monetization, Monetize Website, Adsense Optimization / Implementation, Google Ad Manager",
    status: "yellow",
    statusLabel: "Actions Approved 2/20 - in motion",
    completed: false,
    bullets: [
      { level: 0, text: "Establish overarching service Hub & Service pages" },
      { level: 1, text: "Hub: Web Monetization Experts - expand from there" },
      { level: 0, text: "Complete homepage refresh" },
      { level: 1, text: "Update Navbar to focus on services & for SEO" },
      { level: 1, text: "Improve layout & content for Hub authority" },
      { level: 1, text: "Seed content breadth & backlinks to others on homepage" },
    ],
  },

  {
    title: "SEO: Establish Authority: Content",
    subtitle: "Add content in 5 key categories: How to Monetize, Ways to Monetize, Google Adsense, Google Ad Manager, Case Studies / Testimonials",
    status: "yellow",
    statusLabel: "Actions Approved 2/20 - in motion",
    completed: false,
    bullets: [
      { level: 0, text: "Start with new pages for Hub & Services" },
      { level: 1, text: "Hub: Publisher Services - Web Monetization Experts" },
      { level: 1, text: "New Services Pages (5): Website Monetization, AdSense, Google Ad Manager, Ad Ops, Ad Revenue Optimization" },
      { level: 1, text: "New Who You Serve Pages (4): Content Creators, AdSense Publishers, Independent Publishers, Media Brands" },
      { level: 1, text: "Resource Pages (3): Helpful Articles (essentially your blog), Case Studies, FAQ" },
      { level: 1, text: "About Pages (4): Company Info, Awards & Mentions, Privacy / Terms / Disclaimer, Contact" },
      { level: 0, text: "Begin with all new pages above, but expand into Helpful Article topics afterwards" },
      { level: 1, text: "How to Monetize, Ways to Monetize, Google Adsense, Google Ad Manager, Case Studies / Testimonials" },
    ],
  },

  {
    title: "SEO: Establish Authority: Backlinks",
    subtitle: "First: Reach out to previous clients to get article or mention on their site\n\nSecond: Get others to link back to you - start with targeting broken AdPushUp & Ezoic links for you to replace (once new content is up)",
    status: "yellow",
    statusLabel: "Actions Approved 2/20 - in motion",
    completed: false,
    bullets: [
      { level: 0, text: "Get quality sites linking back to you to increase authority in search engine's eyes" },
      { level: 1, text: "Reach out to known entities (hopefully easy win, but lower vertical relevance)" },
      { level: 1, text: "Reach out to replacement entities (less easy to win, but highly relevant)" },
    ],
  },

  {
    title: "SEO: Establish Baseline & Measurement Approach",
    subtitle: "Use GSC to set baseline for rest of February, after KWs are set then we'll begin to track specific progress",
    status: "green",
    statusLabel: "Data collecting",
    completed: false,
    bullets: [
      { level: 0, text: "GSC Baseline collecting" },
      { level: 0, text: "SE Ranking updated with KWs: Website Monetization, Ad Monetization, Content Monetization, Adsense, Google Ad Manager, Ad Operations, Ad Revenue Optimization, Publisher Monetization, Revenue Yield" },
    ],
  },

];