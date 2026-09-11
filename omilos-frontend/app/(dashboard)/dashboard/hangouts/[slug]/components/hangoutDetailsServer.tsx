"use server";

import HangoutDetailsClient from "./hangoutDetailsClient";

export default async function HangoutDetailsServer({slug}: {slug: string}) {  
  // Fetch relevant data here

  return (
    <section>
      <HangoutDetailsClient/>
    </section>
  )
}