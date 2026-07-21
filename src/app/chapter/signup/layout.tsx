// Metadata wrapper for the signup page. The page itself is a client component
// ("use client"), which can't export `metadata`, so the title lives here.
// `absolute` overrides any root title template so the tab reads exactly this.
export const metadata = {
  title: { absolute: "Chapter Signup" },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
