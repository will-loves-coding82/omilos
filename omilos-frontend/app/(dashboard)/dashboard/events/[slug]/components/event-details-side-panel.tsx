"use client";

import { ClientEvent, ClientEventStop } from "@/app/types/client-types"
import { X } from "lucide-react"
import Image from "next/image";

export type EventDetailsSidePanelProps = {
  event: ClientEvent,
  isOpen: boolean,
  onDismiss: () => void,
}

export default function EventDetailsSidePanel({event, isOpen, onDismiss}: EventDetailsSidePanelProps) {
  return (
    <div
      className={`absolute inset-y-0 right-0 z-10 w-full bg-bg-primary md:w-[340px] flex flex-col gap-3 shadow-md transition-transform duration-300 p-4 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <span className="flex w-full justify-end">
        <button onClick={onDismiss} id="dismiss-btn" className="bg-bg-secondary hover:cursor-pointer rounded-md p-1"><X size={16}/></button>
      </span>
      { event.image_url && <Image alt="event cover image" width={300} height={200} src={event.image_url} className="rounded-lg w-full"/>}

      <div className="flex justify-between w-full mt-3">
        <h3 className="text-xl font-medium text-text-primary">{event.title}</h3>
      </div>
    </div>
  )
}