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
    statusLabel: "Delivery timing ETA: 2/20/26",
    completed: false,
    bullets: [
      { level: 0, text: "Action plan being created" },
    ],
  },

  {
    title: "SEO: Establish Authority: Content",
    subtitle: "Add content in 5 key categories: How to Monetize, Ways to Monetize, Google Adsense, Google Ad Manager, Case Studies / Testimonials",
    status: "yellow",
    statusLabel: "Delivery timing ETA: 2/20/26",
    completed: false,
    bullets: [
      { level: 0, text: "Action plan being created" },
    ],
  },

  {
    title: "SEO: Establish Authority: Backlinks",
    subtitle: "First: Reach out to previous clients to get article or mention on their site\n\nSecond: Get others to link back to you - start with targeting broken AdPushUp & Ezoic links for you to replace (once new content is up)",
    status: "yellow",
    statusLabel: "Delivery timing ETA: 2/20/26",
    completed: false,
    bullets: [
      { level: 0, text: "Action plan being created" },
    ],
  },

  {
    title: "SEO: Establish Baseline & Measurement Approach",
    subtitle: "Use GSC to set baseline for rest of February, after KWs are set then we'll begin to track specific progress",
    status: "green",
    statusLabel: "Data collecting",
    completed: false,
    bullets: [
    { level: 0, text: "SE Ranking to be updated after KWs approved" },
    ],
  },

];