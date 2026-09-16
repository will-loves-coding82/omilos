"use server";

import { auth } from "@clerk/nextjs/server";
import InvitationsClient from "./invitations-client";


export async function InvitationsServer() {
  const { userId: clerkId } = await auth();
  // const response = await getPendingInviteCountForUser(clerkId);

  return (
    <InvitationsClient invites={[]}/>
  )
}