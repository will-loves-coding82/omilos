"use client";

import { CreateEventModal } from "./create-event-modal";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ClientEvent } from "@/app/types/client-types";
import { usePageActions } from "../../components/context/header-actions-context";
import { UserButton } from "@clerk/nextjs";

export type EventsClientProps = {
  events: ClientEvent[]
}

export function EventsClient({events}: EventsClientProps) {
  const [isCreateEventModalOpen, setCreateEventModalOpen] = useState(false);
  const router = useRouter();

  function openCreateModal() {
      setCreateEventModalOpen(true);
  }

  function closeCreateModal() {
    setCreateEventModalOpen(false);
  }

   // Renders custom header actions for this event
  usePageActions(
    <span className='flex items-center gap-4'>
      <UserButton/>
    </span>
  )

  return (
    <section className="flex flex-col w-full h-full max-w-[1700px] mx-auto py-6 gap-16">
      <CreateEventModal isOpen={isCreateEventModalOpen} onClose={closeCreateModal}/>
      <section id="header" className="flex justify-between w-full px-4">
        {/* Event search bar  */}
        <div></div>
        <div id="options-group" className="flex gap-8">
          <button id="create-event-btn" className="rounded-lg px-4 py-2 bg-bg-secondary font-medium" onClick={()=>openCreateModal()}>Create</button>
        </div>
      </section>
      
      <section id="collection" className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 px-4 w-full">
        {events.map(h => (
          <EventPreviewCard key={h.slug} event={h} onClick={() => router.push(`/dashboard/events/${h.slug}`) }/>
        ))}
      </section>
    </section>
  )
}


function EventPreviewCard({ event, onClick }: { event: ClientEvent, onClick: () => void }) {
  return (
    <div onClick={onClick} className="hover:cursor-pointer mx-auto w-full max-w-[400px] md:w-full md:max-w-[480px] lg:max-w-full bg-bg-primary border-1 border-border-primary shadow-md rounded-lg overflow-hidden">
      <section className="relative h-[140px] bg-bg-secondary overflow-hidden">
        {event.image_url &&
          <Image
            fill
            sizes="(min-width: 1280px) 33vw, (min-width: 1024px) 50vw, 100vw"
            className="object-cover"
            alt="event cover image"
            src={event.image_url}
          />
        }
      </section>
      <section className="p-4">
        <h2 className="text-md text-primary font-medium">{event.title}</h2>
        <p className="text-sm text-secondary">{event.description}</p>
      </section>

      <section className="flex w-full items-center gap-1 p-4">
        {event.members?.map((m) =>
          m.user.image_url?.length ?
          <Image
            key={m.user.id}
            className="rounded-full w-8 h-8 object-cover"
            height={32}
            width={32}
            alt="user profile"
            src={m.user.image_url}/>
          :
          <div key={m.user.id} className="h-8 w-8 rounded-full bg-bg-secondary flex items-center justify-center text-xs font-medium text-secondary">
            {m.user.first_name[0]+ m.user.last_name[0]}
          </div>
        )}

      </section>
    </div>
  )
}

