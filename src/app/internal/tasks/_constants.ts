// Shared constants for the tasks / client-bulletin system. Kept out of
// _actions.ts because "use server" modules may only export async functions.

// Fixed top-level grouping every client board shares. Order is the display order.
export const SECTIONS = ["Projects", "Client To-Dos", "afG To-Dos"] as const;
export type SectionKey = (typeof SECTIONS)[number];
export const DEFAULT_SECTION: SectionKey = "Projects";

export function isSection(v: string): v is SectionKey {
  return (SECTIONS as readonly string[]).includes(v);
}

// Cache tags the client-facing loaders register under; server actions
// revalidate them so the /for-clients/* pages refresh after an edit.
export const CLIENT_BULLETIN_TAG = "client-bulletin";
export const CLIENT_SERVICES_TAG = "client-services";
