"use server";

import { auth } from "@clerk/nextjs/server";
import InvitationsClient from "./invitations-client";
import { getAllInvitesForUser } from "../events/actions";
import { toClientInvite } from "@/app/types/client";


export async function InvitationsServer() {
  const { userId: clerkId } = await auth();
  const response = await getAllInvitesForUser(clerkId);
  const data = response.data ?? { sent: [], received: [] };
  console.log(data)
  return (
    <InvitationsClient data={{
      sent: data.sent.map(toClientInvite),
      received: data.received.map(toClientInvite),
    }}/>
  )
}