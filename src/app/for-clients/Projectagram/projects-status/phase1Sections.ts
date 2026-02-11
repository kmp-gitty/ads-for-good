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
    title: "Digital Health Check Analysis & Planning",
    subtitle: "Steps / Needs:",
    completed: false,
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
    title: "Digital Health Check Analysis & Plannin",
    subtitle: "Steps / Needs:",
    completed: true,
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

];


