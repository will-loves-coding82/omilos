import { getEventsForUser } from "@/app/actions/event-actions";
import { EventsClient } from "./events-client";
import { auth } from "@clerk/nextjs/server";

export async function EventsServer() {
  const user = await auth();
  if (!user) return <p>Could not load user</p>

  const response = getEventsForUser(user.userId);
  const events = (await response).data.events

  return (
    <EventsClient events = {events}/>
  )
}