import { getEventsForUser } from "@/app/actions/event-actions";
import { EventsClient } from "./events-client";
import { auth } from "@clerk/nextjs/server";
import { toClientEvent } from "@/app/types/client-types";

export async function EventsServer() {
  const user = await auth();
  if (!user) return <p>Could not load user</p>

  const response = getEventsForUser(user.userId);
  const data = (await response).data

  return (
    <EventsClient events = {data.events.map(toClientEvent)}/>
  )
}