"use server";

import { Suspense } from "react";
import HangoutDetailsServer from "./components/hangoutDetailsServer";

export default async function Page({params} : {params: Promise<{slug: string}>}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <HangoutDetailsServer slug={slug}/>
    </Suspense>
  )
}