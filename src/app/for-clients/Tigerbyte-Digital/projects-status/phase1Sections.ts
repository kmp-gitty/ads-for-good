export type Status = "green" | "yellow" | "red";

export type PortalSection = {
  title: string;
  subtitle?: string;
  completed: boolean;
  status: Status;
  statusLabel: string;
  bullets: { level: 0 | 1 | 2; text: string }[];
};

export const phase1Sections: PortalSection[] = [
  {
    title: "SEO Services Scope Accepted",
    subtitle: "Steps / Needs:",
    completed: true,
    status: "green",
    statusLabel: "Analysis & Planning Completed",
    bullets: [
      { level: 0, text: "Katoa to analyze historical data, competitors, and any KW ideas provided by Tigerbyte Digital" },
      { level: 0, text: "Katoa to simplify and understand Tigerbyte Digital offerings / services to translate into SEO effort" },
      { level: 1, text: "List of priority KWs and terms to be determined after 2 steps above" },
      { level: 0, text: "Web host access needed to setup Google Search Console" },
      { level: 1, text: "Katoa to setup tracking for selected KWs within SE Ranking" },
      { level: 1, text: "All information to be aggregated in one place for easy assessment" },
    ],
  },

];