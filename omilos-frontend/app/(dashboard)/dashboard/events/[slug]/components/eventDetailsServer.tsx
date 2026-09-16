"use server";
import EventDetailsClient from "./eventDetailsClient";
import { getEventStops } from "../../actions";

export default async function EventDetailsServer({slug}: {slug: string}) {
  const res = await getEventStops(slug);

  return (
    <EventDetailsClient slug={slug} initialStops={res.data.stops} />
  )
}