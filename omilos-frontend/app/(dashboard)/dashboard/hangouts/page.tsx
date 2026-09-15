"use server";

import { Suspense } from "react";
import { EventsServer } from "./components/eventsServer";

export default async function HangoutsPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
        <EventsServer/>
    </Suspense>
  )
}