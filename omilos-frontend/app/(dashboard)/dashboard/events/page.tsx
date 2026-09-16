"use server";

import { Suspense } from "react";
import { EventsServer } from "./components/events-server";

export default async function EventsPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
        <EventsServer/>
    </Suspense>
  )
}