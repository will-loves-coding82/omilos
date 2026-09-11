import { HangoutsClient } from "./hangoutsClient";
import { getHangoutsForUser } from "../actions";
import { auth } from "@clerk/nextjs/server";

export async function HangoutsServer() {
  const user = await auth();
  if (!user) return <p>Could not load user</p>

  const response = getHangoutsForUser(user.userId);
  const data = (await response).data

  return (
    <HangoutsClient data = {data}/>
  )
}