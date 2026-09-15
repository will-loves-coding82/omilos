"use server";
import EventDetailsClient from "./eventDetailsClient";

export default async function EventDetailsServer({slug}: {slug: string}) {  
  return (
    <EventDetailsClient slug={slug}/>
  )
}