// Constants shared between the Server Action and the client-side form.
// Cannot live in _actions.ts because "use server" modules may only export
// async functions — non-function exports get stripped.

export const VALID_SERVICES = [
  "Digital_Profile_Management",
  "SEO",
  "Paid_Ads",
  "Website_Updates",
  "Email_Marketing",
  "Marketing_Operations",
] as const;
export type ServiceKey = (typeof VALID_SERVICES)[number];

export const VALID_PLANS = ["Support", "Partner", "Team"] as const;
export type PlanKey = (typeof VALID_PLANS)[number];
