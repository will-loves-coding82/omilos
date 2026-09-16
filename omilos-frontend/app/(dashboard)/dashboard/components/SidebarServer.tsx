"use server";

import { auth } from "@clerk/nextjs/server";
import { getPendingInviteCountForUser } from "../events/actions";
import SidebarClient from "./SidebarClient";

export async function SidebarServer() {
  const user = await auth();
  if (!user) return <p>Could not load user</p>

  const response = await getPendingInviteCountForUser(user.userId);
  const count = response.data.count;
  console.log("count: " + count)

  return (
    <SidebarClient pendingInviteCount={count}/>
  )
}