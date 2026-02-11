export type Status = "green" | "yellow" | "red";

export type PortalSection = {
  title: string;
  subtitle?: string;
  status: Status;
  statusLabel: string;
  bullets: { level: 0 | 1 | 2; text: string }[];
};

export const phase1Sections: PortalSection[] = [
  {
    title: "Digital Health Check Analysis & Planning",
    subtitle: "Steps / Needs:",
    status: "green",
    statusLabel: "To commence after kick-off call",
    bullets: [
      { level: 0, text: "Katoa to find all mentions of Projectagram" },
      { level: 0, text: "Katoa to runthrough entire website for Projectagram" },
      { level: 0, text: "Katoa to find errors & opportunities" },
      { level: 1, text: "All information to be aggregated in one place for easy assessment" },
      { level: 0, text: "Access needed after planning phase - planning phase completed from a POV of a consumer" },
    ],
  },

  {
    title: "Digital Profile Management Analysis & Planning",
    subtitle: "Steps / Needs:",
    status: "green",
    statusLabel: "To commence after kick-off call",
    bullets: [
      { level: 0, text: "Projectagram to determine which profiles to hand-over management to" },
      { level: 0, text: "Katoa to runthrough historical data and information of each profile for cohesiveness & best practices" },
      { level: 0, text: "Projectagram to provide proper access to each profile" },
      { level: 0, text: "Comment & message response flow to be determined" },
    ],
  },

  {
    title: "SEO Analysis & Planning",
    subtitle: "Steps / Needs:",
    status: "green",
    statusLabel: "To commence after kick-off call",
    bullets: [
      { level: 0, text: "Katoa to analyze historical data, competitors, and any KW ideas provided by Projectagram" },
      { level: 0, text: "Katoa to simplify and understand Projectagram offerings / services to translate into SEO effort" },
      { level: 1, text: "List of priority KWs and terms to be determined after 2 steps above" },
      { level: 0, text: "Web host access needed to setup Google Search Console" },
      { level: 1, text: "Katoa to setup tracking for selected KWs within SE Ranking" },
      { level: 1, text: "All information to be aggregated in one place for easy assessment" },
    ],
  },

  {
    title: "Ads Analysis & Planning",
    subtitle: "Steps / Needs:",
    status: "green",
    statusLabel: "To commence after kick-off call",
    bullets: [
      { level: 0, text: "Platforms suggested by Projectagram will be investigated for efficacy" },
      { level: 0, text: "Other platforms to be researched" },
      { level: 0, text: "Katoa to analyze historical data and industry / channel benchmarks for comparison" },
      { level: 0, text: "Access needed to all channels, Google Analytics (or appropriate analytics provider), and website" },
      { level: 0, text: "Plan to be created for each individual platform being used" },
    ],
  },

];

