// Server component for /chapter/recommendations.
// Reads current + 28-day history of findings from chapter_recommendations.

import RecommendationsClient from "./RecommendationsClient";
import {
  cachedRecommendationsCurrent,
  cachedRecommendationsHistory,
} from "../../_lib/dashboard-rpc";

type SearchParams = Promise<{ client?: string }>;

export default async function RecommendationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const clientKey = (params.client && params.client.trim()) || "eos_fabrics";

  const [current, history] = await Promise.all([
    cachedRecommendationsCurrent({ clientKey }),
    cachedRecommendationsHistory({ clientKey, lookbackDays: 28 }),
  ]);

  return (
    <RecommendationsClient
      clientKey={clientKey}
      current={current}
      history={history}
    />
  );
}
