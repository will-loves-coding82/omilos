import { ClientEventStop } from "@/app/types/client-types"
import { X } from "lucide-react"

export type EventStopSidePanelProps = {
  stop: ClientEventStop,
  isOpen: boolean,
  onDismiss: () => void,
  onDeleteStop: (stopId: number) => void  
}

export default function EventStopSidePanel({stop, isOpen, onDismiss, onDeleteStop}: EventStopSidePanelProps) {
  return (
    <div
      className={`fixed inset-y-0 right-0 z-10 w-full bg-bg-primary md:w-[300px] shadow-md transition-transform duration-300 p-3 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex justify-between w-full">
        <h3 className="text-lg font-semibold text-text-primary">{stop.name}</h3>
        <button onClick={onDismiss} id="dismiss-btn" className="hover:bg-bg-secondary hover:cursor-pointer rounded-md p-1"><X/></button>
      </div>
      <p className="text-text-secondary">{stop.address}</p>

      {stop.id !== undefined && (
        <button
          onClick={() => onDeleteStop(stop.id!)}
          className="mt-4 bg-black text-white p-2 text-lg rounded-md hover:cursor-pointer"
        >
          Delete Stop
        </button>
      )}
    </div>
  )
}