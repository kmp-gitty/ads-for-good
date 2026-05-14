// /chapter → redirect to /chapter/observations (the default landing page).

import { redirect } from "next/navigation";

export default function ChapterIndex() {
  redirect("/chapter/observations");
}
