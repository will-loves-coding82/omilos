"use server";

import { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import SidebarClient from "./sidebar-client";
import { getPendingInviteCountForUser } from "@/app/actions/invite-actions";

export async function SidebarServer({ children }: { children: ReactNode }) {
  const user = await auth();
  if (!user) return <p>Could not load user</p>

  const response = await getPendingInviteCountForUser(user.userId);
  const count = response.data.count;
  console.log("count: " + count)

  return (
    <SidebarClient pendingInviteCount={count}>{children}</SidebarClient>
  )
}