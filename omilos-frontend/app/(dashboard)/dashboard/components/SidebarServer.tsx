"use server";

import { auth } from "@clerk/nextjs/server";
import { getInvitesForUser } from "../events/actions";
import SidebarClient from "./SidebarClient";
import { ClientInvite, RSVPStatus, toClientInvite } from "@/app/types/client";
import { APIInvite } from "@/app/types/api";


export async function SidebarServer() {
  const user = await auth();
  if (!user) return <p>Could not load user</p>

  const response = await getInvitesForUser(user.userId);
  const invites = response.data.map(toClientInvite)

  return (
    <SidebarClient invites={invites}/>
  )
}