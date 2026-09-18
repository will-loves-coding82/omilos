"use server";
import { getEventDetails } from "@/app/actions/event-actions";
import EventDetailsClient from "./event-details-client";
import { toClientEvent } from "@/app/types/client-types";
import { notFound } from "next/navigation";

export default async function EventDetailsServer({slug}: {slug: string}) {
  const res = await getEventDetails(slug);

  if (res.message === "not_found") {
    notFound();
  }

  if (!res.success || !res.data.event) {
    return <EventDetailsError />; // generic error state, see below
  }

  return (
    <EventDetailsClient slug={slug} event={toClientEvent(res.data.event)} />
  )
}

function EventDetailsError() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-2">
      <h2 className="text-lg font-medium text-text-primary">Couldn't load this event</h2>
      <p className="text-text-secondary text-sm">Something went wrong. Try refreshing the page.</p>
    </div>
  )
}