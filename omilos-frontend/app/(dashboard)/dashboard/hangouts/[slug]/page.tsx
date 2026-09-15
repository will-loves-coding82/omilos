"use server";

import { Suspense } from "react";
import EventDetailsServer from "./components/eventDetailsServer";

export default async function Page({params} : {params: Promise<{slug: string}>}) {
  const { slug } = await params;

  return (
    <div className="flex-1 h-full">
      <Suspense fallback={<p>Loading...</p>}>
        <EventDetailsServer slug={slug}/>
      </Suspense>
    </div>
  )
}