"use server";

import { Suspense } from "react";
import HangoutDetailsServer from "./components/hangoutDetailsServer";

export default async function Page({params} : {params: Promise<{slug: string}>}) {
  const { slug } = await params;

  return (
    <div className="flex-1 h-full">
      <Suspense fallback={<p>Loading...</p>}>
        <HangoutDetailsServer slug={slug}/>
      </Suspense>
    </div>
  )
}