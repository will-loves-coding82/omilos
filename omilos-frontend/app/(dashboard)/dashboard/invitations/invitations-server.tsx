"use server";

import { auth } from "@clerk/nextjs/server";
import InvitationsClient from "./invitations-client";
import { toClientInvite } from "@/app/types/client-types";
import { getAllInvitesForUser } from "@/app/actions/invite-actions";
import { SearchParams } from "next/dist/server/request/search-params";


export async function InvitationsServer({searchParams} : {searchParams: SearchParams}) {
  const { userId: clerkId } = await auth();
  const activeTabRaw = searchParams?.activeTab;
  const activeTabParam = Array.isArray(activeTabRaw)
    ? activeTabRaw[0] ?? "Received"
    : activeTabRaw ?? "Received";

  const response = await getAllInvitesForUser(clerkId);
  const data = response.data ?? { sent: [], received: [] };

  return (
    <InvitationsClient activeTabParam={activeTabParam} data={{
      sent: data.sent.map(toClientInvite),
      received: data.received.map(toClientInvite),
    }}/>
  )
}