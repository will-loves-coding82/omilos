"use server";

import { Suspense } from "react";
import { InvitationsServer } from "./invitations-server";

export default async function InvitationsPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <InvitationsServer/>
    </Suspense>
  )
}