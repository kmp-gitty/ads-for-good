import type { Metadata } from "next";
import EducationClient from "./EducationClient";

// Refresh hourly so tiles for scheduled posts (posts.ts publishAt) appear in the
// server HTML on their own, matching the [slug] pages and the sitemap.
export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: "https://www.ads4good.com/for-people/education" },
  title: "ads for Good blog | The Who, What, Where, How, and Why of Advertising",
  description:
    "Breaking down the ad industry into easily understandable topics and entries. Take a peek behind the curtain: how ads work, privacy and data, general industry knowledge, and more.",
};

export default function EducationPage() {
  return <EducationClient />;
}