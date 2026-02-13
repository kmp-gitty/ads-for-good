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
    statusLabel: "Submitted for feedback 2/18",
    completed: false,
    bullets: [
      { level: 0, text: "Overarching service: Ad Revenue, Web, & Content Monetization + Optimization" },
      { level: 0, text: "Specific Actions:" },
      { level: 1, text: "Update Services dropdown" },
      { level: 1, text: "Create page for each new service" },
      { level: 1, text: "Update services summary on homepage" },
    ],
  },

  {
    title: "SEO: Establish Authority: Content",
    subtitle: "Add content in 5 key categories: How to Monetize, Ways to Monetize, Google Adsense, Google Ad Manager, Case Studies / Testimonials",
    status: "yellow",
    statusLabel: "Submitted for feedback 2/18",
    completed: false,
    bullets: [
      { level: 0, text: "Add content in each category - 1 new resource a week per category" },
      { level: 1, text: "Need sub-bullet" },
    ],
  },

  {
    title: "SEO: Establish Authority: Backlinks",
    subtitle: "First: Reach out to previous clients to get article or mention on their site\n\nSecond: Get others to link back to you - start with targeting broken AdPushUp & Ezoic links for you to replace (once new content is up)",
    status: "yellow",
    statusLabel: "Submitted for feedback 2/18",
    completed: false,
    bullets: [
    ],
  },

  {
    title: "SEO: Establish Baseline & Measurement Approach",
    subtitle: "Use GSC to set baseline for rest of February, after KWs are set then we'll begin to track specific progress",
    status: "green",
    statusLabel: "Data collecting",
    completed: false,
    bullets: [
    ],
  },

];

