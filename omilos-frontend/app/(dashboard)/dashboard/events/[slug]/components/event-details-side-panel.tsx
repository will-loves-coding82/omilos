"use client";

import { ClientEvent, ClientEventStop } from "@/app/types/client-types"
import { Calendar, X } from "lucide-react"
import Image from "next/image";

export type EventDetailsSidePanelProps = {
  event: ClientEvent,
  isOpen: boolean,
  onDismiss: () => void,
}

export default function EventDetailsSidePanel({event, isOpen, onDismiss}: EventDetailsSidePanelProps) {
  return (
    <div
      className={`absolute inset-y-4 right-3 z-10 w-full h-fit bg-bg-primary md:w-[440px] md:max-h-[600px] flex flex-col gap-4 shadow-md rounded-2xl transition-transform duration-300 
        ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+1rem)]'}
      `}
    >
      <span className="flex w-full justify-between pt-4 px-4">
        <h3 className="text-md font-medium text-text-primary">{event.title}</h3>
        <button onClick={onDismiss} id="dismiss-btn" className="flex justify-center items-center bg-bg-secondary hover:cursor-pointer rounded-md p-1 w-6 h-6"><X size={16}/></button>
      </span>

      <div className="flex flex-col gap-3 px-4">
        { event.image_url && <Image alt="event cover image" width={300} height={200} src={event.image_url} className="rounded-lg w-full"/>}
        <div className="bg-bg-secondary rounded-lg p-3 justify-between w-full">
          <p className="text-sm text-text-secondary">{event.description}</p>
        </div>
      </div>

      <div className="flex w-full items-center gap-2 px-4">
        <>
          {event.members?.filter(m => m.user.id === event.host_id).map((m) =>
            m.user.image_url?.length ?
            <Image
              key={m.user.id}
              className="rounded-full w-7 h-7 object-cover"
              height={32}
              width={32}
              alt="user profile"
              src={m.user.image_url}/>
            :
            <div key={m.user.id} className="h-8 w-8 rounded-full bg-bg-secondary flex items-center justify-center text-xs font-medium text-secondary">
              {m.user.first_name[0] + m.user.last_name[0]}
            </div>
          )}

          {event.members?.filter(m => m.user.id === event.host_id).map((m) => 
            <div key={m.user.clerk_id}>
              <p className="text-text-primary text-sm font-medium">Hosted by</p>
              <p className="text-text-secondary text-sm">{m.user.first_name + " " + m.user.last_name}</p>
            </div>
          )}
        </>
      </div>

      <div className="w-full h-[2px] border-1 border-border-primary"></div>

      <div className="flex justify-between p-4">
        <div className="bg-bg-secondary shadow-sm rounded-md w-fit py-1 px-2 flex items-center gap-1">
          <Calendar size={16} className="text-text-secondary"/>
          <p className="text-xs text-text-secondary">{new Date(event.date).toDateString()}</p>
        </div> 

        <button className="bg-button-primary rounded-md text-white px-4 py-1">Add to calendar</button>
      </div>
    </div>
  )
}