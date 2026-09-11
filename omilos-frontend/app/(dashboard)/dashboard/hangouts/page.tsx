"use server";

import { Suspense } from "react";
import { HangoutsServer } from "./components/hangoutsServer";

export default async function HangoutsPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
        <HangoutsServer/>
    </Suspense>
  )
}