"use server";
import { getEventDetails } from "@/app/actions/event-actions";
import EventDetailsClient from "./event-details-client";
import { toClientEvent } from "@/app/types/client-types";

export default async function EventDetailsServer({slug}: {slug: string}) {
  const res = await getEventDetails(slug);
  if (!res.data.event) return null
  return (
    <EventDetailsClient slug={slug} event={toClientEvent(res.data.event)} />
  )
}