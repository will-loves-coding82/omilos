"use server";
import { getEventStops } from "@/app/actions/event-actions";
import EventDetailsClient from "./event-details-client";

export default async function EventDetailsServer({slug}: {slug: string}) {
  const res = await getEventStops(slug);

  return (
    <EventDetailsClient slug={slug} initialStops={res.data.stops} />
  )
}