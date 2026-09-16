"use client";

import { ClientInvite } from "@/app/types/client";

export type InvitationsClientProps = {
  invites: ClientInvite[],
}

export default function InvitationsClient({invites} : InvitationsClientProps) {
  return (
    <section className="flex flex-col w-full h-full max-w-[1700px] mx-auto py-6 gap-16">

    </section>
  )
}