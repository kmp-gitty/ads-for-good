import type { Metadata } from "next";
import NetworkClient from "./NetworkClient";

export const metadata: Metadata = {
  title: "utility websites | tools, check-ins, and calculators",
  description:
    "Our network is made up of small satellite sites aimed to provide utility with ethical ads. Find everyday tools, fitness & health tools, mindfulness sites, and practical calculators.",
};

export default function NetworkPage() {
  return <NetworkClient />;
}
