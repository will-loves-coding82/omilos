"use server";

import { auth } from "@clerk/nextjs/server";
import { getInvitesForUser } from "../events/actions";
import { toClientInvite } from "@/app/types/client";
import InvitationsClient from "./invitations-client";


export async function InvitationsServer() {
  const { userId: clerkId } = await auth();
  const response = await getInvitesForUser(clerkId);
  const invites = response.data.map(toClientInvite)

  return (
    <InvitationsClient invites={invites}/>
  )
}