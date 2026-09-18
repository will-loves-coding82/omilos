"use server";

import { Suspense } from "react";
import EventDetailsServer from "./components/event-details-server";

export default async function Page({params} : {params: Promise<{slug: string}>}) {
  const { slug } = await params;

  return (
    <div className="relative w-full h-full">
      <Suspense fallback={<p>Loading...</p>}>
        <EventDetailsServer slug={slug}/>
      </Suspense>
    </div>
  )
}