import type { Metadata } from "next";
import EducationClient from "./EducationClient";

export const metadata: Metadata = {
  title: "ads for Good blog | The Who, What, Where, How, and Why of Advertising",
  description:
    "Breaking down the ad industry into easily understandable topics and entries. Take a peek behind the curtain: how ads work, privacy and data, general indsutry knowledge, and more.",
};

export default function EducationPage() {
  return <EducationClient />;
}